-- Création du bucket 'course-materials' pour le stockage des images
-- Date: 2025-11-26

-- 1. Créer le bucket s'il n'existe pas
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-materials', 'course-materials', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Politiques de sécurité pour le stockage

-- Permettre l'accès public en lecture (pour afficher les images)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'course-materials');

-- Permettre l'upload aux utilisateurs authentifiés (admins, instructeurs)
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-materials');

-- Permettre la mise à jour aux utilisateurs authentifiés
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'course-materials');

-- Permettre la suppression aux utilisateurs authentifiés
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'course-materials');
