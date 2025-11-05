-- ============================================================================
-- Supabase Database Setup for SupportAI
-- Complete one-shot initialization script
-- Run this SQL in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. CORE TABLES
-- ============================================================================

-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  customer_id UUID,
  assignee_id UUID,
  -- Additional columns from migrations
  summary TEXT,
  language TEXT,
  tags TEXT[],
  customer_first_name TEXT,
  customer_last_name TEXT,
  customer_email TEXT,
  ai_token_usage INTEGER DEFAULT 0
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. STATUS TRACKING TABLE
-- ============================================================================

-- Create ticket_statuses table for status history
CREATE TABLE IF NOT EXISTS ticket_statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 3. REVIEWS AND AUDIT LOGS
-- ============================================================================

-- Create ticket_reviews table for admin reviews and customer satisfaction
CREATE TABLE IF NOT EXISTS ticket_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  reviewer_type TEXT NOT NULL CHECK (reviewer_type IN ('admin', 'customer')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  reviewer_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(ticket_id, reviewer_type)
);

-- Create audit_logs table for tracking all interactions
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('ai', 'agent', 'system', 'customer')),
  actor_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 4. BUSINESS SETTINGS TABLE
-- ============================================================================

-- Create business_settings table
CREATE TABLE IF NOT EXISTS business_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID NOT NULL,
  business_name TEXT,
  primary_language TEXT DEFAULT 'English',
  ai_tone TEXT DEFAULT 'friendly',
  business_context TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(owner_user_id)
);

-- ============================================================================
-- 5. PRODUCT INSIGHTS TABLE
-- ============================================================================

-- Create product_insights table
CREATE TABLE IF NOT EXISTS product_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  summary TEXT NOT NULL,
  recurring_issues TEXT[] NOT NULL,
  requested_features TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 6. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Tickets indexes
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_summary ON tickets(summary) WHERE summary IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_language ON tickets(language);
CREATE INDEX IF NOT EXISTS idx_tickets_customer_email ON tickets(customer_email) WHERE customer_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_ai_token_usage ON tickets(ai_token_usage) WHERE ai_token_usage > 0;
CREATE INDEX IF NOT EXISTS idx_tickets_tags ON tickets USING GIN(tags);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_ticket_id ON messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Ticket statuses indexes
CREATE INDEX IF NOT EXISTS idx_ticket_statuses_ticket_id ON ticket_statuses(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_statuses_created_at ON ticket_statuses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_statuses_ticket_created ON ticket_statuses(ticket_id, created_at DESC);

-- Ticket reviews indexes
CREATE INDEX IF NOT EXISTS idx_ticket_reviews_ticket_id ON ticket_reviews(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_reviews_reviewer_type ON ticket_reviews(reviewer_type);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_ticket_id ON audit_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Business settings indexes
CREATE INDEX IF NOT EXISTS idx_business_settings_owner_user_id ON business_settings(owner_user_id);

-- Product insights indexes
CREATE INDEX IF NOT EXISTS idx_product_insights_created_at ON product_insights(created_at DESC);

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_insights ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 8. RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public read access on tickets" ON tickets;
DROP POLICY IF EXISTS "Allow public insert on tickets" ON tickets;
DROP POLICY IF EXISTS "Allow authenticated update on tickets" ON tickets;

DROP POLICY IF EXISTS "Allow public read access on messages" ON messages;
DROP POLICY IF EXISTS "Allow public insert on messages" ON messages;

DROP POLICY IF EXISTS "Allow public read access on ticket_statuses" ON ticket_statuses;
DROP POLICY IF EXISTS "Allow public insert on ticket_statuses" ON ticket_statuses;

DROP POLICY IF EXISTS "Allow public read access on ticket_reviews" ON ticket_reviews;
DROP POLICY IF EXISTS "Allow authenticated insert on ticket_reviews" ON ticket_reviews;
DROP POLICY IF EXISTS "Allow authenticated update on ticket_reviews" ON ticket_reviews;

DROP POLICY IF EXISTS "Allow public read access on audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "Allow authenticated insert on audit_logs" ON audit_logs;

DROP POLICY IF EXISTS "Allow users to read their own business settings" ON business_settings;
DROP POLICY IF EXISTS "Allow users to insert their own business settings" ON business_settings;
DROP POLICY IF EXISTS "Allow users to update their own business settings" ON business_settings;

DROP POLICY IF EXISTS "Allow public read access on product_insights" ON product_insights;
DROP POLICY IF EXISTS "Allow public insert on product_insights" ON product_insights;

-- Tickets policies
CREATE POLICY "Allow public read access on tickets"
  ON tickets FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on tickets"
  ON tickets FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on tickets"
  ON tickets FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Messages policies
CREATE POLICY "Allow public read access on messages"
  ON messages FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on messages"
  ON messages FOR INSERT
  WITH CHECK (true);

-- Ticket statuses policies
CREATE POLICY "Allow public read access on ticket_statuses"
  ON ticket_statuses FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on ticket_statuses"
  ON ticket_statuses FOR INSERT
  WITH CHECK (true);

-- Ticket reviews policies
CREATE POLICY "Allow public read access on ticket_reviews"
  ON ticket_reviews FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated insert on ticket_reviews"
  ON ticket_reviews FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on ticket_reviews"
  ON ticket_reviews FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Audit logs policies
CREATE POLICY "Allow public read access on audit_logs"
  ON audit_logs FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated insert on audit_logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- Business settings policies
CREATE POLICY "Allow users to read their own business settings"
  ON business_settings FOR SELECT
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Allow users to insert their own business settings"
  ON business_settings FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Allow users to update their own business settings"
  ON business_settings FOR UPDATE
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

-- Product insights policies
CREATE POLICY "Allow public read access on product_insights"
  ON product_insights FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on product_insights"
  ON product_insights FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 9. FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to get the latest status for a ticket
CREATE OR REPLACE FUNCTION get_latest_ticket_status(ticket_uuid UUID)
RETURNS TEXT AS $$
  SELECT status
  FROM ticket_statuses
  WHERE ticket_id = ticket_uuid
  ORDER BY created_at DESC
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Function to increment token usage atomically
CREATE OR REPLACE FUNCTION increment_token_usage(ticket_id UUID, tokens INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE tickets
  SET ai_token_usage = COALESCE(ai_token_usage, 0) + tokens
  WHERE id = ticket_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get ticket resolution stats
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

-- Function to update business_settings updated_at timestamp
CREATE OR REPLACE FUNCTION update_business_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at for business_settings
DROP TRIGGER IF EXISTS update_business_settings_updated_at ON business_settings;
CREATE TRIGGER update_business_settings_updated_at
  BEFORE UPDATE ON business_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_business_settings_updated_at();

-- ============================================================================
-- 10. REALTIME SUBSCRIPTIONS
-- ============================================================================

-- Enable Realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_statuses;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;

-- ============================================================================
-- 11. GRANT PERMISSIONS TO ROLES
-- ============================================================================

-- Grant usage on public schema to all roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant all necessary permissions on tables to service_role (for admin operations)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Grant select/insert/update permissions to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public 
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public 
  GRANT SELECT, INSERT, UPDATE ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public 
  GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public 
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public 
  GRANT ALL ON FUNCTIONS TO service_role;

-- ============================================================================
-- 12. DATA MIGRATION (if needed)
-- ============================================================================

-- Migrate existing status data to status log (only if ticket_statuses is empty)
-- This prevents duplicate entries if the script is run multiple times
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM ticket_statuses LIMIT 1) THEN
    INSERT INTO ticket_statuses (ticket_id, status, created_at)
    SELECT id, status, created_at
    FROM tickets
    WHERE status IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- Setup Complete!
-- ============================================================================
