-- Add ios_beta_interest column to subscribers table
ALTER TABLE subscribers 
ADD COLUMN ios_beta_interest text CHECK (ios_beta_interest IN ('yes', 'no'));

-- Create index for faster filtering of iOS beta interested users
CREATE INDEX idx_subscribers_ios_beta ON subscribers(ios_beta_interest) WHERE ios_beta_interest = 'yes';