-- Add category_id to profiles to track the learner's filière
ALTER TABLE public.profiles
ADD COLUMN category_id uuid REFERENCES public.categories(id);

-- Add a comment to explain
COMMENT ON COLUMN public.profiles.category_id IS 'The filière (field of study) selected by the learner.';
