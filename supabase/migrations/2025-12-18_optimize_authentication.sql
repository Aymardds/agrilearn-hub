-- Migration pour optimiser l'authentification avec confirmation email et réinitialisation de mot de passe

-- Activer la confirmation par email (si ce n'est pas déjà fait dans les paramètres Supabase)
-- Cette configuration doit être faite dans le dashboard Supabase : 
-- Authentication > Email Templates > Confirm signup
-- Authentication > Email Templates > Reset password

-- Ajouter une fonction pour nettoyer les tentatives d'inscription non confirmées après 7 jours
CREATE OR REPLACE FUNCTION delete_unconfirmed_users()
RETURNS void AS $$
BEGIN
  DELETE FROM auth.users
  WHERE confirmed_at IS NULL
  AND created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer une table pour traquer les tentatives de réinitialisation de mot de passe
CREATE TABLE IF NOT EXISTS password_reset_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- Ajouter un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_user_id ON password_reset_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_email ON password_reset_attempts(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_attempted_at ON password_reset_attempts(attempted_at);

-- Activer RLS (Row Level Security)
ALTER TABLE password_reset_attempts ENABLE ROW LEVEL SECURITY;

-- Politique RLS : seuls les admins peuvent voir les tentatives
CREATE POLICY "Admins can view password reset attempts"
  ON password_reset_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'superadmin'
    )
  );

-- Créer une fonction pour limiter les tentatives de réinitialisation (protection anti-spam)
CREATE OR REPLACE FUNCTION check_password_reset_rate_limit(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  recent_attempts INTEGER;
BEGIN
  -- Compter les tentatives dans les 15 dernières minutes
  SELECT COUNT(*) INTO recent_attempts
  FROM password_reset_attempts
  WHERE email = user_email
  AND attempted_at > NOW() - INTERVAL '15 minutes';
  
  -- Autoriser maximum 3 tentatives par 15 minutes
  IF recent_attempts >= 3 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nettoyer les anciennes tentatives de réinitialisation (plus de 24h)
CREATE OR REPLACE FUNCTION cleanup_old_reset_attempts()
RETURNS void AS $$
BEGIN
  DELETE FROM password_reset_attempts
  WHERE attempted_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION delete_unconfirmed_users() IS 'Nettoie les utilisateurs non confirmés après 7 jours. À exécuter via un cron job.';
COMMENT ON FUNCTION cleanup_old_reset_attempts() IS 'Nettoie les anciennes tentatives de réinitialisation. À exécuter via un cron job.';

-- Fonction pour enregistrer une tentative de réinitialisation
CREATE OR REPLACE FUNCTION log_password_reset_attempt(p_email TEXT)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Récupérer l'ID utilisateur
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  
  -- N'enregistrer que si l'utilisateur existe
  IF v_user_id IS NOT NULL THEN
    INSERT INTO password_reset_attempts (user_id, email)
    VALUES (v_user_id, p_email);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

