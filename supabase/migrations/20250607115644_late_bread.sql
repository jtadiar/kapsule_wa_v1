/*
  # Add marketing opt-in column to subscribers table

  1. Changes
    - Add `marketing_opt_in` boolean column to subscribers table
    - Set default value to false
    - Add index for faster filtering of opted-in users
*/

-- Add marketing_opt_in column to subscribers table
ALTER TABLE subscribers 
ADD COLUMN marketing_opt_in boolean DEFAULT false;

-- Create index for faster filtering of marketing opt-in users
CREATE INDEX idx_subscribers_marketing_opt_in ON subscribers(marketing_opt_in) WHERE marketing_opt_in = true;