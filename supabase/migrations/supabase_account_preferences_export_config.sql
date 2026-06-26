ALTER TABLE public.user_account_preferences
ADD COLUMN IF NOT EXISTS export_config text DEFAULT NULL;
