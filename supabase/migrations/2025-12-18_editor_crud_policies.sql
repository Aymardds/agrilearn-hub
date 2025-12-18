-- Migration pour le module CRUD Editeur et Validation Admin

-- 1. Ajout de la colonne review_status
ALTER TABLE courses ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'draft' CHECK (review_status IN ('draft', 'pending', 'approved', 'rejected'));
ALTER TABLE courses ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Mise à jour des politiques pour la table courses

-- Permettre aux éditeurs de voir leurs propres cours
CREATE POLICY "Editors can view own courses"
ON courses FOR SELECT
TO authenticated
USING (
  auth.uid() = instructor_id OR 
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('superadmin', 'superviseur')
  ) OR
  (is_published = true AND is_approved = true) -- Tout le monde peut voir les cours publiés et approuvés
);

-- Permettre aux éditeurs de créer des cours
CREATE POLICY "Editors can insert courses"
ON courses FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = instructor_id AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('editeur', 'superadmin')
  )
);

-- Permettre aux éditeurs de modifier leurs propres cours
CREATE POLICY "Editors can update own courses"
ON courses FOR UPDATE
TO authenticated
USING (
  auth.uid() = instructor_id OR
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'superadmin'
  )
);

-- Permettre aux éditeurs de supprimer leurs propres cours
CREATE POLICY "Editors can delete own courses"
ON courses FOR DELETE
TO authenticated
USING (
  auth.uid() = instructor_id OR
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'superadmin'
  )
);

-- 3. Mise à jour pour les modules et leçons (cascade) - Politiques simplifiées

-- Politiques pour modules
CREATE POLICY "Editors can manage modules of own courses"
ON modules FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = modules.course_id
    AND (
      courses.instructor_id = auth.uid() OR
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
    )
  )
);

-- Politiques pour leçons
CREATE POLICY "Editors can manage lessons of own courses"
ON lessons FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM modules
    JOIN courses ON modules.course_id = courses.id
    WHERE modules.id = lessons.module_id
    AND (
      courses.instructor_id = auth.uid() OR
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
    )
  )
);
