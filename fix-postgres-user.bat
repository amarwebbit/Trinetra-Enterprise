@echo off
echo ==========================================
echo EXAMINAI - Fix PostgreSQL User
echo ==========================================

echo [1] Resetting password using examin_admin...
docker exec -it exam_postgres_primary psql -U examin_admin -d exam_engine -c "ALTER USER examin_admin WITH PASSWORD 'admin123';"

echo [2] Updating .env...
(
echo DB_USER=examin_admin
echo DB_PASSWORD=admin123
echo DB_DATABASE=exam_engine
echo DATABASE_URL="postgresql://examin_admin:admin123@localhost:5432/exam_engine?schema=public"
) > .env

echo [3] Updating prisma.config.ts...
(
echo import { defineConfig } from 'prisma/config'
echo.
echo export default defineConfig({
echo   schema: 'prisma/schema.prisma',
echo   datasource: {
echo     url: 'postgresql://examin_admin:admin123@localhost:5432/exam_engine?schema=public',
echo   },
echo })
) > prisma.config.ts

echo [4] Testing connection...
docker exec exam_postgres_primary psql -U examin_admin -d exam_engine -c "SELECT 1;"
if errorlevel 1 (
    echo [ERROR] Connection failed!
    pause
    exit /b 1
)

echo [5] Running Prisma push...
npx prisma db push

echo ==========================================
echo [OK] Complete!
echo ==========================================
pause