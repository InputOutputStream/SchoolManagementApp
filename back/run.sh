#!/usr/bin/env bash

# ==============================
# Simple Flask Runner
# ==============================

# Set environment variables
export FLASK_APP=main.py
export FLASK_ENV=development
export DATABASE_URL="postgresql://principal:cron@localhost:5432/school"
export SECRET_KEY="dev-secret-key-change-in-production"
export JWT_SECRET_KEY="jwt-secret-change-in-production"

echo "🚀 Starting School Management System..."
echo "📍 Server: http://localhost:5000"
echo "👤 Admin: admin@ecole.com / admin123"
echo

# Run the application
flask run --host=0.0.0.0 --port=5000 --debug