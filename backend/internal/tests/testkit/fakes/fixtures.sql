-- Test fixtures for comment tests
-- These fixtures have a _comment_test prefix to avoid conflicts with other tests

-- Test Users for comment tests
INSERT INTO users (id, name, username, phone_number) VALUES
('00000000-0000-0000-0000-000000000101', 'Comment Test User 1', 'comment_test_user1', '+10000000101'),
('00000000-0000-0000-0000-000000000102', 'Comment Test User 2', 'comment_test_user2', '+10000000102'),
('00000000-0000-0000-0000-000000000103', 'Comment Test User 3', 'comment_test_user3', '+10000000103'),
('00000000-0000-0000-0000-000000000104', 'Non Member User', 'comment_test_nonmember', '+10000000104')
ON CONFLICT (id) DO NOTHING;

-- Test Trips for comment tests
INSERT INTO trips (id, name, budget_min, budget_max) VALUES
('00000000-0000-0000-0000-000000000201', 'Comment Test Trip 1', 1000, 5000),
('00000000-0000-0000-0000-000000000202', 'Comment Test Trip 2', 2000, 6000)
ON CONFLICT (id) DO NOTHING;

-- Test Memberships for comment tests
-- User 1 and User 2 are members of Trip 1
-- User 3 is member of Trip 2
-- User 4 is not a member of any trip
INSERT INTO memberships (user_id, trip_id, is_admin, budget_min, budget_max) VALUES
('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000201', true, 1000, 5000),
('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000201', false, 1500, 4000),
('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000202', true, 2000, 6000)
ON CONFLICT (user_id, trip_id) DO NOTHING;

-- Profile pictures for comment and membership tests
INSERT INTO images (image_id, size, file_key, status) VALUES
('00000000-0000-0000-0000-000000001001', 'small', 'fixtures/comment_test_user1_small.jpg', 'confirmed'),
('00000000-0000-0000-0000-000000001002', 'small', 'fixtures/comment_test_user2_small.jpg', 'confirmed')
ON CONFLICT (image_id, size) DO NOTHING;

UPDATE users
SET profile_picture = '00000000-0000-0000-0000-000000001001'
WHERE id = '00000000-0000-0000-0000-000000000101';

UPDATE users
SET profile_picture = '00000000-0000-0000-0000-000000001002'
WHERE id = '00000000-0000-0000-0000-000000000102';

-- Trip cover image test fixtures
INSERT INTO images (image_id, size, file_key, status) VALUES
('00000000-0000-0000-0000-000000002001', 'medium', 'test-images/trip_cover1.jpg', 'confirmed'),
('00000000-0000-0000-0000-000000002002', 'medium', 'test-images/trip_cover2.jpg', 'confirmed')
ON CONFLICT (image_id, size) DO NOTHING;

-- Update trips with cover images
UPDATE trips
SET cover_image = '00000000-0000-0000-0000-000000002001'
WHERE id = '00000000-0000-0000-0000-000000000201';

UPDATE trips
SET cover_image = '00000000-0000-0000-0000-000000002002'
WHERE id = '00000000-0000-0000-0000-000000000202';
