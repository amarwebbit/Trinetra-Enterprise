@echo off
echo ==========================================
echo EXAMINAI - CLEAN START
echo ==========================================

cd /d C:\Users\amart\OneDrive\ONEDRIVE COPY\Desktop\Enterprise

echo [1] Deleting old .env...
del .env 2>nul

echo [2] Creating clean .env...
(
echo DB_USER=examin_admin
echo DB_PASSWORD=admin123
echo DB_DATABASE=exam_engine
echo DATABASE_URL=postgresql://examin_admin:admin123@localhost:5435/exam_engine?schema=public
echo JWT_SECRET=8767876ygfghgffghtr7y6tfv
echo NEXTAUTH_URL=http://localhost:3000
echo MINIO_USER=minio_admin
echo MINIO_PASSWORD=minio_password123
) > .env

echo [3] Verifying .env:
type .env

echo [4] Stopping and removing containers...
docker-compose down -v

echo [5] Starting fresh containers...
docker-compose up -d

echo [6] Waiting for PostgreSQL container to start...
ping -n 12 127.0.0.1 >nul

echo [7] Pre-initializing GoTrue Auth schema...
docker exec exam_postgres_primary psql -U examin_admin -d exam_engine -c "CREATE SCHEMA IF NOT EXISTS auth;"
if errorlevel 1 (
    echo [ERROR] Failed to pre-initialize schema!
    pause
    exit /b 1
)

echo [8] Registering custom type conversion operators...
docker exec -i exam_postgres_primary psql -U examin_admin -d exam_engine < scratch\fix_operator.sql
if errorlevel 1 (
    echo [ERROR] Failed to register custom comparison operator!
    pause
    exit /b 1
)

echo [9] Waiting for GoTrue service migrations to finish...
ping -n 8 127.0.0.1 >nul

echo [10] Prisma client generation and DB push...
npx prisma generate
npx prisma db push

echo [11] Provisioning Super Admin account...
node scratch\seed_admin.js
if errorlevel 1 (
    echo [ERROR] Seeding admin user failed!
    pause
    exit /b 1
)

echo.
echo ==========================================
echo [OK] SETUP COMPLETE!
echo ==========================================
echo.
echo Database password: admin123
echo Admin login: admin@examin.ai
echo Admin password: Admin@123
echo.
pause