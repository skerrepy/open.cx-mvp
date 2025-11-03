-- Migration: Add ticket status log table
-- Run this SQL in your Supabase SQL Editor

-- Create ticket_statuses table for status history
CREATE TABLE IF NOT EXISTS ticket_statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ticket_statuses_ticket_id ON ticket_statuses(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_statuses_created_at ON ticket_statuses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_statuses_ticket_created ON ticket_statuses(ticket_id, created_at DESC);

-- Migrate existing status data to status log
INSERT INTO ticket_statuses (ticket_id, status, created_at)
SELECT id, status, created_at
FROM tickets
WHERE status IS NOT NULL;

-- Create a function to get the latest status for a ticket
CREATE OR REPLACE FUNCTION get_latest_ticket_status(ticket_uuid UUID)
RETURNS TEXT AS $$
  SELECT status
  FROM ticket_statuses
  WHERE ticket_id = ticket_uuid
  ORDER BY created_at DESC
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Enable Row Level Security
ALTER TABLE ticket_statuses ENABLE ROW LEVEL SECURITY;

-- Allow public read access on ticket_statuses
CREATE POLICY "Allow public read access on ticket_statuses"
  ON ticket_statuses FOR SELECT
  USING (true);

-- Allow public insert on ticket_statuses
CREATE POLICY "Allow public insert on ticket_statuses"
  ON ticket_statuses FOR INSERT
  WITH CHECK (true);

-- Enable Realtime for ticket_statuses table
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_statuses;

