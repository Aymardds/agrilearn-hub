-- Migration pour ajouter la configuration des certificats
-- Date: 2025-11-26

-- Table pour stocker les paramètres de certificat
CREATE TABLE IF NOT EXISTS certificate_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Logos
  admin_logo_url TEXT,
  admin_logo_width NUMERIC(5,2) DEFAULT 60,
  admin_logo_height NUMERIC(5,2) DEFAULT 20,
  
  -- Partenaires (stocké en JSON pour supporter plusieurs partenaires)
  partner_logos JSONB DEFAULT '[]'::jsonb,
  
  -- Texte d'attestation
  attestation_text TEXT DEFAULT 'Ceci certifie que',
  completion_text TEXT DEFAULT 'a complété avec succès le cours',
  
  -- Signature
  signature_name TEXT,
  signature_title TEXT,
  signature_image_url TEXT,
  
  -- QR Code
  enable_qr_code BOOLEAN DEFAULT true,
  qr_code_base_url TEXT DEFAULT 'https://agrilearn.com/verify/',
  
  -- Couleurs
  primary_color VARCHAR(7) DEFAULT '#228B22',
  secondary_color VARCHAR(7) DEFAULT '#FFFFFF',
  text_color VARCHAR(7) DEFAULT '#000000',
  
  -- Métadonnées
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Actif (un seul paramétrage actif à la fois)
  is_active BOOLEAN DEFAULT false,
  
  -- Audit
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Index
CREATE INDEX IF NOT EXISTS idx_certificate_settings_active ON certificate_settings(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_certificate_settings_created_at ON certificate_settings(created_at DESC);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_certificate_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_certificate_settings_updated_at ON certificate_settings;
CREATE TRIGGER trigger_update_certificate_settings_updated_at
  BEFORE UPDATE ON certificate_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_certificate_settings_updated_at();

-- Trigger pour s'assurer qu'un seul paramétrage est actif
CREATE OR REPLACE FUNCTION ensure_single_active_certificate_setting()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    -- Désactiver tous les autres paramétrages
    UPDATE certificate_settings 
    SET is_active = false 
    WHERE id != NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_single_active_certificate_setting ON certificate_settings;
CREATE TRIGGER trigger_ensure_single_active_certificate_setting
  BEFORE INSERT OR UPDATE ON certificate_settings
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION ensure_single_active_certificate_setting();

-- Table pour les partenaires de cours (relation many-to-many)
CREATE TABLE IF NOT EXISTS course_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  partner_name TEXT NOT NULL,
  partner_logo_url TEXT,
  partner_website TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(course_id, partner_name)
);

CREATE INDEX IF NOT EXISTS idx_course_partners_course ON course_partners(course_id);

-- RLS Policies pour certificate_settings
ALTER TABLE certificate_settings ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut voir les paramètres actifs
DROP POLICY IF EXISTS "Anyone can view active certificate settings" ON certificate_settings;
CREATE POLICY "Anyone can view active certificate settings"
  ON certificate_settings FOR SELECT
  USING (is_active = true);

-- Seuls les admins peuvent voir tous les paramètres
DROP POLICY IF EXISTS "Admins can view all certificate settings" ON certificate_settings;
CREATE POLICY "Admins can view all certificate settings"
  ON certificate_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('superadmin', 'superviseur')
    )
  );

-- Seuls les admins peuvent créer/modifier les paramètres
DROP POLICY IF EXISTS "Admins can manage certificate settings" ON certificate_settings;
CREATE POLICY "Admins can manage certificate settings"
  ON certificate_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('superadmin', 'superviseur')
    )
  );

-- RLS Policies pour course_partners
ALTER TABLE course_partners ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut voir les partenaires
DROP POLICY IF EXISTS "Anyone can view course partners" ON course_partners;
CREATE POLICY "Anyone can view course partners"
  ON course_partners FOR SELECT
  USING (true);

-- Seuls les admins et instructeurs peuvent gérer les partenaires
DROP POLICY IF EXISTS "Admins and instructors can manage course partners" ON course_partners;
CREATE POLICY "Admins and instructors can manage course partners"
  ON course_partners FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('superadmin', 'superviseur', 'formateur')
    )
  );

-- Insérer un paramétrage par défaut
INSERT INTO certificate_settings (
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
  '#228B22',
  '#FFFFFF',
  '#000000',
  true,
  true
) ON CONFLICT DO NOTHING;

-- Commentaires
COMMENT ON TABLE certificate_settings IS 'Configuration globale pour la génération des certificats';
COMMENT ON TABLE course_partners IS 'Partenaires associés à un cours spécifique';
COMMENT ON COLUMN certificate_settings.partner_logos IS 'Liste des logos de partenaires globaux (JSON array)';
COMMENT ON COLUMN certificate_settings.enable_qr_code IS 'Activer/désactiver le QR code de vérification';
COMMENT ON COLUMN certificate_settings.is_active IS 'Indique si ce paramétrage est actuellement actif';

-- Fonction RPC pour récupérer les paramètres actifs
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
  FROM certificate_settings cs
  WHERE cs.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonctions RPC pour gérer les partenaires de cours
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
  FROM course_partners cp
  WHERE cp.course_id = p_course_id
  ORDER BY cp.display_order, cp.partner_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION add_course_partner(
  p_course_id UUID,
  p_partner_name TEXT,
  p_partner_logo_url TEXT DEFAULT NULL,
  p_partner_website TEXT DEFAULT NULL,
  p_display_order INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  v_partner_id UUID;
BEGIN
  INSERT INTO course_partners (
    course_id,
    partner_name,
    partner_logo_url,
    partner_website,
    display_order
  ) VALUES (
    p_course_id,
    p_partner_name,
    p_partner_logo_url,
    p_partner_website,
    p_display_order
  )
  RETURNING id INTO v_partner_id;
  
  RETURN v_partner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_course_partner(
  p_partner_id UUID,
  p_partner_name TEXT,
  p_partner_logo_url TEXT DEFAULT NULL,
  p_partner_website TEXT DEFAULT NULL,
  p_display_order INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  UPDATE course_partners
  SET 
    partner_name = p_partner_name,
    partner_logo_url = p_partner_logo_url,
    partner_website = p_partner_website,
    display_order = p_display_order
  WHERE id = p_partner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_course_partner(p_partner_id UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM course_partners WHERE id = p_partner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
