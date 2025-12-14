-- Migration pour améliorer la gestion des formateurs et des certificats
-- Date: 2025-11-25

-- Table pour l'historique des affectations de formateurs
CREATE TABLE IF NOT EXISTS instructor_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  removed_at TIMESTAMPTZ,
  removed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_instructor_assignments_course ON instructor_assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_instructor_assignments_instructor ON instructor_assignments(instructor_id);
CREATE INDEX IF NOT EXISTS idx_instructor_assignments_active ON instructor_assignments(is_active) WHERE is_active = TRUE;

-- Fonction pour créer automatiquement un enregistrement d'affectation lors de la création d'un cours
CREATE OR REPLACE FUNCTION create_instructor_assignment()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO instructor_assignments (
    course_id,
    instructor_id,
    assigned_by,
    is_active
  ) VALUES (
    NEW.id,
    NEW.instructor_id,
    NEW.instructor_id, -- Le formateur s'auto-assigne lors de la création
    TRUE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour créer automatiquement un enregistrement d'affectation
DROP TRIGGER IF EXISTS trigger_create_instructor_assignment ON courses;
CREATE TRIGGER trigger_create_instructor_assignment
  AFTER INSERT ON courses
  FOR EACH ROW
  EXECUTE FUNCTION create_instructor_assignment();

-- Fonction pour gérer le changement de formateur
CREATE OR REPLACE FUNCTION update_instructor_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le formateur a changé
  IF OLD.instructor_id IS DISTINCT FROM NEW.instructor_id THEN
    -- Désactiver l'ancienne affectation
    UPDATE instructor_assignments
    SET 
      is_active = FALSE,
      removed_at = NOW()
    WHERE course_id = NEW.id AND is_active = TRUE;
    
    -- Créer une nouvelle affectation
    INSERT INTO instructor_assignments (
      course_id,
      instructor_id,
      is_active
    ) VALUES (
      NEW.id,
      NEW.instructor_id,
      TRUE
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour gérer le changement de formateur
DROP TRIGGER IF EXISTS trigger_update_instructor_assignment ON courses;
CREATE TRIGGER trigger_update_instructor_assignment
  AFTER UPDATE ON courses
  FOR EACH ROW
  WHEN (OLD.instructor_id IS DISTINCT FROM NEW.instructor_id)
  EXECUTE FUNCTION update_instructor_assignment();

-- Amélioration de la table certificates avec métadonnées
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS issued_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS course_title TEXT;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS completion_date TIMESTAMPTZ;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS final_score NUMERIC(5,2);
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Index pour améliorer les recherches de certificats
CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course ON certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_issued_at ON certificates(issued_at);
CREATE INDEX IF NOT EXISTS idx_certificates_verification_code ON certificates(verification_code);

-- Fonction pour générer automatiquement les métadonnées du certificat
CREATE OR REPLACE FUNCTION populate_certificate_metadata()
RETURNS TRIGGER AS $$
DECLARE
  v_course_title TEXT;
  v_student_name TEXT;
  v_enrollment_record RECORD;
BEGIN
  -- Récupérer le titre du cours
  SELECT title INTO v_course_title
  FROM courses
  WHERE id = NEW.course_id;
  
  -- Récupérer le nom de l'étudiant
  SELECT full_name INTO v_student_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Récupérer les informations d'inscription
  SELECT completed_at, progress_percentage
  INTO v_enrollment_record
  FROM enrollments
  WHERE user_id = NEW.user_id AND course_id = NEW.course_id;
  
  -- Mettre à jour les métadonnées
  NEW.course_title := v_course_title;
  NEW.student_name := v_student_name;
  NEW.completion_date := COALESCE(v_enrollment_record.completed_at, NOW());
  NEW.final_score := v_enrollment_record.progress_percentage;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour peupler automatiquement les métadonnées
DROP TRIGGER IF EXISTS trigger_populate_certificate_metadata ON certificates;
CREATE TRIGGER trigger_populate_certificate_metadata
  BEFORE INSERT ON certificates
  FOR EACH ROW
  EXECUTE FUNCTION populate_certificate_metadata();

-- RLS Policies pour instructor_assignments
ALTER TABLE instructor_assignments ENABLE ROW LEVEL SECURITY;

-- Les superadmins et superviseurs peuvent tout voir
CREATE POLICY "Superadmins and supervisors can view all assignments"
  ON instructor_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('superadmin', 'superviseur')
    )
  );

-- Les formateurs peuvent voir leurs propres affectations
CREATE POLICY "Instructors can view their assignments"
  ON instructor_assignments FOR SELECT
  USING (
    instructor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'formateur'
    )
  );

-- Les éditeurs peuvent voir toutes les affectations
CREATE POLICY "Editors can view all assignments"
  ON instructor_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'editeur'
    )
  );

-- Seuls les superadmins, superviseurs et éditeurs peuvent créer des affectations
CREATE POLICY "Admins can create assignments"
  ON instructor_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('superadmin', 'superviseur', 'editeur')
    )
  );

-- RLS Policies pour certificates (amélioration)
-- Les apprenants peuvent voir leurs propres certificats
DROP POLICY IF EXISTS "Users can view their own certificates" ON certificates;
CREATE POLICY "Users can view their own certificates"
  ON certificates FOR SELECT
  USING (user_id = auth.uid());

-- Les formateurs peuvent voir les certificats de leurs cours
DROP POLICY IF EXISTS "Instructors can view course certificates" ON certificates;
CREATE POLICY "Instructors can view course certificates"
  ON certificates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = certificates.course_id
      AND courses.instructor_id = auth.uid()
    )
  );

-- Les superadmins et superviseurs peuvent voir tous les certificats
DROP POLICY IF EXISTS "Admins can view all certificates" ON certificates;
CREATE POLICY "Admins can view all certificates"
  ON certificates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('superadmin', 'superviseur')
    )
  );

-- Les apprenants peuvent créer leurs propres certificats
DROP POLICY IF EXISTS "Users can create their own certificates" ON certificates;
CREATE POLICY "Users can create their own certificates"
  ON certificates FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Commentaires pour documentation
COMMENT ON TABLE instructor_assignments IS 'Historique des affectations de formateurs aux cours';
COMMENT ON COLUMN instructor_assignments.is_active IS 'Indique si l''affectation est actuellement active';
COMMENT ON COLUMN certificates.metadata IS 'Métadonnées supplémentaires du certificat (JSON)';
COMMENT ON COLUMN certificates.final_score IS 'Score final obtenu par l''apprenant';
