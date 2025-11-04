-- Migration: Add summary field to tickets table
-- Run this SQL in your Supabase SQL Editor

-- Add summary column to tickets table
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS summary TEXT;

-- Create index for summary searches (optional, if you plan to search summaries)
CREATE INDEX IF NOT EXISTS idx_tickets_summary ON tickets(summary) WHERE summary IS NOT NULL;

