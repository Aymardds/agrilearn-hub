-- Update handle_new_user function to include category_id from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, category_id)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    (new.raw_user_meta_data->>'category_id')::uuid
  );
  
  -- Assign default role 'apprenant'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'apprenant');
  
  RETURN new;
END;
$function$;
