-- Migration: Add Business Settings Module
-- Run this SQL in your Supabase SQL Editor

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

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_business_settings_owner_user_id ON business_settings(owner_user_id);

-- Enable Row Level Security
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access on business_settings (authenticated users can read their own)
CREATE POLICY "Allow users to read their own business settings"
  ON business_settings FOR SELECT
  USING (auth.uid() = owner_user_id);

-- Allow users to insert their own business settings
CREATE POLICY "Allow users to insert their own business settings"
  ON business_settings FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

-- Allow users to update their own business settings
CREATE POLICY "Allow users to update their own business settings"
  ON business_settings FOR UPDATE
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_business_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_business_settings_updated_at
  BEFORE UPDATE ON business_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_business_settings_updated_at();

