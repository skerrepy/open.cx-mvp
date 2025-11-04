-- Comprehensive Migration for SupportAI Enhancements
-- Run this SQL in your Supabase SQL Editor

-- 1. Add customer info fields to tickets table
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS customer_first_name TEXT,
ADD COLUMN IF NOT EXISTS customer_last_name TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- 2. Add summary and token tracking (if not already added)
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS ai_token_usage INTEGER DEFAULT 0;

-- 3. Add status for AI-resolved tickets
-- (We'll use 'ai_resolved' as a status in ticket_statuses, no need to add column here)

-- 4. Create ticket_reviews table for admin reviews and customer satisfaction
CREATE TABLE IF NOT EXISTS ticket_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  reviewer_type TEXT NOT NULL CHECK (reviewer_type IN ('admin', 'customer')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  reviewer_id UUID, -- Admin user ID or customer ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(ticket_id, reviewer_type) -- One review per type per ticket
);

-- 5. Create audit_logs table for tracking all interactions
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'ai_response', 'agent_response', 'status_change', 'ticket_closed', etc.
  actor_type TEXT NOT NULL CHECK (actor_type IN ('ai', 'agent', 'system', 'customer')),
  actor_id UUID, -- User ID if applicable
  details JSONB, -- Store additional context like tokens used, message text, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickets_customer_email ON tickets(customer_email) WHERE customer_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ticket_reviews_ticket_id ON ticket_reviews(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_reviews_reviewer_type ON ticket_reviews(reviewer_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ticket_id ON audit_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_ai_token_usage ON tickets(ai_token_usage) WHERE ai_token_usage > 0;

-- 7. Enable Row Level Security
ALTER TABLE ticket_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for ticket_reviews
-- Allow public read access on reviews
CREATE POLICY "Allow public read access on ticket_reviews"
  ON ticket_reviews FOR SELECT
  USING (true);

-- Allow authenticated users to insert/update reviews
CREATE POLICY "Allow authenticated insert on ticket_reviews"
  ON ticket_reviews FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on ticket_reviews"
  ON ticket_reviews FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 9. Create RLS policies for audit_logs
-- Allow public read access on audit logs
CREATE POLICY "Allow public read access on audit_logs"
  ON audit_logs FOR SELECT
  USING (true);

-- Allow authenticated users to insert audit logs
CREATE POLICY "Allow authenticated insert on audit_logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- 10. Enable Realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;

-- 11. Create function to automatically summarize ticket on close (background task helper)
-- Note: This will be called via API route, not directly by database trigger
CREATE OR REPLACE FUNCTION get_ticket_resolution_stats()
RETURNS TABLE (
  ai_resolved_count BIGINT,
  human_resolved_count BIGINT,
  mixed_count BIGINT,
  total_closed BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE ts.status = 'ai_resolved')::BIGINT as ai_resolved_count,
    COUNT(*) FILTER (WHERE ts.status = 'closed' AND ts.status != 'ai_resolved')::BIGINT as human_resolved_count,
    COUNT(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM ticket_statuses ts2 
      WHERE ts2.ticket_id = ts.ticket_id 
      AND ts2.status = 'needs_human_assistance'
    ) AND ts.status = 'closed')::BIGINT as mixed_count,
    COUNT(*) FILTER (WHERE ts.status = 'closed')::BIGINT as total_closed
  FROM ticket_statuses ts
  WHERE ts.status IN ('closed', 'ai_resolved');
END;
$$ LANGUAGE plpgsql;

