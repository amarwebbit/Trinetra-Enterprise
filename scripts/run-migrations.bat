 
@echo off
echo ==========================================
echo Running Database Migrations
echo ==========================================

cd /d C:\Users\amart\OneDrive\ONEDRIVE COPY\Desktop\Enterprise

echo.
echo Migrations found:
dir migrations\*.sql

echo.
echo Running migrations...

for %%f in (migrations\*.sql) do (
    echo.
    echo [RUNNING] %%~nxf
    type "%%f" | docker exec -i exam_postgres_primary psql -U examin_admin -d exam_engine
    if errorlevel 1 (
        echo [ERROR] Failed to run %%~nxf
        pause
        exit /b 1
    )
    echo [OK] %%~nxf completed
)

echo.
echo ==========================================
echo [OK] All migrations completed!
echo ==========================================
pause