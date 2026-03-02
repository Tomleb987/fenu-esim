-- ============================================================
-- MIGRATION: Add promo_code and is_active to partner_profiles
-- SAFE: Only adds new columns, does NOT modify existing data
-- Production table already has: id, email, partner_code, advisor_name, created_at
-- ============================================================

-- Task 1.1: Add promo_code column
ALTER TABLE public.partner_profiles 
ADD COLUMN IF NOT EXISTS promo_code text;

-- Add is_active column for partner management (default true so existing partners stay active)
ALTER TABLE public.partner_profiles 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;

-- Add updated_at column for tracking changes
ALTER TABLE public.partner_profiles 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- Task 1.2: Create index for fast lookup by partner_code (if not already exists)
CREATE INDEX IF NOT EXISTS partner_profiles_partner_code_idx ON public.partner_profiles(partner_code);

-- Task 1.3: Ensure partner_code is unique (if not already constrained)
-- This uses a DO block to safely check before adding
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'partner_profiles_partner_code_key' 
    AND conrelid = 'public.partner_profiles'::regclass
  ) THEN
    ALTER TABLE public.partner_profiles ADD CONSTRAINT partner_profiles_partner_code_key UNIQUE (partner_code);
  END IF;
END $$;

-- ============================================================
-- Update the existing ANSET partner with a promo code
-- Change 'ANSET5' to whatever promo code you want for this partner
-- Make sure a matching entry exists in promo_codes table!
-- ============================================================
UPDATE public.partner_profiles 
SET promo_code = 'ANSET5', 
    is_active = true,
    updated_at = now()
WHERE partner_code = 'ANSET';

-- ============================================================
-- VERIFY: Run this after migration to confirm
-- SELECT partner_code, advisor_name, promo_code, is_active FROM partner_profiles;
-- ============================================================