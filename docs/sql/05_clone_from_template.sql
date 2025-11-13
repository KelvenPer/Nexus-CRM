-- Function: clone all tables in template_schema into a new tenant schema
-- Usage: SELECT tenant_admin.clone_from_template('tenant_nexus_hq');

CREATE OR REPLACE FUNCTION tenant_admin.clone_from_template(new_schema TEXT)
RETURNS VOID AS $$
DECLARE
    tbl RECORD;
    idx RECORD;
    src_schema TEXT := 'template_schema';
    idxname TEXT;
    idxdef TEXT;
BEGIN
    -- Create schema if missing
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', new_schema);

    -- Clone tables (structure only)
    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = src_schema
        ORDER BY tablename
    LOOP
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I.%I (LIKE %I.%I INCLUDING ALL)',
            new_schema, tbl.tablename, src_schema, tbl.tablename
        );
    END LOOP;

    -- Recreate indexes in the new schema (names are prefixed with schema)
    FOR idx IN
        SELECT tab.relname AS tablename, i.indexname, i.indexdef
        FROM pg_indexes i
        JOIN pg_class tab ON tab.relname = split_part(i.indexdef, ' ON ', 2)::TEXT
        WHERE i.schemaname = src_schema
    LOOP
        idxname := format('%s_%s', new_schema, idx.indexname);
        idxdef := replace(idx.indexdef, ' ON ' || src_schema || '.', ' ON ' || new_schema || '.');
        idxdef := replace(idxdef, ' INDEX ' || idx.indexname, ' INDEX ' || idxname);
        -- create index if it doesn't exist
        PERFORM 1 FROM pg_class WHERE relname = idxname;
        IF NOT FOUND THEN
            EXECUTE idxdef;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
