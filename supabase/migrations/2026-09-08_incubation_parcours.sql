-- ============================================================
-- MIGRATION: Parcours d'incubation GrainoLab en 5 étapes
-- 2026-09-08_incubation_parcours.sql
-- ============================================================

-- 1. Ajouter le rôle 'incube' dans l'enum app_role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'incube';

-- 2. Créer l'enum incubation_stage
DO $$ BEGIN
  CREATE TYPE incubation_stage AS ENUM (
    'diagnostic',
    'onboarding',
    'acceleration',
    'pilotage',
    'labellisation',
    'certifie'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- TABLE: startup_profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS startup_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  sector              TEXT NOT NULL,
  stage               incubation_stage NOT NULL DEFAULT 'diagnostic',
  team_size           INTEGER DEFAULT 1,
  founded_at          DATE,
  website_url         TEXT,
  description         TEXT,
  logo_url            TEXT,
  equity_signed       BOOLEAN DEFAULT FALSE,
  equity_signed_at    TIMESTAMPTZ,
  coach_id            UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- ============================================================
-- TABLE: diagnostic_submissions
-- ============================================================
CREATE TABLE IF NOT EXISTS diagnostic_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id      UUID NOT NULL REFERENCES startup_profiles(id) ON DELETE CASCADE,
  answers         JSONB NOT NULL DEFAULT '{}',
  sector          TEXT NOT NULL,
  submitted_at    TIMESTAMPTZ DEFAULT now(),
  reviewed_by     UUID REFERENCES auth.users(id),
  reviewed_at     TIMESTAMPTZ,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected'))
);

-- ============================================================
-- TABLE: diagnostic_scores
-- ============================================================
CREATE TABLE IF NOT EXISTS diagnostic_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id       UUID NOT NULL REFERENCES diagnostic_submissions(id) ON DELETE CASCADE,
  startup_id          UUID NOT NULL REFERENCES startup_profiles(id) ON DELETE CASCADE,
  score_team          INTEGER DEFAULT 0 CHECK (score_team BETWEEN 0 AND 100),
  score_market        INTEGER DEFAULT 0 CHECK (score_market BETWEEN 0 AND 100),
  score_feasibility   INTEGER DEFAULT 0 CHECK (score_feasibility BETWEEN 0 AND 100),
  score_innovation    INTEGER DEFAULT 0 CHECK (score_innovation BETWEEN 0 AND 100),
  score_total         INTEGER GENERATED ALWAYS AS (
    (score_team + score_market + score_feasibility + score_innovation) / 4
  ) STORED,
  strengths           TEXT[],
  improvements        TEXT[],
  recommendation      TEXT,
  pdf_url             TEXT,
  calculated_at       TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: incubation_roadmaps
-- ============================================================
CREATE TABLE IF NOT EXISTS incubation_roadmaps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id      UUID NOT NULL REFERENCES startup_profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL DEFAULT 'Roadmap Personnalisée',
  description     TEXT,
  start_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date        DATE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(startup_id)
);

-- ============================================================
-- TABLE: roadmap_milestones
-- ============================================================
CREATE TABLE IF NOT EXISTS roadmap_milestones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id      UUID NOT NULL REFERENCES incubation_roadmaps(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  due_date        DATE,
  order_index     INTEGER DEFAULT 0,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed')),
  category        TEXT,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: coaching_bookings
-- ============================================================
CREATE TABLE IF NOT EXISTS coaching_bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id      UUID NOT NULL REFERENCES startup_profiles(id) ON DELETE CASCADE,
  coach_id        UUID NOT NULL REFERENCES auth.users(id),
  booked_by       UUID NOT NULL REFERENCES auth.users(id),
  scheduled_at    TIMESTAMPTZ NOT NULL,
  duration_min    INTEGER DEFAULT 60,
  topic           TEXT,
  notes           TEXT,
  meeting_url     TEXT,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  feedback        TEXT,
  rating          INTEGER CHECK (rating BETWEEN 1 AND 5),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: kpi_reports
-- ============================================================
CREATE TABLE IF NOT EXISTS kpi_reports (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id                  UUID NOT NULL REFERENCES startup_profiles(id) ON DELETE CASCADE,
  report_month                DATE NOT NULL,
  revenue                     NUMERIC(12,2) DEFAULT 0,
  revenue_target              NUMERIC(12,2),
  active_users                INTEGER DEFAULT 0,
  active_users_target         INTEGER,
  retention_rate              NUMERIC(5,2) DEFAULT 0,
  retention_rate_target       NUMERIC(5,2),
  prototype_progress          INTEGER DEFAULT 0 CHECK (prototype_progress BETWEEN 0 AND 100),
  extra_metrics               JSONB DEFAULT '{}',
  notes                       TEXT,
  submitted_by                UUID REFERENCES auth.users(id),
  submitted_at                TIMESTAMPTZ DEFAULT now(),
  is_late                     BOOLEAN DEFAULT FALSE,
  early_warning_triggered     BOOLEAN DEFAULT FALSE,
  UNIQUE(startup_id, report_month)
);

-- ============================================================
-- TABLE: fablab_machines
-- ============================================================
CREATE TABLE IF NOT EXISTS fablab_machines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  type            TEXT NOT NULL,
  description     TEXT,
  is_available    BOOLEAN DEFAULT TRUE,
  image_url       TEXT,
  location        TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: fablab_reservations
-- ============================================================
CREATE TABLE IF NOT EXISTS fablab_reservations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id      UUID NOT NULL REFERENCES startup_profiles(id) ON DELETE CASCADE,
  machine_id      UUID NOT NULL REFERENCES fablab_machines(id) ON DELETE CASCADE,
  reserved_by     UUID NOT NULL REFERENCES auth.users(id),
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ NOT NULL,
  purpose         TEXT,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'cancelled', 'completed')),
  access_code     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: incubation_messages
-- ============================================================
CREATE TABLE IF NOT EXISTS incubation_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id      UUID NOT NULL REFERENCES startup_profiles(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES auth.users(id),
  channel         TEXT DEFAULT 'general',
  content         TEXT NOT NULL,
  attachments     JSONB DEFAULT '[]',
  is_pinned       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: jury_evaluations
-- ============================================================
CREATE TABLE IF NOT EXISTS jury_evaluations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id          UUID NOT NULL REFERENCES startup_profiles(id) ON DELETE CASCADE,
  juror_id            UUID NOT NULL REFERENCES auth.users(id),
  score_pitch         INTEGER CHECK (score_pitch BETWEEN 0 AND 20),
  score_financials    INTEGER CHECK (score_financials BETWEEN 0 AND 20),
  score_market        INTEGER CHECK (score_market BETWEEN 0 AND 20),
  score_team          INTEGER CHECK (score_team BETWEEN 0 AND 20),
  score_innovation    INTEGER CHECK (score_innovation BETWEEN 0 AND 20),
  score_total         INTEGER GENERATED ALWAYS AS (
    COALESCE(score_pitch, 0) + COALESCE(score_financials, 0) +
    COALESCE(score_market, 0) + COALESCE(score_team, 0) + COALESCE(score_innovation, 0)
  ) STORED,
  comments            TEXT,
  recommendation      TEXT CHECK (recommendation IN ('certifier', 'prolonger', 'refuser')),
  evaluated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(startup_id, juror_id)
);

-- ============================================================
-- TABLE: incubation_labels
-- ============================================================
CREATE TABLE IF NOT EXISTS incubation_labels (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id          UUID NOT NULL REFERENCES startup_profiles(id) ON DELETE CASCADE,
  label_number        TEXT NOT NULL UNIQUE,
  issued_at           TIMESTAMPTZ DEFAULT now(),
  issued_by           UUID REFERENCES auth.users(id),
  verification_code   TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  pdf_url             TEXT,
  average_jury_score  NUMERIC(5,2),
  is_revoked          BOOLEAN DEFAULT FALSE,
  revoked_at          TIMESTAMPTZ,
  revoked_reason      TEXT
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_startup_profiles_user_id ON startup_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_startup_profiles_coach_id ON startup_profiles(coach_id);
CREATE INDEX IF NOT EXISTS idx_kpi_reports_startup_month ON kpi_reports(startup_id, report_month DESC);
CREATE INDEX IF NOT EXISTS idx_coaching_bookings_coach_date ON coaching_bookings(coach_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_incubation_messages_startup ON incubation_messages(startup_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fablab_reservations_machine ON fablab_reservations(machine_id, start_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE startup_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE incubation_roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE fablab_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE fablab_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE incubation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE jury_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE incubation_labels ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
  SELECT role::TEXT FROM user_roles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE POLICY "startup_profiles_incube_own" ON startup_profiles
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "startup_profiles_coach_admin" ON startup_profiles
  FOR ALL USING (get_current_user_role() IN ('formateur', 'superadmin', 'superviseur'));
CREATE POLICY "startup_profiles_public_read" ON startup_profiles
  FOR SELECT USING (true);

CREATE POLICY "diag_sub_own" ON diagnostic_submissions
  FOR ALL USING (
    startup_id IN (SELECT id FROM startup_profiles WHERE user_id = auth.uid())
    OR get_current_user_role() IN ('formateur', 'superadmin', 'superviseur')
  );
CREATE POLICY "diag_scores_read" ON diagnostic_scores
  FOR SELECT USING (
    startup_id IN (SELECT id FROM startup_profiles WHERE user_id = auth.uid())
    OR get_current_user_role() IN ('formateur', 'superadmin', 'superviseur')
  );
CREATE POLICY "diag_scores_write" ON diagnostic_scores
  FOR INSERT WITH CHECK (get_current_user_role() IN ('formateur', 'superadmin'));

CREATE POLICY "roadmap_own_or_admin" ON incubation_roadmaps
  FOR ALL USING (
    startup_id IN (SELECT id FROM startup_profiles WHERE user_id = auth.uid())
    OR get_current_user_role() IN ('formateur', 'superadmin', 'superviseur')
  );
CREATE POLICY "milestone_own_or_admin" ON roadmap_milestones
  FOR ALL USING (
    roadmap_id IN (
      SELECT id FROM incubation_roadmaps WHERE startup_id IN (
        SELECT id FROM startup_profiles WHERE user_id = auth.uid()
      )
    )
    OR get_current_user_role() IN ('formateur', 'superadmin', 'superviseur')
  );

CREATE POLICY "bookings_participant" ON coaching_bookings
  FOR ALL USING (
    booked_by = auth.uid()
    OR coach_id = auth.uid()
    OR get_current_user_role() IN ('superadmin', 'superviseur')
  );

CREATE POLICY "kpi_own_or_admin" ON kpi_reports
  FOR ALL USING (
    startup_id IN (SELECT id FROM startup_profiles WHERE user_id = auth.uid())
    OR get_current_user_role() IN ('formateur', 'superadmin', 'superviseur')
  );

CREATE POLICY "fablab_machines_read" ON fablab_machines
  FOR SELECT USING (true);
CREATE POLICY "fablab_machines_admin" ON fablab_machines
  FOR ALL USING (get_current_user_role() IN ('superadmin', 'formateur'));

CREATE POLICY "fablab_res_own_or_admin" ON fablab_reservations
  FOR ALL USING (
    reserved_by = auth.uid()
    OR get_current_user_role() IN ('formateur', 'superadmin', 'superviseur')
  );

CREATE POLICY "messages_own_startup" ON incubation_messages
  FOR ALL USING (
    startup_id IN (SELECT id FROM startup_profiles WHERE user_id = auth.uid())
    OR sender_id = auth.uid()
    OR get_current_user_role() IN ('formateur', 'superadmin', 'superviseur')
  );

CREATE POLICY "jury_own_or_admin" ON jury_evaluations
  FOR ALL USING (
    juror_id = auth.uid()
    OR get_current_user_role() IN ('superadmin', 'superviseur')
  );

CREATE POLICY "labels_public_read" ON incubation_labels
  FOR SELECT USING (true);
CREATE POLICY "labels_admin_write" ON incubation_labels
  FOR ALL USING (get_current_user_role() IN ('superadmin', 'formateur'));

-- ============================================================
-- DONNÉES DE DÉMONSTRATION: Machines Fablab
-- ============================================================
INSERT INTO fablab_machines (name, type, description, location) VALUES
  ('Imprimante 3D Prusa MK4', 'impression_3d', 'Impression FDM haute précision, volume 250x210x220mm', 'Atelier B - Station 1'),
  ('Imprimante 3D Bambu Lab X1', 'impression_3d', 'Impression multi-matériaux rapide', 'Atelier B - Station 2'),
  ('Découpe Laser Trotec Speedy', 'decoupe_laser', 'Découpe et gravure laser CO2 100W, format A3', 'Atelier A - Station 1'),
  ('CNC Shopbot', 'fraiseuse', 'Fraiseuse numérique 3 axes, bois et plastique', 'Atelier A - Station 2'),
  ('Thermoformeuse', 'autre', 'Formage plastique sous vide', 'Atelier C')
ON CONFLICT DO NOTHING;

-- ============================================================
-- DONNÉES DE DÉMONSTRATION: Startups Incubées Réalistes (Cohorte Pilote)
-- ============================================================
DO $$
DECLARE
  u_rec RECORD;
  idx INT := 1;
  new_sp_id UUID;
BEGIN
  FOR u_rec IN (
    SELECT id, full_name FROM profiles
    WHERE full_name IS NOT NULL
      AND full_name NOT ILIKE '%formateur%'
      AND full_name NOT ILIKE '%admin%'
    ORDER BY created_at ASC
    LIMIT 6
  ) LOOP
    IF idx = 1 THEN
      INSERT INTO startup_profiles (id, user_id, name, sector, stage, team_size, description, equity_signed)
      VALUES (
        gen_random_uuid(),
        u_rec.id,
        'AgriDrip CI',
        'Irrigation Intelligente & Solaire',
        'certifie',
        4,
        'Système d''irrigation goutte-à-goutte connecté et solaire adapté aux cultures maraîchères en zone péri-urbaine.',
        TRUE
      )
      ON CONFLICT (user_id) DO UPDATE SET 
        name = EXCLUDED.name, 
        sector = EXCLUDED.sector,
        stage = EXCLUDED.stage,
        team_size = EXCLUDED.team_size,
        description = EXCLUDED.description
      RETURNING id INTO new_sp_id;

      INSERT INTO user_roles (user_id, role) VALUES (u_rec.id, 'incube') ON CONFLICT DO NOTHING;

      IF new_sp_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM incubation_labels WHERE startup_id = new_sp_id) THEN
        INSERT INTO incubation_labels (startup_id, label_number, average_jury_score)
        VALUES (new_sp_id, 'LBL-2026-001', 17.5);
      END IF;

    ELSIF idx = 2 THEN
      INSERT INTO startup_profiles (id, user_id, name, sector, stage, team_size, description, equity_signed)
      VALUES (
        gen_random_uuid(),
        u_rec.id,
        'BioFertil Ivoire',
        'Bio-intrants & Compostage',
        'pilotage',
        3,
        'Valorisation des résidus de cabosses de cacao en compost enrichi et bio-fertilisants microbiens locaux.',
        TRUE
      )
      ON CONFLICT (user_id) DO UPDATE SET 
        name = EXCLUDED.name, 
        sector = EXCLUDED.sector,
        stage = EXCLUDED.stage,
        team_size = EXCLUDED.team_size,
        description = EXCLUDED.description;

      INSERT INTO user_roles (user_id, role) VALUES (u_rec.id, 'incube') ON CONFLICT DO NOTHING;

    ELSIF idx = 3 THEN
      INSERT INTO startup_profiles (id, user_id, name, sector, stage, team_size, description, equity_signed)
      VALUES (
        gen_random_uuid(),
        u_rec.id,
        'CocoaTrace Hub',
        'Traçabilité & Qualité Cacao',
        'acceleration',
        5,
        'Application mobile de géolocalisation des parcelles et contrôle qualité post-récolte pour coopératives cacaoyères.',
        TRUE
      )
      ON CONFLICT (user_id) DO UPDATE SET 
        name = EXCLUDED.name, 
        sector = EXCLUDED.sector,
        stage = EXCLUDED.stage,
        team_size = EXCLUDED.team_size,
        description = EXCLUDED.description;

      INSERT INTO user_roles (user_id, role) VALUES (u_rec.id, 'incube') ON CONFLICT DO NOTHING;

    ELSIF idx = 4 THEN
      INSERT INTO startup_profiles (id, user_id, name, sector, stage, team_size, description, equity_signed)
      VALUES (
        gen_random_uuid(),
        u_rec.id,
        'SolarKool Maraîcher',
        'Énergie Solaire & Froid',
        'acceleration',
        3,
        'Mini-chambres froides mobiles fonctionnant à l''énergie solaire pour limiter les pertes post-récolte de maraîchers.',
        TRUE
      )
      ON CONFLICT (user_id) DO UPDATE SET 
        name = EXCLUDED.name, 
        sector = EXCLUDED.sector,
        stage = EXCLUDED.stage,
        team_size = EXCLUDED.team_size,
        description = EXCLUDED.description;

      INSERT INTO user_roles (user_id, role) VALUES (u_rec.id, 'incube') ON CONFLICT DO NOTHING;

    ELSIF idx = 5 THEN
      INSERT INTO startup_profiles (id, user_id, name, sector, stage, team_size, description, equity_signed)
      VALUES (
        gen_random_uuid(),
        u_rec.id,
        'DroneAgri Scan',
        'Télédétection & Cartographie',
        'onboarding',
        2,
        'Surveillance multispectrale des plantations d''hévéa et de palmier pour la détection précoce du stress hydrique.',
        FALSE
      )
      ON CONFLICT (user_id) DO UPDATE SET 
        name = EXCLUDED.name, 
        sector = EXCLUDED.sector,
        stage = EXCLUDED.stage,
        team_size = EXCLUDED.team_size,
        description = EXCLUDED.description;

      INSERT INTO user_roles (user_id, role) VALUES (u_rec.id, 'incube') ON CONFLICT DO NOTHING;

    ELSIF idx = 6 THEN
      INSERT INTO startup_profiles (id, user_id, name, sector, stage, team_size, description, equity_signed)
      VALUES (
        gen_random_uuid(),
        u_rec.id,
        'GrainoWarrant',
        'Fintech Rurale & Stockage',
        'diagnostic',
        2,
        'Plateforme de warrantage agricole digitalisant les stocks villageois pour faciliter l''octroi de microcrédits.',
        FALSE
      )
      ON CONFLICT (user_id) DO UPDATE SET 
        name = EXCLUDED.name, 
        sector = EXCLUDED.sector,
        stage = EXCLUDED.stage,
        team_size = EXCLUDED.team_size,
        description = EXCLUDED.description;

      INSERT INTO user_roles (user_id, role) VALUES (u_rec.id, 'incube') ON CONFLICT DO NOTHING;
    END IF;

    idx := idx + 1;
  END LOOP;
END $$;
