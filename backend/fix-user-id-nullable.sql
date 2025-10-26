-- Fix user_id to allow NULL for guest checkout
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;
