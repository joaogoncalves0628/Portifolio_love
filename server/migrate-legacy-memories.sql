ALTER TABLE memories
  ADD COLUMN content_type ENUM('photo', 'carousel', 'text') NOT NULL DEFAULT 'photo' AFTER id,
  ADD COLUMN image_urls JSON NULL AFTER memory_time,
  ADD COLUMN is_favorite BOOLEAN NOT NULL DEFAULT FALSE AFTER tags;

UPDATE memories
SET image_urls = CASE
  WHEN image_url IS NULL OR TRIM(image_url) = '' THEN JSON_ARRAY()
  ELSE JSON_ARRAY(JSON_OBJECT('type', 'image', 'uri', image_url))
END
WHERE image_urls IS NULL;

ALTER TABLE memories
  MODIFY COLUMN image_urls JSON NOT NULL;
