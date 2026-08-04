@echo off
echo ==========================================
echo FIX SEED DATA
echo ==========================================

cd /d C:\Users\amart\OneDrive\ONEDRIVE COPY\Desktop\Enterprise

echo [1] Running fixed seed data...
docker cp migrations\03_seed_data_fixed.sql exam_postgres_primary:/tmp/
docker exec exam_postgres_primary psql -U examin_admin -d exam_engine -f /tmp/03_seed_data_fixed.sql

echo [2] Checking modules...
docker exec exam_postgres_primary psql -U examin_admin -d exam_engine -c "SELECT code, name FROM modules;"

echo [3] Running Prisma push...
npx prisma db push

echo [4] Creating admin user...
docker exec -i exam_postgres_primary psql -U examin_admin -d exam_engine << EOF
INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, email_verified, is_active)
VALUES (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    'admin@examin.ai',
    '\$2a\$10\$XQ6Z5FqZpM5NQeZG5Z5QeOWP5Z5QeOWP5Z5QeO',
    'Super Admin',
    'super_admin',
    true,
    true
);
EOF

echo ==========================================
echo [OK] Complete!
echo ==========================================
pause