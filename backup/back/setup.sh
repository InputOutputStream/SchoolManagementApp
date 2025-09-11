#!/usr/bin/env bash
set -e

# ==============================
# Flask + PostgreSQL Setup Script (Fixed)
# ==============================

# ---- CONFIG ----
PYTHON_VERSION="python3"
VENV_DIR=".venv"
DB_NAME="school"
DB_USER="principal"
DB_PASSWORD="cron"
DB_HOST="localhost"
DB_PORT="5432"

DEFAULT_SECRET_KEY="dev-secret-key-change-in-production"
DEFAULT_JWT_SECRET="jwt-secret-change-in-production"

echo "[INFO] Starting Flask + PostgreSQL setup..."

# ---- CHECK PYTHON ----
if ! command -v $PYTHON_VERSION &> /dev/null; then
    echo "[ERROR] $PYTHON_VERSION is not installed. Please install Python 3."
    exit 1
fi

# ---- UPGRADE PIP ----
echo "[INFO] Upgrading pip..."
pip install --upgrade pip

# ---- INSTALL PYTHON DEPENDENCIES ----
echo "[INFO] Installing Python dependencies..."
pip install -r requirements.txt

# ---- CHECK POSTGRES ----
if ! command -v psql &> /dev/null; then
    echo "[WARNING] PostgreSQL client (psql) not found. Please install PostgreSQL."
    echo "          On Ubuntu/Debian: sudo apt install postgresql postgresql-contrib"
    echo "          On Fedora/RHEL:   sudo dnf install postgresql-server"
    echo "          On Mac (brew):    brew install postgresql"
    exit 1
fi

# ---- SETUP DATABASE WITH PROPER PERMISSIONS ----
echo "[INFO] Setting up PostgreSQL database..."

# Check if database exists
DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';" 2>/dev/null | grep -q 1 && echo "true" || echo "false")

if [ "$DB_EXISTS" = "false" ]; then
    echo "[INFO] Creating PostgreSQL user and database with proper permissions..."
    
    # Create a comprehensive SQL script
    cat > /tmp/setup_complete.sql << EOF
-- Create user if not exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
        CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    END IF;
END
\$\$;

-- Create database
CREATE DATABASE $DB_NAME OWNER $DB_USER;

-- Connect to the new database
\c $DB_NAME

-- Grant comprehensive privileges
GRANT ALL PRIVILEGES ON SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO $DB_USER;

-- Grant privileges on future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO $DB_USER;

-- Ensure user can create objects
GRANT CREATE ON SCHEMA public TO $DB_USER;
GRANT USAGE ON SCHEMA public TO $DB_USER;

-- Make user superuser for this database (alternative approach)
-- ALTER USER $DB_USER CREATEDB;
EOF

    # Execute as postgres user
    if sudo -u postgres psql -f /tmp/setup_complete.sql; then
        echo "[INFO] Database and user created successfully!"
    else
        echo "[ERROR] Failed to create database. Check PostgreSQL installation and permissions."
        rm -f /tmp/setup_complete.sql
        exit 1
    fi
    
    # Clean up
    rm -f /tmp/setup_complete.sql
else
    echo "[INFO] Database '$DB_NAME' already exists."
    
    # Still ensure proper permissions
    echo "[INFO] Ensuring proper database permissions..."
    cat > /tmp/fix_permissions.sql << EOF
\c $DB_NAME
GRANT ALL PRIVILEGES ON SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
GRANT CREATE ON SCHEMA public TO $DB_USER;
EOF
    
    sudo -u postgres psql -f /tmp/fix_permissions.sql
    rm -f /tmp/fix_permissions.sql
fi

# ---- TEST DATABASE CONNECTION ----
echo "[INFO] Testing database connection..."
export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

if python3 -c "
import psycopg2
try:
    conn = psycopg2.connect('$DATABASE_URL')
    conn.close()
    print('✓ Database connection successful')
except Exception as e:
    print(f'✗ Database connection failed: {e}')
    exit(1)
"; then
    echo "[INFO] Database connection verified!"
else
    echo "[ERROR] Database connection test failed!"
    exit 1
fi

# ---- EXPORT ENV VARIABLES ----
export SECRET_KEY=${SECRET_KEY:-$DEFAULT_SECRET_KEY}
export JWT_SECRET_KEY=${JWT_SECRET_KEY:-$DEFAULT_JWT_SECRET}
export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

echo "[INFO] Environment variables configured:"
echo "    SECRET_KEY=$SECRET_KEY"
echo "    JWT_SECRET_KEY=$JWT_SECRET_KEY"
echo "    DATABASE_URL=$DATABASE_URL"

# ---- INITIALIZE DATABASE (Flask-Migrate) ----
echo "[INFO] Setting up Flask migrations..."
export FLASK_APP=main.py

if [ ! -d "migrations" ]; then
    echo "[INFO] Initializing database migrations..."
    flask db init
    flask db migrate -m "Initial migration"
    flask db upgrade
else
    echo "[INFO] Applying database migrations..."
    flask db upgrade
fi

# ---- CREATE ADMIN USER ----
echo "[INFO] Creating admin user..."
flask create-admin || echo "[INFO] Admin user might already exist"

# ---- DONE ----
echo
echo "[SUCCESS] Setup complete! 🎉"
echo
echo "To run the app:"
echo "    ./run.sh"
echo
echo "Admin credentials:"
echo "    Email: admin@ecole.com"
echo "    Password: admin123"
echo