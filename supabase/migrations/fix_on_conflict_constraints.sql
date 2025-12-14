-- Script de correction pour les contraintes ON CONFLICT
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Ajouter une contrainte unique sur user_id dans user_roles
-- (Ceci permet l'upsert avec onConflict: "user_id")
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

-- 2. Vérifier et ajouter une contrainte unique sur (user_id, lesson_id) dans lesson_progress
-- (Ceci permet l'upsert sans spécifier onConflict explicitement)
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

-- 3. S'assurer que l'énum app_role contient 'superviseur'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'superviseur'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'superviseur';
  END IF;
END $$;

-- 4. Afficher les contraintes actuelles pour vérification
SELECT 
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid IN ('public.user_roles'::regclass, 'public.lesson_progress'::regclass)
ORDER BY conrelid, conname;
