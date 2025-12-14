-- Enable RLS on lessons if not already enabled (it should be)
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Policy for Instructors to INSERT lessons (including live sessions)
-- They can insert a lesson if they are the instructor of the course linked to the module
CREATE POLICY "Instructors can insert lessons in their courses"
ON public.lessons
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.modules m
    JOIN public.courses c ON m.course_id = c.id
    WHERE m.id = module_id
    AND c.instructor_id = auth.uid()
  )
);

-- Policy for Instructors to UPDATE lessons in their courses
CREATE POLICY "Instructors can update lessons in their courses"
ON public.lessons
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 
    FROM public.modules m
    JOIN public.courses c ON m.course_id = c.id
    WHERE m.id = module_id
    AND c.instructor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.modules m
    JOIN public.courses c ON m.course_id = c.id
    WHERE m.id = module_id
    AND c.instructor_id = auth.uid()
  )
);

-- Policy for Instructors to DELETE lessons in their courses
CREATE POLICY "Instructors can delete lessons in their courses"
ON public.lessons
FOR DELETE
USING (
  EXISTS (
    SELECT 1 
    FROM public.modules m
    JOIN public.courses c ON m.course_id = c.id
    WHERE m.id = module_id
    AND c.instructor_id = auth.uid()
  )
);

-- Also ensure they can view modules to select them when creating lessons
CREATE POLICY "Instructors can view modules of their courses"
ON public.modules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.courses c
    WHERE c.id = course_id
    AND c.instructor_id = auth.uid()
  )
);
