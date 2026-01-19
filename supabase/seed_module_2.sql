-- Remplacer 'VOTRE_ID_DE_COURS' par l'ID réel du cours
DO $$
DECLARE
    v_course_id UUID := 'VOTRE_ID_DE_COURS'; -- À REMPLIR
    v_module_id UUID;
    v_lesson_id UUID;
    v_quiz_id UUID;
BEGIN
    -- 1. Création du Module
    INSERT INTO public.modules (course_id, title, description, order_index)
    VALUES (v_course_id, 'MODULE 2 : CHOIX DU SITE ET PREPARATION DE LA PARCELLE', 'Ce module couvre les critères de choix du site, les étapes de préparation et les principes d''aménagement hydroagricole.', 2)
    RETURNING id INTO v_module_id;

    -- 2. Leçon : Objectifs du module
    INSERT INTO public.lessons (module_id, title, lesson_type, order_index, content)
    VALUES (v_module_id, 'Objectifs du module', 'text', 1, '<h3>À la fin de ce module, l’apprenant sera capable de :</h3><ul><li>Identifier les critères essentiels de choix d’un bon site rizicole ;</li><li>Réaliser les opérations de préparation du site et de la parcelle ;</li><li>Comprendre les principes d’aménagement hydroagricole pour une gestion optimale de l’eau.</li></ul>');

    -- 3. Leçon : 2.1. Choix du site approprié à la riziculture
    INSERT INTO public.lessons (module_id, title, lesson_type, order_index, content)
    VALUES (v_module_id, '2.1. Choix du site approprié à la riziculture', 'text', 2, '<p>Le choix du site vise à garantir des conditions favorables à la croissance du riz, à une bonne maîtrise de l’eau et à une productivité durable.</p><h4>a) Critères de sélection</h4><p>Un site rizicole approprié doit :</p><ul><li>Être relativement plat (pente douce de 10 à 15 cm de dénivelé sur 100 m) ;</li><li>Présenter un sol argileux ou limoneux, riche en matière organique et retenant bien l’eau ;</li><li>Disposer d’une source d’eau fiable (pluviométrie suffisante ou irrigation) ;</li><li>Être accessible pour le transport du matériel, des intrants et de la production ;</li><li>Être sécurisé contre les risques d’inondation ou de dégradation.</li></ul><h4>b) Erreurs à éviter</h4><ul><li>Choisir un site à forte pente ou à sol sableux ;</li><li>S’installer sur un terrain mal drainé ou acide (pH < 5,5) ;</li><li>Négliger les coûts d’aménagement et d’entretien du réseau hydraulique.</li></ul><h4>c) Conseils pratiques</h4><ul><li>Préférer les zones basses et fertiles des vallées.</li><li>S’assurer de la disponibilité de main-d’œuvre et de matériel pour la préparation.</li><li>Planifier les travaux avant la saison des pluies.</li></ul>');

    -- 4. Leçon : 2.2. Préparation du site
    INSERT INTO public.lessons (module_id, title, lesson_type, order_index, content)
    VALUES (v_module_id, '2.2. Préparation du site', 'text', 3, '<h4>a) Délimitation du site</h4><p>La délimitation consiste à circonscrire la zone de production à l’aide d’un GPS ou d’instruments de mesure.</p><p>Elle permet de connaître avec précision la superficie à emblaver, en tenant compte des capacités réelles du producteur (main-d’œuvre, équipements, ressources financières).</p><p><strong>💡Conseil :</strong> Il est préférable de commencer par une petite superficie bien maîtrisée plutôt qu’un grand espace mal entretenu.</p>');

    -- 5. Leçon : 2.3. Nettoyage du site
    INSERT INTO public.lessons (module_id, title, lesson_type, order_index, content)
    VALUES (v_module_id, '2.3. Nettoyage du site', 'text', 4, '<p>Le nettoyage est une étape essentielle pour préparer le terrain à la culture.</p><p>Il comprend :</p><ul><li>Le défrichage des herbes et arbustes ;</li><li>L’abattage des arbres gênants ;</li><li>L’andainage et le ramassage des débris hors du site.</li></ul><p><strong>🚫À éviter :</strong></p><ul><li>Le brûlage total du champ. Si nécessaire, brûler par poches uniquement.</li><li>Supprimer tous les arbres : il faut conserver au moins 25 arbres par hectare pour maintenir la biodiversité et protéger le sol.</li></ul>');

    -- 6. Leçon : 2.4. Essouchage
    INSERT INTO public.lessons (module_id, title, lesson_type, order_index, content)
    VALUES (v_module_id, '2.4. Essouchage', 'text', 5, '<p>L’essouchage vise à retirer les souches d’arbres, pierres et obstacles pouvant gêner le travail du sol et le développement des plants.</p><p>Les troncs abattus doivent être morcelés à la tronçonneuse et dégagés hors du site.</p><p>Cette opération est inutile sur une parcelle déjà exploitée.</p>');

    -- 7. Leçon : 2.5. Labour
    INSERT INTO public.lessons (module_id, title, lesson_type, order_index, content)
    VALUES (v_module_id, '2.5. Labour', 'text', 6, '<p>Le labour consiste à retourner la terre à une profondeur de 15 à 20 cm, environ 15 jours avant le semis.</p><p>Il peut être effectué à la houe, à la charrue ou au motoculteur selon les moyens disponibles.</p><h5>Avantages du labour :</h5><ul><li>Ameublissement et aération du sol ;</li><li>Amélioration de la structure et du système racinaire ;</li><li>Réduction des mauvaises herbes.</li></ul><p><strong>🔁 Bonnes pratiques :</strong></p><p>Réaliser deux labours croisés :</p><ul><li>1er labour avec 10 à 15 tonnes de fumier par hectare ;</li><li>2e labour 15 à 30 jours après, en croisant la direction du premier.</li></ul><p>Adapter les équipements au type de sol pour éviter la compaction.</p>');

    -- 8. Leçon : 2.6. Aménagement hydroagricole
    INSERT INTO public.lessons (module_id, title, lesson_type, order_index, content)
    VALUES (v_module_id, '2.6. Aménagement hydroagricole', 'text', 7, '<p>Un bon aménagement permet de maîtriser la lame d’eau, d’éviter les pertes et d’améliorer la productivité.</p><h4>a) Types de diguettes</h4><p><strong>Diguettes de rétention :</strong> en terre compactée ou en pierres sèches, elles retiennent l’eau, réduisent l’érosion et favorisent sa répartition uniforme.</p><p><strong>Diguettes de cloisonnement :</strong> subdivisent le site en casiers pour mieux gérer l’irrigation.</p><p>Plus la pente est forte, plus les casiers doivent être petits pour éviter le ruissellement.</p><h4>b) Réseau d’irrigation et de drainage</h4><p>Le site doit disposer :</p><ul><li>D’un canal d’irrigation pour alimenter les parcelles en eau ;</li><li>D’un canal de drainage pour évacuer l’excédent d’eau.</li></ul><p><strong>⚙️ Recommandation :</strong> Faire appel à un aménagiste hydroagricole pour la conception et la mise en place des diguettes et du réseau hydraulique.</p>');

    -- 9. Leçon : 2.7. Résumé du module
    INSERT INTO public.lessons (module_id, title, lesson_type, order_index, content)
    VALUES (v_module_id, '2.7. Résumé du module', 'text', 8, '<p>Le succès d’une exploitation rizicole commence par un bon choix de site et une préparation rigoureuse de la parcelle.</p><p>Un terrain bien nivelé, propre, ameubli et doté d’un réseau hydraulique fonctionnel garantit une meilleure germination, une croissance homogène et des rendements élevés.</p>');

    -- 10. Création du Quiz de Module
    INSERT INTO public.quizzes (module_id, title, passing_score)
    VALUES (v_module_id, 'Test de Connaissances - Module 2', 70)
    RETURNING id INTO v_quiz_id;

    -- Questions du Quiz
    INSERT INTO public.quiz_questions (quiz_id, question_text, options, correct_answer, order_index, question_type)
    VALUES 
    (v_quiz_id, 'Un bon site pour la riziculture doit avoir :', '["Sol argileux ou limoneux, bien drainé ou inondable", "Sol sableux uniquement", "Terrain rocheux et sec"]', 'Sol argileux ou limoneux, bien drainé ou inondable', 1, 'multiple_choice'),
    (v_quiz_id, 'La pente du terrain doit être :', '["Très forte pour le drainage rapide", "Faible ou nulle pour faciliter l''irrigation et la gestion de l''eau", "Indifférente"]', 'Faible ou nulle pour faciliter l''irrigation et la gestion de l''eau', 2, 'multiple_choice'),
    (v_quiz_id, 'Vrai ou Faux : L’exposition au soleil est secondaire pour la croissance du riz.', '["Vrai", "Faux"]', 'Faux', 3, 'multiple_choice'),
    (v_quiz_id, 'La préparation du sol inclut :', '["Labour profond suivi d''un nivellement précis", "Semis direct sur sol non travaillé", "Aucun travail du sol"]', 'Labour profond suivi d''un nivellement précis', 4, 'multiple_choice'),
    (v_quiz_id, 'Le nivelage du champ permet de :', '["Faciliter une irrigation uniforme et un bon enracinement", "Réduire la croissance des plants", "Favoriser le lessivage des nutriments uniquement"]', 'Faciliter une irrigation uniforme et un bon enracinement', 5, 'multiple_choice'),
    (v_quiz_id, 'Vrai ou Faux : La préparation des canaux d’irrigation est indispensable pour la gestion de l’eau.', '["Vrai", "Faux"]', 'Vrai', 6, 'multiple_choice'),
    (v_quiz_id, 'Une parcelle doit être nettoyée de :', '["Cailloux, herbes, racines et débris pour éviter la compétition avec le riz", "Micro-organismes uniquement", "Engrais organiques"]', 'Cailloux, herbes, racines et débris pour éviter la compétition avec le riz', 7, 'multiple_choice'),
    (v_quiz_id, 'Le drainage final avant repiquage est nécessaire pour :', '["Assécher complètement le sol", "Maintenir un peu d''eau pour faciliter le repiquage", "Augmenter l''infestation en mauvaises herbes"]', 'Maintenir un peu d''eau pour faciliter le repiquage', 8, 'multiple_choice'),
    (v_quiz_id, 'Vrai ou Faux : La préparation d’un terrain pauvre n’influence pas le rendement.', '["Vrai", "Faux"]', 'Faux', 9, 'multiple_choice'),
    (v_quiz_id, 'L’aménagement des planches et canaux doit :', '["Suivre un tracé irrégulier", "Suivre un tracé régulier pour faciliter l''irrigation et le désherbage", "Être aléatoire"]', 'Suivre un tracé régulier pour faciliter l''irrigation et le désherbage', 10, 'multiple_choice');

END $$;
