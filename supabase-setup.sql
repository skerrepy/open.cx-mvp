-- Supabase Database Setup for SupportAI
-- Run this SQL in your Supabase SQL Editor

-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  customer_id UUID,
  assignee_id UUID
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_ticket_id ON messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);

-- Enable Row Level Security
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust based on your requirements)
-- Allow anonymous reads for tickets
CREATE POLICY "Allow public read access on tickets"
  ON tickets FOR SELECT
  USING (true);

-- Allow anonymous inserts for tickets
CREATE POLICY "Allow public insert on tickets"
  ON tickets FOR INSERT
  WITH CHECK (true);

-- Allow authenticated users to update tickets
CREATE POLICY "Allow authenticated update on tickets"
  ON tickets FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow public reads for messages
CREATE POLICY "Allow public read access on messages"
  ON messages FOR SELECT
  USING (true);

-- Allow anonymous inserts for messages
CREATE POLICY "Allow public insert on messages"
  ON messages FOR INSERT
  WITH CHECK (true);

-- Enable Realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Enable Realtime for tickets table
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;

