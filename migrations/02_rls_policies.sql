-- ============================================
-- FIXED RLS POLICIES - EXAMINAI
-- ============================================

-- Create roles if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon;
    END IF;
END
$$;

-- Helper functions
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN (NULLIF(current_setting('request.jwt.claims', true), ''))::jsonb->>'tenant_id';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (NULLIF(current_setting('request.jwt.claims', true), ''))::jsonb->>'role';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN (NULLIF(current_setting('request.jwt.claims', true), ''))::jsonb->>'sub';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Enable RLS on all tables
DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', table_name);
    END LOOP;
END $$;

-- ============================================
-- TENANTS POLICIES
-- ============================================
CREATE POLICY tenant_super_admin_all ON tenants
    FOR ALL TO authenticated
    USING (get_current_user_role() = 'super_admin');

CREATE POLICY tenant_tenant_read ON tenants
    FOR SELECT TO authenticated
    USING (id = get_current_tenant_id());

-- ============================================
-- USERS POLICIES
-- ============================================
CREATE POLICY users_tenant_isolation ON users
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id() OR get_current_user_role() = 'super_admin');

CREATE POLICY users_self_access ON users
    FOR SELECT TO authenticated
    USING (id = get_current_user_id());

CREATE POLICY users_admin_manage ON users
    FOR ALL TO authenticated
    USING (
        get_current_user_role() IN ('admin', 'super_admin') 
        AND tenant_id = get_current_tenant_id()
    );

-- ============================================
-- DEPARTMENTS POLICIES
-- ============================================
CREATE POLICY departments_tenant_isolation ON departments
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id() OR get_current_user_role() = 'super_admin');

-- ============================================
-- COURSES POLICIES
-- ============================================
CREATE POLICY courses_tenant_isolation ON courses
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id() OR get_current_user_role() = 'super_admin');

-- ============================================
-- ENROLLMENTS POLICIES
-- ============================================
CREATE POLICY enrollments_tenant_isolation ON enrollments
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY enrollments_student_view ON enrollments
    FOR SELECT TO authenticated
    USING (student_id = get_current_user_id());

CREATE POLICY enrollments_teacher_admin_all ON enrollments
    FOR ALL TO authenticated
    USING (
        get_current_user_role() IN ('admin', 'super_admin') OR
        EXISTS (
            SELECT 1 FROM courses c
            WHERE c.id = enrollments.course_id
            AND c.department_id IN (
                SELECT department_id FROM users u
                WHERE u.id = get_current_user_id()
                AND u.role = 'teacher'
            )
        )
    );

-- ============================================
-- QUESTION BANKS POLICIES
-- ============================================
CREATE POLICY question_banks_tenant_isolation ON question_banks
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY question_banks_teacher_manage ON question_banks
    FOR ALL TO authenticated
    USING (
        teacher_id = get_current_user_id() OR
        get_current_user_role() IN ('admin', 'super_admin')
    );

CREATE POLICY question_banks_shared_read ON question_banks
    FOR SELECT TO authenticated
    USING (is_shared = true);

-- ============================================
-- QUESTIONS POLICIES
-- ============================================
CREATE POLICY questions_tenant_isolation ON questions
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY questions_teacher_manage ON questions
    FOR ALL TO authenticated
    USING (
        get_current_user_role() IN ('admin', 'super_admin') OR
        EXISTS (
            SELECT 1 FROM question_banks qb
            WHERE qb.id = questions.bank_id
            AND qb.teacher_id = get_current_user_id()
        )
    );

-- FIXED: questions_student_read - Join through exam_sections
CREATE POLICY questions_student_read ON questions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM exam_questions eq
            JOIN exam_sections es ON es.id = eq.exam_section_id
            JOIN exams e ON e.id = es.exam_id
            WHERE eq.question_id = questions.id
            AND e.is_published = true
            AND e.is_active = true
        )
    );

-- ============================================
-- EXAMS POLICIES
-- ============================================
CREATE POLICY exams_tenant_isolation ON exams
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY exams_teacher_manage ON exams
    FOR ALL TO authenticated
    USING (
        teacher_id = get_current_user_id() OR
        get_current_user_role() IN ('admin', 'super_admin')
    );

-- FIXED: exams_student_view - Use metadata for course_id
CREATE POLICY exams_student_view ON exams
    FOR SELECT TO authenticated
    USING (
        is_published = true AND
        is_active = true AND
        start_time <= NOW() AND
        end_time >= NOW() AND
        EXISTS (
            SELECT 1 FROM enrollments e
            WHERE e.student_id = get_current_user_id()
            AND e.course_id = (exams.metadata->>'course_id')::uuid
        )
    );

-- ============================================
-- EXAM SECTIONS POLICIES
-- ============================================
CREATE POLICY exam_sections_tenant_isolation ON exam_sections
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY exam_sections_teacher_manage ON exam_sections
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM exams e
            WHERE e.id = exam_sections.exam_id
            AND (e.teacher_id = get_current_user_id() OR get_current_user_role() IN ('admin', 'super_admin'))
        )
    );

CREATE POLICY exam_sections_student_read ON exam_sections
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM exams e
            WHERE e.id = exam_sections.exam_id
            AND e.is_published = true
        )
    );

-- ============================================
-- EXAM ATTEMPTS POLICIES
-- ============================================
CREATE POLICY exam_attempts_tenant_isolation ON exam_attempts
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY exam_attempts_student_manage ON exam_attempts
    FOR ALL TO authenticated
    USING (student_id = get_current_user_id());

CREATE POLICY exam_attempts_teacher_view ON exam_attempts
    FOR SELECT TO authenticated
    USING (
        get_current_user_role() IN ('admin', 'super_admin') OR
        EXISTS (
            SELECT 1 FROM exams e
            WHERE e.id = exam_attempts.exam_id
            AND e.teacher_id = get_current_user_id()
        )
    );

-- ============================================
-- ANSWERS POLICIES
-- ============================================
CREATE POLICY answers_tenant_isolation ON answers
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY answers_student_manage ON answers
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM exam_attempts ea
            WHERE ea.id = answers.attempt_id
            AND ea.student_id = get_current_user_id()
        )
    );

CREATE POLICY answers_teacher_view ON answers
    FOR SELECT TO authenticated
    USING (
        get_current_user_role() IN ('admin', 'super_admin') OR
        EXISTS (
            SELECT 1 FROM exam_attempts ea
            JOIN exams e ON e.id = ea.exam_id
            WHERE ea.id = answers.attempt_id
            AND e.teacher_id = get_current_user_id()
        )
    );

-- ============================================
-- PROCTORING LOGS POLICIES
-- ============================================
CREATE POLICY proctoring_logs_tenant_isolation ON proctoring_logs
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY proctoring_logs_teacher_admin ON proctoring_logs
    FOR SELECT TO authenticated
    USING (
        get_current_user_role() IN ('admin', 'super_admin') OR
        EXISTS (
            SELECT 1 FROM exam_attempts ea
            JOIN exams e ON e.id = ea.exam_id
            WHERE ea.id = proctoring_logs.attempt_id
            AND e.teacher_id = get_current_user_id()
        )
    );

-- ============================================
-- AUDIT LOGS POLICIES
-- ============================================
CREATE POLICY audit_logs_admin_access ON audit_logs
    FOR SELECT TO authenticated
    USING (
        get_current_user_role() IN ('admin', 'super_admin') 
        AND tenant_id = get_current_tenant_id()
    );

CREATE POLICY audit_logs_super_admin_access ON audit_logs
    FOR ALL TO authenticated
    USING (get_current_user_role() = 'super_admin');

-- ============================================
-- NOTIFICATIONS POLICIES
-- ============================================
CREATE POLICY notifications_tenant_isolation ON notifications
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY notifications_user_access ON notifications
    FOR ALL TO authenticated
    USING (user_id = get_current_user_id());

-- ============================================
-- MODULES POLICIES
-- ============================================
CREATE POLICY modules_public_read ON modules
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY modules_admin_manage ON modules
    FOR ALL TO authenticated
    USING (get_current_user_role() IN ('admin', 'super_admin'));

-- ============================================
-- API KEYS POLICIES
-- ============================================
CREATE POLICY api_keys_tenant_isolation ON api_keys
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY api_keys_admin_manage ON api_keys
    FOR ALL TO authenticated
    USING (get_current_user_role() IN ('admin', 'super_admin'));

-- ============================================
-- COMPLIANCE REPORTS POLICIES
-- ============================================
CREATE POLICY compliance_reports_tenant_isolation ON compliance_reports
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY compliance_reports_admin_access ON compliance_reports
    FOR ALL TO authenticated
    USING (get_current_user_role() IN ('admin', 'super_admin'));

-- ============================================
-- WEBHOOKS POLICIES
-- ============================================
CREATE POLICY webhooks_tenant_isolation ON webhooks
    FOR ALL TO authenticated
    USING (tenant_id = get_current_tenant_id());

CREATE POLICY webhooks_admin_manage ON webhooks
    FOR ALL TO authenticated
    USING (get_current_user_role() IN ('admin', 'super_admin'));

-- ============================================
-- RESULT DISTRIBUTION POLICIES (if table exists)
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'result_distribution') THEN
        CREATE POLICY result_distribution_tenant_isolation ON result_distribution
            FOR ALL TO authenticated
            USING (tenant_id = get_current_tenant_id());
    END IF;
END
$$;