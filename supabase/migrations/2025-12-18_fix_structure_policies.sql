-- Permissions manquantes pour la gestion complète de la structure par les instructeurs

-- 1. Chapters
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Instructors can manage chapters" ON chapters;

CREATE POLICY "Instructors can manage chapters"
ON chapters FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM modules
    JOIN courses ON modules.course_id = courses.id
    WHERE modules.id = chapters.module_id
    AND (
      courses.instructor_id = auth.uid() OR
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
    )
  )
);

-- 2. Quizzes
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Instructors can manage quizzes" ON quizzes;

CREATE POLICY "Instructors can manage quizzes"
ON quizzes FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM lessons
    JOIN modules ON lessons.module_id = modules.id
    JOIN courses ON modules.course_id = courses.id
    WHERE lessons.id = quizzes.lesson_id
    AND (
      courses.instructor_id = auth.uid() OR
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
    )
  )
);

-- 3. Quiz Questions
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Instructors can manage quiz questions" ON quiz_questions;

CREATE POLICY "Instructors can manage quiz questions"
ON quiz_questions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM quizzes
    JOIN lessons ON quizzes.lesson_id = lessons.id
    JOIN modules ON lessons.module_id = modules.id
    JOIN courses ON modules.course_id = courses.id
    WHERE quizzes.id = quiz_questions.quiz_id
    AND (
      courses.instructor_id = auth.uid() OR
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
    )
  )
);
