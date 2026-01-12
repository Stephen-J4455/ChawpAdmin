-- Migration: Add 'delivery' role to chawp_user_profiles
-- This allows delivery personnel to be assigned the 'delivery' role in the user profiles table

-- Drop the existing role constraint check
ALTER TABLE chawp_user_profiles 
DROP CONSTRAINT IF EXISTS chawp_user_profiles_role_check;

-- Add updated role constraint to include 'delivery'
ALTER TABLE chawp_user_profiles 
ADD CONSTRAINT chawp_user_profiles_role_check 
CHECK (role IN ('user', 'vendor', 'delivery', 'admin', 'super_admin'));

-- Update the comment to document the new role
COMMENT ON COLUMN chawp_user_profiles.role IS 'User role: user (default), vendor, delivery, admin, or super_admin';

-- Optional: Create a function to automatically set role to 'delivery' when delivery personnel record is created
CREATE OR REPLACE FUNCTION set_delivery_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the user profile role to 'delivery' when a delivery personnel record is created
    UPDATE chawp_user_profiles
    SET role = 'delivery'
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Create trigger to automatically set delivery role
-- Uncomment if you want automatic role assignment
-- CREATE TRIGGER trigger_set_delivery_role
--     AFTER INSERT ON chawp_delivery_personnel
--     FOR EACH ROW
--     EXECUTE FUNCTION set_delivery_role();

-- Optional: Update existing delivery personnel to have correct role
-- Run this if you have existing records:
-- UPDATE chawp_user_profiles
-- SET role = 'delivery'
-- WHERE id IN (
--     SELECT user_id FROM chawp_delivery_personnel
-- );
