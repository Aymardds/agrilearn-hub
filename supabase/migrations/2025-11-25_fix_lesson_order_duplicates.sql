-- Migration pour corriger les problèmes de contrainte unique sur lessons_module_id_order_index
-- Date: 2025-11-25

-- Fonction pour réindexer automatiquement les leçons d'un module
CREATE OR REPLACE FUNCTION reindex_module_lessons(p_module_id UUID)
RETURNS void AS $$
DECLARE
  lesson_record RECORD;
  new_index INTEGER := 1;
BEGIN
  -- Parcourir toutes les leçons du module triées par order_index actuel
  FOR lesson_record IN
    SELECT id, order_index
    FROM lessons
    WHERE module_id = p_module_id
    ORDER BY order_index, created_at
  LOOP
    -- Mettre à jour l'order_index avec le nouvel index séquentiel
    UPDATE lessons
    SET order_index = new_index
    WHERE id = lesson_record.id;
    
    new_index := new_index + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour nettoyer les doublons dans tous les modules
CREATE OR REPLACE FUNCTION fix_all_lesson_order_duplicates()
RETURNS void AS $$
DECLARE
  module_record RECORD;
BEGIN
  -- Parcourir tous les modules
  FOR module_record IN
    SELECT DISTINCT module_id
    FROM lessons
  LOOP
    -- Réindexer les leçons de chaque module
    PERFORM reindex_module_lessons(module_record.module_id);
  END LOOP;
  
  RAISE NOTICE 'Réindexation terminée pour tous les modules';
END;
$$ LANGUAGE plpgsql;

-- Exécuter la correction pour tous les modules existants
SELECT fix_all_lesson_order_duplicates();

-- Fonction trigger pour vérifier et corriger automatiquement les doublons avant insertion
CREATE OR REPLACE FUNCTION prevent_lesson_order_duplicate()
RETURNS TRIGGER AS $$
DECLARE
  existing_count INTEGER;
  max_order INTEGER;
BEGIN
  -- Vérifier s'il existe déjà une leçon avec le même order_index dans le module
  SELECT COUNT(*), MAX(order_index)
  INTO existing_count, max_order
  FROM lessons
  WHERE module_id = NEW.module_id
    AND order_index = NEW.order_index
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  -- Si un doublon existe, assigner automatiquement le prochain index disponible
  IF existing_count > 0 THEN
    SELECT COALESCE(MAX(order_index), 0) + 1
    INTO NEW.order_index
    FROM lessons
    WHERE module_id = NEW.module_id;
    
    RAISE NOTICE 'Doublon détecté pour order_index %. Assignation automatique à %', 
                 TG_ARGV[0], NEW.order_index;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour prévenir les doublons lors de l'insertion
DROP TRIGGER IF EXISTS trigger_prevent_lesson_order_duplicate ON lessons;
CREATE TRIGGER trigger_prevent_lesson_order_duplicate
  BEFORE INSERT OR UPDATE ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION prevent_lesson_order_duplicate();

-- Fonction pour réorganiser les leçons après suppression
CREATE OR REPLACE FUNCTION reorder_lessons_after_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Réindexer les leçons du module après suppression
  PERFORM reindex_module_lessons(OLD.module_id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour réorganiser après suppression
DROP TRIGGER IF EXISTS trigger_reorder_lessons_after_delete ON lessons;
CREATE TRIGGER trigger_reorder_lessons_after_delete
  AFTER DELETE ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION reorder_lessons_after_delete();

-- Vérification finale : afficher les modules avec des doublons (devrait être vide)
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO duplicate_count
  FROM (
    SELECT module_id, order_index, COUNT(*) as cnt
    FROM lessons
    GROUP BY module_id, order_index
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE WARNING 'Il reste % doublons après la correction. Exécutez à nouveau fix_all_lesson_order_duplicates()', duplicate_count;
  ELSE
    RAISE NOTICE 'Aucun doublon détecté. La correction est réussie!';
  END IF;
END $$;

-- Commentaires pour documentation
COMMENT ON FUNCTION reindex_module_lessons(UUID) IS 'Réindexe toutes les leçons d''un module pour éviter les doublons';
COMMENT ON FUNCTION fix_all_lesson_order_duplicates() IS 'Corrige tous les doublons d''order_index dans tous les modules';
COMMENT ON FUNCTION prevent_lesson_order_duplicate() IS 'Trigger function pour prévenir automatiquement les doublons d''order_index';
COMMENT ON FUNCTION reorder_lessons_after_delete() IS 'Réorganise les leçons après suppression pour maintenir une séquence continue';
