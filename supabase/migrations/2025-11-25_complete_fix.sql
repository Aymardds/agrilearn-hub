-- Migration complète pour corriger les erreurs ON CONFLICT et ajouter tous les rôles
-- Exécuté le: 2025-11-25

-- 1. Nettoyer les doublons dans user_roles (garder le plus récent)
DELETE FROM public.user_roles a
USING public.user_roles b
WHERE a.user_id = b.user_id 
  AND a.created_at < b.created_at;

-- 2. Ajouter la contrainte unique sur user_id dans user_roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_roles_user_id_key'
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 3. Ajouter la contrainte unique sur (user_id, lesson_id) dans lesson_progress
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lesson_progress_user_lesson_key'
  ) THEN
    ALTER TABLE public.lesson_progress
      ADD CONSTRAINT lesson_progress_user_lesson_key UNIQUE (user_id, lesson_id);
  END IF;
END $$;

-- 4. Ajouter tous les rôles manquants à l'enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superviseur';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editeur';

-- 5. Vérification finale
-- Afficher tous les rôles disponibles
SELECT enumlabel as role_name
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
ORDER BY enumlabel;

-- Afficher les contraintes
SELECT 
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid IN ('public.user_roles'::regclass, 'public.lesson_progress'::regclass)
ORDER BY conrelid, conname;
