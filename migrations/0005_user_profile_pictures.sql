-- Add profile picture support for users
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS profile_picture_id TEXT DEFAULT 'avatar-1';
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Assign random profile pictures to existing users without one
DO $$
BEGIN
    UPDATE app_users
    SET profile_picture_id = 'avatar-' || (floor(random() * 12) + 1)::text
    WHERE profile_picture_id IS NULL OR profile_picture_id = '';
END $$;
