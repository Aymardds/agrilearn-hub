-- Add foreign key constraint to certificates.user_id if it doesn't exist
DO $$
BEGIN
    -- Check if the constraint already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'certificates_user_id_fkey' 
        AND table_name = 'certificates'
    ) THEN
        -- Add the constraint referencing profiles(id)
        -- We use profiles instead of auth.users because we often join with profiles for names/avatars
        -- and profiles is in the public schema.
        ALTER TABLE public.certificates
        ADD CONSTRAINT certificates_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- Also ensure course_id has a foreign key if missing (just in case)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'certificates_course_id_fkey' 
        AND table_name = 'certificates'
    ) THEN
        ALTER TABLE public.certificates
        ADD CONSTRAINT certificates_course_id_fkey
        FOREIGN KEY (course_id)
        REFERENCES public.courses(id)
        ON DELETE CASCADE;
    END IF;
END $$;
