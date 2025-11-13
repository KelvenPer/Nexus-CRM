-- Enable required extensions in nexus_crm_db
-- Run inside nexus_crm_db

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- provides gen_random_uuid()
-- Optional alternative if you prefer: uuid-ossp (uuid_generate_v4())
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

