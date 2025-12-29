-- Initial database setup
-- This file is executed when PostgreSQL container is first created

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "postgis"; -- Uncomment if using PostGIS for geolocation

-- Set timezone
SET timezone = 'Europe/Moscow';

-- Note: Actual tables will be created by migrations
-- This file is for initial setup only

