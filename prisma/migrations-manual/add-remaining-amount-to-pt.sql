-- Migration: Add remainingAmount column to PT table
-- Date: 2025-12-05

-- Add remainingAmount column with default value 0
ALTER TABLE PT ADD COLUMN remainingAmount REAL NOT NULL DEFAULT 0;
