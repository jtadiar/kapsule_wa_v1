/*
  # Make user_id nullable in stripe_customers table

  1. Changes
    - Make user_id column nullable in stripe_customers table
    - This allows creating Stripe customer records before user signup
    - Add index for better performance on customer_id lookups

  2. Security
    - Maintains existing RLS policies
    - No changes to data access patterns
*/

-- Make user_id nullable to allow customer creation before user signup
ALTER TABLE stripe_customers 
ALTER COLUMN user_id DROP NOT NULL;

-- Add index for faster customer_id lookups
CREATE INDEX IF NOT EXISTS idx_stripe_customers_customer_id ON stripe_customers(customer_id);

-- Add index for user_id lookups (when not null)
CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON stripe_customers(user_id) WHERE user_id IS NOT NULL;