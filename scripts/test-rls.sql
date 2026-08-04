-- scripts/test-rls.sql
-- Run this script to verify that Row-Level Security (RLS) is working correctly.

-- 1. Test Without Context (Should return 0 rows for isolated users table)
SELECT set_config('app.current_tenant_id', '', true);
SELECT set_config('app.current_user_role', '', true);
SELECT count(*) as "Count Without Context (Expected 0)" FROM users;

-- 2. Test With Specific Tenant Context
-- Replace the UUID with a valid tenant ID from your database for a real test
-- WITH test_tenant AS (SELECT id FROM tenants LIMIT 1)
-- SELECT set_config('app.current_tenant_id', (SELECT id::text FROM test_tenant), true);
-- SELECT count(*) as "Count For Tenant A" FROM users;

-- 3. Test With Super Admin Context (Should return all rows)
SELECT set_config('app.current_user_role', 'super_admin', true);
SELECT count(*) as "Count For Super Admin (Expected > 0)" FROM users;

-- 4. Cross-Tenant Attempt (Should fail/return 0 if testing via user role)
SELECT set_config('app.current_tenant_id', '00000000-0000-0000-0000-000000000000', true);
SELECT set_config('app.current_user_role', 'student', true);
SELECT count(*) as "Count For Invalid Tenant (Expected 0)" FROM users;
