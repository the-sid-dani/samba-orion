-- Fix chat_message.parts column type
-- Problem: Column is json[] (PostgreSQL array of JSON) but UIMessage.parts is already an array
-- This causes double-wrapping: [[{type: "text"}]] instead of [{type: "text"}]
-- Solution: Convert to single json column, unwrapping the PostgreSQL array

BEGIN;

-- 1. Add a temporary column for the converted data
ALTER TABLE chat_message ADD COLUMN parts_new json;

-- 2. Convert data: Extract first element from the PostgreSQL array
-- If parts is a json[] with one element, that element is the actual parts array
UPDATE chat_message
SET parts_new = (
  CASE
    -- Handle json[] (PostgreSQL array of JSON) - extract first element
    WHEN parts IS NOT NULL AND array_length(parts, 1) > 0 THEN parts[1]
    -- Handle empty array
    WHEN parts IS NOT NULL AND array_length(parts, 1) = 0 THEN '[]'::json
    -- Handle null
    ELSE '[]'::json
  END
);

-- 3. Drop the old column
ALTER TABLE chat_message DROP COLUMN parts;

-- 4. Rename new column
ALTER TABLE chat_message RENAME COLUMN parts_new TO parts;

-- 5. Add NOT NULL constraint
ALTER TABLE chat_message ALTER COLUMN parts SET NOT NULL;

COMMIT;

