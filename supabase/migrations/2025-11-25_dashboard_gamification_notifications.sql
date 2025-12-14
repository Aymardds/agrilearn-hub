-- Migration pour le dashboard enrichi, gamification et notifications
-- Date: 2025-11-25

-- ============================================
-- 1. TRACKING DU TEMPS D'APPRENTISSAGE
-- ============================================

CREATE TABLE IF NOT EXISTS learning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_learning_sessions_user ON learning_sessions(user_id);
CREATE INDEX idx_learning_sessions_date ON learning_sessions(started_at DESC);

-- ============================================
-- 2. SYSTÈME DE POINTS
-- ============================================

CREATE TABLE IF NOT EXISTS user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  reference_type TEXT, -- 'lesson', 'quiz', 'course', 'streak', 'login'
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_points_user ON user_points(user_id);
CREATE INDEX idx_user_points_date ON user_points(created_at DESC);

-- ============================================
-- 3. SYSTÈME DE STREAKS
-- ============================================

CREATE TABLE IF NOT EXISTS user_streaks (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 4. BADGES
-- ============================================

CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL, -- 'achievement', 'progress', 'social', 'special'
  points_reward INTEGER NOT NULL DEFAULT 0,
  condition_type TEXT NOT NULL, -- 'courses_completed', 'streak', 'quiz_score', 'lessons_completed', 'points_earned'
  condition_value INTEGER NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_badges_category ON badges(category);

-- ============================================
-- 5. BADGES OBTENUS PAR LES UTILISATEURS
-- ============================================

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_user_badges_date ON user_badges(earned_at DESC);

-- ============================================
-- 6. NIVEAUX ET POINTS TOTAUX
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience_points INTEGER DEFAULT 0;

-- ============================================
-- 7. NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'course', 'quiz', 'badge', 'level', 'live_session', 'forum', 'system'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  icon TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  priority TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ============================================
-- 8. PRÉFÉRENCES DE NOTIFICATION
-- ============================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  new_course BOOLEAN NOT NULL DEFAULT TRUE,
  live_session BOOLEAN NOT NULL DEFAULT TRUE,
  quiz_reminder BOOLEAN NOT NULL DEFAULT TRUE,
  badge_earned BOOLEAN NOT NULL DEFAULT TRUE,
  level_up BOOLEAN NOT NULL DEFAULT TRUE,
  forum_reply BOOLEAN NOT NULL DEFAULT TRUE,
  weekly_summary BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 9. INSÉRER LES BADGES PAR DÉFAUT
-- ============================================

INSERT INTO badges (name, description, icon, category, points_reward, condition_type, condition_value, rarity) VALUES
  ('Débutant', 'Commencez votre premier cours', '🌱', 'progress', 10, 'courses_started', 1, 'common'),
  ('Lecteur assidu', 'Complétez 5 leçons', '📚', 'progress', 20, 'lessons_completed', 5, 'common'),
  ('Précis', 'Obtenez 100% à un quiz', '🎯', 'achievement', 30, 'quiz_perfect_score', 1, 'rare'),
  ('En feu', 'Maintenez un streak de 7 jours', '🔥', 'achievement', 50, 'streak', 7, 'rare'),
  ('Champion', 'Complétez un cours avec 90%+', '🏆', 'achievement', 100, 'course_high_score', 1, 'epic'),
  ('Diplômé', 'Obtenez 3 certificats', '👨‍🎓', 'achievement', 150, 'certificates_earned', 3, 'epic'),
  ('Explorateur', 'Commencez 3 cours différents', '🗺️', 'progress', 40, 'courses_started', 3, 'common'),
  ('Persévérant', 'Complétez 10 leçons', '💪', 'progress', 50, 'lessons_completed', 10, 'common'),
  ('Expert', 'Complétez 5 cours', '⭐', 'achievement', 200, 'courses_completed', 5, 'legendary'),
  ('Maître', 'Atteignez 1000 points', '👑', 'achievement', 100, 'points_earned', 1000, 'legendary')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 10. FONCTIONS UTILITAIRES
-- ============================================

-- Fonction pour calculer le niveau basé sur les points
CREATE OR REPLACE FUNCTION calculate_level(points INTEGER)
RETURNS INTEGER AS $$
BEGIN
  IF points < 100 THEN RETURN 1;
  ELSIF points < 300 THEN RETURN 2;
  ELSIF points < 600 THEN RETURN 3;
  ELSIF points < 1000 THEN RETURN 4;
  ELSIF points < 1500 THEN RETURN 5;
  ELSIF points < 2500 THEN RETURN 6;
  ELSIF points < 4000 THEN RETURN 7;
  ELSIF points < 6000 THEN RETURN 8;
  ELSIF points < 9000 THEN RETURN 9;
  ELSE RETURN 10;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction pour ajouter des points à un utilisateur
CREATE OR REPLACE FUNCTION add_user_points(
  p_user_id UUID,
  p_points INTEGER,
  p_reason TEXT,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_old_level INTEGER;
  v_new_level INTEGER;
  v_new_total INTEGER;
BEGIN
  -- Récupérer le niveau actuel
  SELECT level INTO v_old_level FROM profiles WHERE id = p_user_id;
  
  -- Ajouter les points
  INSERT INTO user_points (user_id, points, reason, reference_type, reference_id)
  VALUES (p_user_id, p_points, p_reason, p_reference_type, p_reference_id);
  
  -- Mettre à jour le total de points
  UPDATE profiles
  SET total_points = total_points + p_points,
      experience_points = experience_points + p_points
  WHERE id = p_user_id
  RETURNING total_points INTO v_new_total;
  
  -- Calculer le nouveau niveau
  v_new_level := calculate_level(v_new_total);
  
  -- Mettre à jour le niveau si changé
  IF v_new_level > v_old_level THEN
    UPDATE profiles SET level = v_new_level WHERE id = p_user_id;
    
    -- Créer une notification de level up
    INSERT INTO notifications (user_id, type, title, message, icon, priority)
    VALUES (
      p_user_id,
      'level',
      'Nouveau niveau atteint !',
      format('Félicitations ! Vous êtes maintenant niveau %s', v_new_level),
      '🎉',
      'high'
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour le streak
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_last_activity DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Récupérer les données actuelles
  SELECT last_activity_date, current_streak, longest_streak
  INTO v_last_activity, v_current_streak, v_longest_streak
  FROM user_streaks
  WHERE user_id = p_user_id;
  
  -- Si pas d'entrée, créer une nouvelle
  IF NOT FOUND THEN
    INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date)
    VALUES (p_user_id, 1, 1, v_today);
    RETURN;
  END IF;
  
  -- Si activité aujourd'hui déjà enregistrée, ne rien faire
  IF v_last_activity = v_today THEN
    RETURN;
  END IF;
  
  -- Si activité hier, incrémenter le streak
  IF v_last_activity = v_today - INTERVAL '1 day' THEN
    v_current_streak := v_current_streak + 1;
    
    -- Mettre à jour le longest streak si nécessaire
    IF v_current_streak > v_longest_streak THEN
      v_longest_streak := v_current_streak;
    END IF;
    
    -- Donner des points pour le streak
    IF v_current_streak = 7 THEN
      PERFORM add_user_points(p_user_id, 50, 'Streak de 7 jours', 'streak', NULL);
    ELSIF v_current_streak = 30 THEN
      PERFORM add_user_points(p_user_id, 200, 'Streak de 30 jours', 'streak', NULL);
    ELSIF v_current_streak % 10 = 0 THEN
      PERFORM add_user_points(p_user_id, 25, format('Streak de %s jours', v_current_streak), 'streak', NULL);
    END IF;
  ELSE
    -- Streak cassé, recommencer à 1
    v_current_streak := 1;
  END IF;
  
  -- Mettre à jour
  UPDATE user_streaks
  SET current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      last_activity_date = v_today,
      updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour vérifier et attribuer les badges
CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_badge RECORD;
  v_condition_met BOOLEAN;
  v_value INTEGER;
BEGIN
  -- Parcourir tous les badges non encore obtenus
  FOR v_badge IN
    SELECT b.*
    FROM badges b
    WHERE NOT EXISTS (
      SELECT 1 FROM user_badges ub
      WHERE ub.user_id = p_user_id AND ub.badge_id = b.id
    )
  LOOP
    v_condition_met := FALSE;
    
    -- Vérifier la condition selon le type
    CASE v_badge.condition_type
      WHEN 'courses_started' THEN
        SELECT COUNT(DISTINCT course_id) INTO v_value
        FROM enrollments
        WHERE user_id = p_user_id;
        v_condition_met := v_value >= v_badge.condition_value;
        
      WHEN 'courses_completed' THEN
        SELECT COUNT(*) INTO v_value
        FROM enrollments
        WHERE user_id = p_user_id AND progress_percentage = 100;
        v_condition_met := v_value >= v_badge.condition_value;
        
      WHEN 'lessons_completed' THEN
        SELECT COUNT(*) INTO v_value
        FROM lesson_progress
        WHERE user_id = p_user_id AND is_completed = TRUE;
        v_condition_met := v_value >= v_badge.condition_value;
        
      WHEN 'streak' THEN
        SELECT current_streak INTO v_value
        FROM user_streaks
        WHERE user_id = p_user_id;
        v_condition_met := v_value >= v_badge.condition_value;
        
      WHEN 'points_earned' THEN
        SELECT total_points INTO v_value
        FROM profiles
        WHERE id = p_user_id;
        v_condition_met := v_value >= v_badge.condition_value;
        
      WHEN 'certificates_earned' THEN
        SELECT COUNT(*) INTO v_value
        FROM certificates
        WHERE user_id = p_user_id;
        v_condition_met := v_value >= v_badge.condition_value;
        
      WHEN 'quiz_perfect_score' THEN
        SELECT COUNT(*) INTO v_value
        FROM quiz_attempts
        WHERE user_id = p_user_id AND score = 100;
        v_condition_met := v_value >= v_badge.condition_value;
        
      WHEN 'course_high_score' THEN
        SELECT COUNT(*) INTO v_value
        FROM enrollments
        WHERE user_id = p_user_id AND progress_percentage >= 90;
        v_condition_met := v_value >= v_badge.condition_value;
    END CASE;
    
    -- Si la condition est remplie, attribuer le badge
    IF v_condition_met THEN
      INSERT INTO user_badges (user_id, badge_id)
      VALUES (p_user_id, v_badge.id);
      
      -- Ajouter les points du badge
      PERFORM add_user_points(
        p_user_id,
        v_badge.points_reward,
        format('Badge obtenu: %s', v_badge.name),
        'badge',
        v_badge.id
      );
      
      -- Créer une notification
      INSERT INTO notifications (user_id, type, title, message, icon, priority)
      VALUES (
        p_user_id,
        'badge',
        'Nouveau badge obtenu !',
        format('Vous avez obtenu le badge "%s" et gagné %s points !', v_badge.name, v_badge.points_reward),
        v_badge.icon,
        'high'
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 11. TRIGGERS
-- ============================================

-- Trigger pour mettre à jour le streak lors d'une activité
CREATE OR REPLACE FUNCTION trigger_update_streak()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_user_streak(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_lesson_progress_streak ON lesson_progress;
CREATE TRIGGER trigger_lesson_progress_streak
  AFTER INSERT OR UPDATE ON lesson_progress
  FOR EACH ROW
  WHEN (NEW.is_completed = TRUE)
  EXECUTE FUNCTION trigger_update_streak();

-- Trigger pour donner des points lors de la complétion d'une leçon
CREATE OR REPLACE FUNCTION trigger_lesson_completed_points()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_completed = TRUE AND (OLD IS NULL OR OLD.is_completed = FALSE) THEN
    PERFORM add_user_points(NEW.user_id, 10, 'Leçon complétée', 'lesson', NEW.lesson_id);
    PERFORM check_and_award_badges(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_lesson_completed_points ON lesson_progress;
CREATE TRIGGER trigger_lesson_completed_points
  AFTER INSERT OR UPDATE ON lesson_progress
  FOR EACH ROW
  EXECUTE FUNCTION trigger_lesson_completed_points();

-- Trigger pour donner des points lors de la réussite d'un quiz
CREATE OR REPLACE FUNCTION trigger_quiz_completed_points()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.passed = TRUE THEN
    -- Points de base pour réussite
    PERFORM add_user_points(NEW.user_id, 20, 'Quiz réussi', 'quiz', NEW.quiz_id);
    
    -- Bonus pour score parfait
    IF NEW.score = 100 THEN
      PERFORM add_user_points(NEW.user_id, 10, 'Score parfait au quiz', 'quiz', NEW.quiz_id);
    END IF;
    
    PERFORM check_and_award_badges(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_quiz_completed_points ON quiz_attempts;
CREATE TRIGGER trigger_quiz_completed_points
  AFTER INSERT ON quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_quiz_completed_points();

-- Trigger pour donner des points lors de la complétion d'un cours
CREATE OR REPLACE FUNCTION trigger_course_completed_points()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.progress_percentage = 100 AND (OLD IS NULL OR OLD.progress_percentage < 100) THEN
    PERFORM add_user_points(NEW.user_id, 100, 'Cours complété', 'course', NEW.course_id);
    PERFORM check_and_award_badges(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_course_completed_points ON enrollments;
CREATE TRIGGER trigger_course_completed_points
  AFTER UPDATE ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_course_completed_points();

-- ============================================
-- 12. RLS POLICIES
-- ============================================

-- Learning sessions
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own learning sessions"
  ON learning_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own learning sessions"
  ON learning_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own learning sessions"
  ON learning_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- User points
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own points"
  ON user_points FOR SELECT
  USING (auth.uid() = user_id);

-- User streaks
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own streak"
  ON user_streaks FOR SELECT
  USING (auth.uid() = user_id);

-- Badges (public read)
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badges"
  ON badges FOR SELECT
  USING (true);

-- User badges
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own badges"
  ON user_badges FOR SELECT
  USING (auth.uid() = user_id);

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Notification preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 13. COMMENTAIRES
-- ============================================

COMMENT ON TABLE learning_sessions IS 'Tracking des sessions d''apprentissage pour analytics';
COMMENT ON TABLE user_points IS 'Historique des points gagnés par les utilisateurs';
COMMENT ON TABLE user_streaks IS 'Suivi des streaks (jours consécutifs) des utilisateurs';
COMMENT ON TABLE badges IS 'Définition des badges disponibles';
COMMENT ON TABLE user_badges IS 'Badges obtenus par les utilisateurs';
COMMENT ON TABLE notifications IS 'Notifications pour les utilisateurs';
COMMENT ON TABLE notification_preferences IS 'Préférences de notification des utilisateurs';

COMMENT ON FUNCTION add_user_points IS 'Ajoute des points à un utilisateur et vérifie le changement de niveau';
COMMENT ON FUNCTION update_user_streak IS 'Met à jour le streak d''un utilisateur';
COMMENT ON FUNCTION check_and_award_badges IS 'Vérifie et attribue les badges mérités';
COMMENT ON FUNCTION calculate_level IS 'Calcule le niveau basé sur les points totaux';
