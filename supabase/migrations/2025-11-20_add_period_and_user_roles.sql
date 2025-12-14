-- Ajout des colonnes de période sur courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS period_start timestamptz,
  ADD COLUMN IF NOT EXISTS period_end timestamptz;

-- Contrainte de validité de la période: period_start <= period_end (si les deux sont non nuls)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'courses_period_range_valid'
  ) THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_period_range_valid
      CHECK (
        period_start IS NULL
        OR period_end IS NULL
        OR period_start <= period_end
      );
  END IF;
END $$;

-- Index pour accélérer les filtres par période
CREATE INDEX IF NOT EXISTS idx_courses_period_start ON public.courses(period_start);
CREATE INDEX IF NOT EXISTS idx_courses_period_end ON public.courses(period_end);

-- S'assurer que l'énum app_role contient 'superviseur'
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superviseur';

-- Rendre user_id unique dans user_roles pour autoriser les upsert onConflict
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