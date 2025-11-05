-- Migration: Add Product Insights Module
-- Run this SQL in your Supabase SQL Editor

-- 1. Add tags column to tickets table
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- 2. Create product_insights table
CREATE TABLE IF NOT EXISTS product_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  summary TEXT NOT NULL,
  recurring_issues TEXT[] NOT NULL,
  requested_features TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_product_insights_created_at ON product_insights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_tags ON tickets USING GIN(tags);

-- 4. Enable Row Level Security
ALTER TABLE product_insights ENABLE ROW LEVEL SECURITY;

-- 5. Allow public read access on product_insights
CREATE POLICY "Allow public read access on product_insights"
  ON product_insights FOR SELECT
  USING (true);

-- 6. Allow public insert on product_insights
CREATE POLICY "Allow public insert on product_insights"
  ON product_insights FOR INSERT
  WITH CHECK (true);

