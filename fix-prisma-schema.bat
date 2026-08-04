@echo off
echo ==========================================
echo Fix Prisma Schema
echo ==========================================

echo [1] Updating .env...
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

echo [2] Updating prisma/schema.prisma datasource...
:: This updates the schema file to include url = env("DATABASE_URL")
:: You need to manually edit or use the file above

echo [3] Generating Prisma Client...
npx prisma generate

echo [4] Running Prisma push...
npx prisma db push

pause