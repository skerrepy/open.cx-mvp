-- RPC Functions for SupportAI
-- Run this SQL in your Supabase SQL Editor

-- Function to increment token usage atomically
CREATE OR REPLACE FUNCTION increment_token_usage(ticket_id UUID, tokens INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE tickets
  SET ai_token_usage = COALESCE(ai_token_usage, 0) + tokens
  WHERE id = ticket_id;
END;
$$ LANGUAGE plpgsql;

