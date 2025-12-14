-- Create chapters table to support the Module -> Chapter -> Lesson hierarchy
CREATE TABLE IF NOT EXISTS public.chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add chapter_id to lessons
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE;

-- Add 'live' to lesson_type enum if it doesn't exist
-- Note: 'ADD VALUE IF NOT EXISTS' is supported in newer Postgres versions. 
-- If it fails, we might need a DO block, but Supabase usually supports it.
ALTER TYPE public.lesson_type ADD VALUE IF NOT EXISTS 'live';

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_chapters_module_id ON public.chapters(module_id);
CREATE INDEX IF NOT EXISTS idx_lessons_chapter_id ON public.lessons(chapter_id);

-- Add comments
COMMENT ON TABLE public.chapters IS 'Chapitres contenus dans un module';
COMMENT ON COLUMN public.lessons.chapter_id IS 'Chapitre auquel appartient la leçon (optionnel, si null la leçon est directement dans le module)';
