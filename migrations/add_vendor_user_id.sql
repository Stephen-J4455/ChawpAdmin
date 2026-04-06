-- Migration: Add user_id to chawp_vendors table and update role constraint for chawp_user_profiles
-- This links vendor records to Supabase auth accounts and allows 'vendor' role

-- Add user_id column to chawp_vendors if it doesn't exist
ALTER TABLE chawp_vendors 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_chawp_vendors_user_id 
ON chawp_vendors(user_id);

-- Drop the existing role constraint check
ALTER TABLE chawp_user_profiles 
DROP CONSTRAINT IF EXISTS chawp_user_profiles_role_check;

-- Add updated role constraint to include 'vendor'
ALTER TABLE chawp_user_profiles 
ADD CONSTRAINT chawp_user_profiles_role_check 
CHECK (role IN ('user', 'vendor', 'admin', 'super_admin'));

-- The role column and index already exist, no need to add them

-- Add unique constraint to ensure one vendor per auth user
-- ALTER TABLE chawp_vendors 
-- ADD CONSTRAINT unique_vendor_user_id UNIQUE (user_id);
-- Note: Comment out the above if you want to allow one auth user to have multiple vendor profiles

-- Add comments to document the columns
COMMENT ON COLUMN chawp_vendors.user_id IS 'Links vendor to Supabase auth account for login';
COMMENT ON COLUMN chawp_user_profiles.role IS 'User role: user (default), vendor, admin, or super_admin';

-- Optional: Update existing vendors to link to auth accounts
-- You'll need to run this manually for existing vendors if needed:
-- 
-- UPDATE chawp_vendors 
-- SET user_id = (
--   SELECT id FROM auth.users 
--   WHERE auth.users.email = chawp_vendors.email
--   LIMIT 1
-- )
-- WHERE email IS NOT NULL 
-- AND user_id IS NULL;

-- Optional: Add Row Level Security (RLS) policies
-- Enable RLS on chawp_vendors if not already enabled
-- ALTER TABLE chawp_vendors ENABLE ROW LEVEL SECURITY;

-- Policy: Vendors can only read/update their own profile
-- CREATE POLICY "Vendors can view own profile"
-- ON chawp_vendors FOR SELECT
-- USING (auth.uid() = user_id);

-- CREATE POLICY "Vendors can update own profile"
-- ON chawp_vendors FOR UPDATE
-- USING (auth.uid() = user_id);

-- Policy: Admins can do everything (requires admin role in auth metadata)
-- CREATE POLICY "Admins have full access"
-- ON chawp_vendors FOR ALL
-- USING (
--   (auth.jwt()->>'role')::text = 'admin'
-- );

-- Policy: Allow new vendor creation during signup
-- CREATE POLICY "Allow vendor creation during signup"
-- ON chawp_vendors FOR INSERT
-- WITH CHECK (auth.uid() = user_id);
