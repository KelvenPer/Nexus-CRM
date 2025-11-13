-- Create main database (run from postgres or another DB)
-- Adjust OWNER as needed
-- Note: CREATE DATABASE does not support IF NOT EXISTS
-- Run once in pgAdmin or psql

CREATE DATABASE nexus_crm_db
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    CONNECTION LIMIT = -1;

