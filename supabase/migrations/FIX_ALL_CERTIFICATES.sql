-- SCRIPT DE RÉPARATION COMPLET - SYSTÈME DE CERTIFICATS
-- Exécutez TOUT ce script dans l'éditeur SQL de Supabase

-- 1. CRÉATION DE LA TABLE CERTIFICATE_SETTINGS
CREATE TABLE IF NOT EXISTS public.certificate_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  admin_logo_url TEXT,
  admin_logo_width NUMERIC(5,2) DEFAULT 60,
  admin_logo_height NUMERIC(5,2) DEFAULT 20,
  partner_logos JSONB DEFAULT '[]'::jsonb,
  attestation_text TEXT DEFAULT 'Ceci certifie que',
  completion_text TEXT DEFAULT 'a complété avec succès le cours',
  signature_name TEXT,
  signature_title TEXT,
  signature_image_url TEXT,
  enable_qr_code BOOLEAN DEFAULT true,
  qr_code_base_url TEXT DEFAULT 'https://agrilearn.com/verify/',
  primary_color VARCHAR(7) DEFAULT '#228B22',
  secondary_color VARCHAR(7) DEFAULT '#F39C12',
  text_color VARCHAR(7) DEFAULT '#000000',
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT false,
  created_by UUID,
  updated_by UUID
);

-- 2. CRÉATION DE LA TABLE COURSE_PARTNERS
CREATE TABLE IF NOT EXISTS public.course_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  partner_name TEXT NOT NULL,
  partner_logo_url TEXT,
  partner_website TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id, partner_name)
);

-- 3. MISE À JOUR DE LA TABLE CERTIFICATES (si elle existe déjà)
-- Ajout des colonnes manquantes si nécessaire
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certificates' AND column_name = 'student_name') THEN
        ALTER TABLE public.certificates ADD COLUMN student_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certificates' AND column_name = 'final_score') THEN
        ALTER TABLE public.certificates ADD COLUMN final_score NUMERIC;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certificates' AND column_name = 'metadata') THEN
        ALTER TABLE public.certificates ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 4. CRÉATION DU BUCKET DE STOCKAGE
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-materials', 'course-materials', true)
ON CONFLICT (id) DO NOTHING;

-- 5. POLITIQUES DE SÉCURITÉ (RLS)
ALTER TABLE public.certificate_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_partners ENABLE ROW LEVEL SECURITY;

-- Nettoyage des anciennes politiques pour éviter les conflits
DROP POLICY IF EXISTS "Anyone can view active certificate settings" ON public.certificate_settings;
DROP POLICY IF EXISTS "Admins can view all certificate settings" ON public.certificate_settings;
DROP POLICY IF EXISTS "Admins can manage certificate settings" ON public.certificate_settings;
DROP POLICY IF EXISTS "Anyone can view course partners" ON public.course_partners;
DROP POLICY IF EXISTS "Admins and instructors can manage course partners" ON public.course_partners;

-- Création des nouvelles politiques
CREATE POLICY "Anyone can view active certificate settings"
  ON public.certificate_settings FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all certificate settings"
  ON public.certificate_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('superadmin', 'superviseur')
    )
  );

CREATE POLICY "Admins can manage certificate settings"
  ON public.certificate_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('superadmin', 'superviseur')
    )
  );

CREATE POLICY "Anyone can view course partners"
  ON public.course_partners FOR SELECT
  USING (true);

CREATE POLICY "Admins and instructors can manage course partners"
  ON public.course_partners FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('superadmin', 'superviseur', 'formateur')
    )
  );

-- Politiques de stockage
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT TO public USING (bucket_id = 'course-materials');

DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'course-materials');

-- 6. FONCTIONS RPC (Nécessaires pour le frontend)
CREATE OR REPLACE FUNCTION get_active_certificate_settings()
RETURNS TABLE (
  id UUID,
  admin_logo_url TEXT,
  admin_logo_width NUMERIC,
  admin_logo_height NUMERIC,
  partner_logos JSONB,
  attestation_text TEXT,
  completion_text TEXT,
  signature_name TEXT,
  signature_title TEXT,
  signature_image_url TEXT,
  enable_qr_code BOOLEAN,
  qr_code_base_url TEXT,
  primary_color VARCHAR,
  secondary_color VARCHAR,
  text_color VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.id,
    cs.admin_logo_url,
    cs.admin_logo_width,
    cs.admin_logo_height,
    cs.partner_logos,
    cs.attestation_text,
    cs.completion_text,
    cs.signature_name,
    cs.signature_title,
    cs.signature_image_url,
    cs.enable_qr_code,
    cs.qr_code_base_url,
    cs.primary_color,
    cs.secondary_color,
    cs.text_color
  FROM public.certificate_settings cs
  WHERE cs.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_course_partners(p_course_id UUID)
RETURNS TABLE (
  id UUID,
  course_id UUID,
  partner_name TEXT,
  partner_logo_url TEXT,
  partner_website TEXT,
  display_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id,
    cp.course_id,
    cp.partner_name,
    cp.partner_logo_url,
    cp.partner_website,
    cp.display_order
  FROM public.course_partners cp
  WHERE cp.course_id = p_course_id
  ORDER BY cp.display_order, cp.partner_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. DONNÉES PAR DÉFAUT
INSERT INTO public.certificate_settings (
  attestation_text,
  completion_text,
  signature_name,
  signature_title,
  primary_color,
  secondary_color,
  text_color,
  enable_qr_code,
  is_active
) VALUES (
  'Ceci certifie que',
  'a complété avec succès le cours',
  'Direction Générale',
  'Directeur de la Formation',
  '#009E49', -- Vert du modèle
  '#F39C12', -- Orange du modèle
  '#1D1D1B', -- Noir du modèle
  true,
  true
) ON CONFLICT DO NOTHING;

-- S'assurer qu'il y a au moins un paramètre actif
UPDATE public.certificate_settings SET is_active = true WHERE id = (SELECT id FROM public.certificate_settings LIMIT 1);
