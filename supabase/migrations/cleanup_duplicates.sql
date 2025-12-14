-- Script de nettoyage des doublons dans user_roles
-- À exécuter AVANT la migration fix_on_conflict_constraints.sql

-- 1. Afficher tous les user_id qui ont des doublons
SELECT user_id, COUNT(*) as count
FROM public.user_roles
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 2. Supprimer les doublons en gardant le plus récent pour chaque user_id
-- Cette requête supprime tous les enregistrements sauf le plus récent pour chaque user_id
DELETE FROM public.user_roles a
USING public.user_roles b
WHERE a.user_id = b.user_id 
  AND a.created_at < b.created_at;

-- 3. Vérifier qu'il n'y a plus de doublons
SELECT user_id, COUNT(*) as count
FROM public.user_roles
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Si le résultat est vide, c'est bon ! Vous pouvez maintenant exécuter fix_on_conflict_constraints.sql
