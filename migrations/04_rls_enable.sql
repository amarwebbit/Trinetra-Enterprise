-- migrations/04_rls_enable.sql

-- Helper function to get current tenant ID
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (NULLIF(current_setting('app.current_tenant_id', true), ''))::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (NULLIF(current_setting('app.current_user_role', true), ''))::TEXT;
END;
$$ LANGUAGE plpgsql STABLE;

-- 1. Enable RLS on specific tables
DO $$
DECLARE
  table_name text;
  tenant_tables text[] := ARRAY[
    'users', 'departments', 'courses', 'enrollments', 'question_banks', 
    'questions', 'exams', 'exam_sections', 'exam_questions', 'exam_attempts', 
    'answers', 'proctoring_logs', 'notifications', 'audit_logs', 'api_keys', 
    'compliance_reports', 'tenant_modules', 'webhooks', 'ai_analysis', 
    'co_attainment', 'course_outcomes'
  ];
BEGIN
  -- Enable for tenants table specifically
  EXECUTE 'ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;';
  
  -- Enable for all tenant-scoped tables
  FOREACH table_name IN ARRAY tenant_tables
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', table_name);
  END LOOP;
END $$;

-- 2. Create Policies for the 'tenants' table (Special Case)
-- Tenants can only see their own tenant record. Super admin can see all.
CREATE POLICY tenants_isolation ON tenants
  FOR ALL
  USING (id = get_current_tenant_id() OR get_current_user_role() = 'super_admin')
  WITH CHECK (id = get_current_tenant_id() OR get_current_user_role() = 'super_admin');

-- 3. Create Policies for all standard tenant-scoped tables
DO $$
DECLARE
  table_name text;
  tenant_tables text[] := ARRAY[
    'users', 'departments', 'courses', 'enrollments', 'question_banks', 
    'questions', 'exams', 'exam_sections', 'exam_questions', 'exam_attempts', 
    'answers', 'proctoring_logs', 'notifications', 'audit_logs', 'api_keys', 
    'compliance_reports', 'tenant_modules', 'webhooks', 'ai_analysis', 
    'co_attainment', 'course_outcomes'
  ];
BEGIN
  FOREACH table_name IN ARRAY tenant_tables
  LOOP
    -- Drop existing policies if any to ensure clean application
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant_isolation ON %I;', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I_super_admin_all ON %I;', table_name, table_name);
    
    -- Tenant Isolation Policy
    EXECUTE format('
      CREATE POLICY %I_tenant_isolation ON %I
        FOR ALL
        USING (tenant_id = get_current_tenant_id())
        WITH CHECK (tenant_id = get_current_tenant_id());
    ', table_name, table_name);

    -- Super Admin Bypass Policy
    EXECUTE format('
      CREATE POLICY %I_super_admin_all ON %I
        FOR ALL
        USING (get_current_user_role() = ''super_admin'');
    ', table_name, table_name);
  END LOOP;
END $$;
