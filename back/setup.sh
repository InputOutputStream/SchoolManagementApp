#!/usr/bin/env bash
set -e

# ==============================
# Flask + PostgreSQL Setup Script
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

# ---- CREATE VIRTUAL ENV ----
# if [ ! -d "$VENV_DIR" ]; then
#     echo "[INFO] Creating virtual environment ($VENV_DIR)..."
#     $PYTHON_VERSION -m venv $VENV_DIR
# else
#     echo "[INFO] Virtual environment already exists."
# fi

# ---- ACTIVATE VIRTUAL ENV ----
# echo "[INFO] Activating virtual environment..."
# shellcheck disable=SC1091
# source "$VENV_DIR/bin/activate"

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
else
    echo "[INFO] PostgreSQL client found. Checking database..."
    if ! psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';" | grep -q 1; then
        echo "[INFO] Creating PostgreSQL user and database..."
        # Create user and DB
        psql -U postgres -d postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" || true
        psql -U postgres -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" || true

        # Grant privileges
        psql -U postgres -d $DB_NAME -c "GRANT ALL PRIVILEGES ON SCHEMA public TO $DB_USER;" || true
        psql -U postgres -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;" || true
        psql -U postgres -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;" || true
  
    else
        echo "[INFO] Database $DB_NAME already exists. Skipping creation."
    fi
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
if [ ! -d "migrations" ]; then
    echo "[INFO] Initializing database migrations..."
    export FLASK_APP=app
    flask db init
    flask db migrate -m "Initial migration"
    flask db upgrade
else
    echo "[INFO] Database migrations already initialized. Applying latest upgrade..."
    export FLASK_APP=app
    flask db upgrade
fi

# ---- DONE ----
echo
echo "[INFO] Setup complete. To run the app:"
echo
#echo "    source $VENV_DIR/bin/activate"
echo "    export FLASK_APP=app"
echo "    flask run"
echo
