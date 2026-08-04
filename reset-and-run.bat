@echo off
echo ==========================================
echo EXAMINAI - Reset and Run
echo ==========================================

cd /d C:\Users\amart\OneDrive\ONEDRIVE COPY\Desktop\Enterprise

echo [1] Dropping and recreating schema...
docker exec exam_postgres_primary psql -U examin_admin -d exam_engine -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

echo [2] Running migration 1...
docker cp migrations\01_initial_schema.sql exam_postgres_primary:/tmp/
docker exec exam_postgres_primary psql -U examin_admin -d exam_engine -f /tmp/01_initial_schema.sql

echo [3] Running migration 2 (RLS Policies)...
docker cp migrations\02_rls_policies.sql exam_postgres_primary:/tmp/
docker exec exam_postgres_primary psql -U examin_admin -d exam_engine -f /tmp/02_rls_policies.sql

echo [4] Running migration 3 (Seed Data)...
docker cp migrations\03_seed_data.sql exam_postgres_primary:/tmp/
docker exec exam_postgres_primary psql -U examin_admin -d exam_engine -f /tmp/03_seed_data.sql

echo [5] Verification...
echo Tables:
docker exec exam_postgres_primary psql -U examin_admin -d exam_engine -c "\dt" | findstr public | find /c "public"

echo Modules:
docker exec exam_postgres_primary psql -U examin_admin -d exam_engine -c "SELECT code, name FROM modules;"

echo Tenants:
docker exec exam_postgres_primary psql -U examin_admin -d exam_engine -c "SELECT name, slug FROM tenants;"

echo [6] Prisma setup...
npx prisma generate
npx prisma db push

echo ==========================================
echo [OK] Complete!
echo ==========================================
pause