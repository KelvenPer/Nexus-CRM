
import os
import re
import asyncio
from urllib.parse import urlparse
import asyncpg

def get_db_config():
    """Parses the DATABASE_URL from the .env file."""
    try:
        with open('.env', 'r') as f:
            for line in f:
                if line.startswith('DATABASE_URL'):
                    # Strip potential quotes and whitespace
                    return line.strip().split('=', 1)[1].strip().strip('"\'')
    except FileNotFoundError:
        print("Error: .env file not found.")
        return None
    return None

async def execute_sql_file(conn_params, sql_file):
    """Connects to the DB and executes a given SQL file."""
    conn = None
    try:
        conn = await asyncpg.connect(**conn_params)
        with open(sql_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
            print(f"Executing script: {sql_file}...")
            await conn.execute(sql_content)
        print(f"Successfully executed {sql_file}")
    except asyncpg.exceptions.DuplicateDatabaseError:
        print(f"Database from {sql_file} already exists, continuing...")
        return True # Not a failure
    except asyncpg.PostgresError as e:
        print(f"Error executing {sql_file}: {e}")
        return False
    finally:
        if conn:
            await conn.close()
    return True

async def main():
    """Main async function to run the DB setup."""
    db_url = get_db_config()
    if not db_url:
        return

    # asyncpg uses 'postgres://' or 'postgresql://'
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    
    parsed_url = urlparse(db_url)
    db_to_create = parsed_url.path.lstrip('/')

    # --- Step 1: Connect to the default 'postgres' DB to create our new DB ---
    print("--- Step 1: Creating database ---")
    conn_params_admin = {
        "host": parsed_url.hostname,
        "port": parsed_url.port,
        "user": parsed_url.username,
        "password": parsed_url.password,
        "database": "postgres"
    }
    
    create_script_path = os.path.join('..', 'docs', 'sql', '00_create_database.sql')
    
    # Ensure the script creates the correct DB from the .env file
    try:
        with open(create_script_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: Cannot find {create_script_path}")
        return

    # Use regex to safely replace the DB name
    # The (") is added to handle kebab-case names
    updated_content = re.sub(r'CREATE DATABASE\s+.*?\s+WITH', f'CREATE DATABASE "{db_to_create}" WITH', content, flags=re.IGNORECASE)
    
    # Create a temporary file to execute
    temp_create_script = "temp_create_db.sql"
    with open(temp_create_script, 'w', encoding='utf-8') as f:
        f.write(updated_content)

    if not await execute_sql_file(conn_params_admin, temp_create_script):
        print("Failed to create database. Aborting.")
        os.remove(temp_create_script)
        return
    os.remove(temp_create_script)

    # --- Step 2: Connect to the new DB to run other scripts ---
    print("\n--- Step 2: Populating database schema and tables ---")
    conn_params_new_db = conn_params_admin.copy()
    conn_params_new_db["database"] = db_to_create

    sql_scripts = [
        '01_enable_extensions.sql',
        '02_create_schemas.sql',
        '03_tenant_admin_tables.sql',
        '04_template_schema_tables.sql',
        '05_clone_from_template.sql',
        'base_tables.sql'
    ]

    for script in sql_scripts:
        script_path = os.path.join('..', 'docs', 'sql', script)
        if not await execute_sql_file(conn_params_new_db, script_path):
            print(f"Failed during execution of {script}. Aborting.")
            return
            
    print("\nDatabase setup complete!")

if __name__ == "__main__":
    # Set working directory to the script's location
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    asyncio.run(main())

