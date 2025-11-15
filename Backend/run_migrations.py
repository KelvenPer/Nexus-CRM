import os
from alembic.config import Config
from alembic import command

def main():
    # Get the absolute path to the alembic.ini file
    project_root = os.path.dirname(os.path.abspath(__file__))
    ini_path = os.path.join(project_root, 'alembic.ini')

    print(f"Using Alembic config: {ini_path}")

    # Create an Alembic Config object
    alembic_cfg = Config(ini_path)

    # Set the python path to include the project root, so alembic can find the env.py
    # This is normally handled by the shell script
    if 'PYTHONPATH' not in os.environ:
        os.environ['PYTHONPATH'] = project_root

    print("Running 'alembic upgrade head'...")
    # Run the 'upgrade' command
    command.upgrade(alembic_cfg, "head")
    print("Migrations applied successfully.")

if __name__ == "__main__":
    main()
