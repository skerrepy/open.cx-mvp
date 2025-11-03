-- Migration: Add language field to tickets table
-- Run this SQL in your Supabase SQL Editor

-- Add language column to tickets table
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS language TEXT;

-- Create index for language filtering
CREATE INDEX IF NOT EXISTS idx_tickets_language ON tickets(language);

