-- Add module_id to quizzes table and make lesson_id optional
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE;
ALTER TABLE public.quizzes ALTER COLUMN lesson_id DROP NOT NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_quizzes_module_id ON public.quizzes(module_id);

-- Add comments for clarity
COMMENT ON COLUMN public.quizzes.module_id IS 'Module auquel appartient le quiz (optionnel, si défini le quiz est lié au module plutôt qu''à une leçon spécifique)';
COMMENT ON COLUMN public.quizzes.lesson_id IS 'Leçon à laquelle appartient le quiz (optionnel)';

-- Update RLS policies for quizzes
DROP POLICY IF EXISTS "Instructors can manage quizzes" ON quizzes;
CREATE POLICY "Instructors can manage quizzes"
ON quizzes FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM modules
    JOIN courses ON modules.course_id = courses.id
    WHERE (
      modules.id = quizzes.module_id 
      OR EXISTS (SELECT 1 FROM lessons WHERE lessons.id = quizzes.lesson_id AND lessons.module_id = modules.id)
    )
    AND (
      courses.instructor_id = auth.uid() OR
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('superadmin', 'superviseur'))
    )
  )
);

DROP POLICY IF EXISTS "Anyone can view quizzes" ON quizzes;
CREATE POLICY "Anyone can view quizzes"
ON quizzes FOR SELECT
TO authenticated
USING (true);

-- Update RLS policies for quiz questions
DROP POLICY IF EXISTS "Instructors can manage quiz questions" ON quiz_questions;
CREATE POLICY "Instructors can manage quiz questions"
ON quiz_questions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM quizzes
    LEFT JOIN lessons ON quizzes.lesson_id = lessons.id
    LEFT JOIN modules ON (quizzes.module_id = modules.id OR lessons.module_id = modules.id)
    JOIN courses ON modules.course_id = courses.id
    WHERE quizzes.id = quiz_questions.quiz_id
    AND (
      courses.instructor_id = auth.uid() OR
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('superadmin', 'superviseur'))
    )
  )
);

DROP POLICY IF EXISTS "Anyone can view quiz questions" ON quiz_questions;
CREATE POLICY "Anyone can view quiz questions"
ON quiz_questions FOR SELECT
TO authenticated
USING (true);
