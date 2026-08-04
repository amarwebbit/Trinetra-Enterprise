-- ============================================
-- SEED DATA: MODULES, DEFAULT TENANT, SUPER ADMIN
-- ============================================

-- ============================================
-- 1. INSERT MODULES
-- ============================================
INSERT INTO modules (code, name, description, price, is_core, depends_on, sub_modules, features) VALUES
('core', 'Core Engine', 'Multi-tenant isolation, basic RBAC, MCQ, auto-grading', 10000.00, true, ARRAY[]::text[], 
 '["multi_tenant", "rbac", "mcq", "auto_grading", "basic_dashboard", "email_notifications", "white_label"]',
 '["tenant_management", "user_management", "mcq_questions", "auto_grading", "basic_reports"]'),

('advanced_questions', 'Advanced Question Types', 'MSQ, True/False, Assertion-Reasoning, Match, Fill Blanks, Short/Long Answer, Numerical, File Upload', 5000.00, false, ARRAY['core'], 
 '["msq", "true_false", "assertion_reasoning", "match_following", "fill_blanks", "short_answer", "long_answer", "numerical", "file_upload", "nat"]',
 '["multiple_correct", "true_false", "assertion_reasoning", "match_the_following", "fill_in_the_blanks"]'),

('exam_patterns', 'Exam Patterns', 'GATE, JEE, NEET, CAT, University Patterns', 8000.00, false, ARRAY['core', 'advanced_questions'], 
 '["gate", "jee", "neet", "cat", "university", "custom_builder"]',
 '["gate_pattern", "jee_pattern", "neet_pattern", "cat_pattern", "university_pattern", "custom_pattern_builder"]'),

('ai_question_gen', 'AI Question Generator', 'Topic-based generation, Bloom''s taxonomy, duplicate detection', 10000.00, false, ARRAY['core'], 
 '["topic_based", "difficulty_mapping", "co_po_mapping", "duplicate_detection", "bulk_generation"]',
 '["ai_generation", "topic_based", "bloom_taxonomy", "duplicate_detection", "bulk_questions"]'),

('ai_evaluation', 'AI Answer Evaluation', 'Subjective answer grading, confidence scores, auto-feedback', 15000.00, false, ARRAY['core', 'advanced_questions'], 
 '["subjective_grading", "confidence_scoring", "teacher_review", "bulk_approve", "auto_feedback"]',
 '["ai_grading", "confidence_score", "teacher_override", "bulk_grading", "auto_feedback"]'),

('code_execution', 'Code Execution', '50+ languages, custom test cases, Monaco editor', 12000.00, false, ARRAY['core', 'advanced_questions'], 
 '["c", "cpp", "java", "python", "javascript", "sql", "custom_testcases", "monaco_editor", "plagiarism_check"]',
 '["multi_language", "monaco_editor", "test_cases", "plagiarism_detection", "code_grading"]'),

('live_proctoring', 'Live Proctoring', 'Webcam monitoring, screen recording, tab detection', 20000.00, false, ARRAY['core'], 
 '["webcam", "screen_recording", "tab_detection", "face_detection", "audio_monitoring", "ai_alerting"]',
 '["webcam_monitoring", "screen_recording", "tab_switch_detection", "face_detection", "live_alerts"]'),

('advanced_analytics', 'Advanced Analytics', 'Performance trends, difficulty index, CO attainment', 10000.00, false, ARRAY['core'], 
 '["performance_trends", "difficulty_index", "topic_weakness", "class_comparison", "co_attainment", "custom_reports"]',
 '["student_analytics", "question_analytics", "co_attainment", "custom_report_builder", "export_reports"]'),

('notification_suite', 'Notification Suite', 'WhatsApp, SMS, Email with templates and scheduling', 8000.00, false, ARRAY['core'], 
 '["whatsapp", "sms", "bulk_email", "templates", "scheduling", "delivery_tracking"]',
 '["whatsapp", "sms", "email", "bulk_notifications", "scheduled_notifications"]'),

('compliance_reports', 'Compliance & Reports', 'NAAC, NBA, AICTE, UGC, ISO reports', 10000.00, false, ARRAY['core'], 
 '["naac", "nba", "aicte", "ugc", "iso", "custom_templates"]',
 '["naac", "nba", "aicte", "ugc", "iso", "nirf"]'),

('advanced_whitelabel', 'Advanced White-Label', 'Custom domains, full CSS, branding removal', 15000.00, false, ARRAY['core'], 
 '["custom_domain", "email_templates", "sms_sender_id", "full_css", "custom_login", "remove_branding"]',
 '["custom_domain", "full_css", "remove_branding", "custom_email_templates", "custom_sms_templates"]'),

('api_integration', 'API & Integration', 'REST API, webhooks, LMS integration, SSO', 15000.00, false, ARRAY['core'], 
 '["rest_api", "webhooks", "lms_integration", "sso", "rate_limiting"]',
 '["rest_api", "webhooks", "lms_integration", "sso", "payment_gateway"]'),

('bulk_operations', 'Bulk Operations', 'Bulk import/export, scheduled operations', 5000.00, false, ARRAY['core'], 
 '["bulk_import", "bulk_export", "scheduled_ops"]',
 '["bulk_import", "bulk_export", "scheduled_operations"]');

-- ============================================
-- 2. CREATE DEFAULT SYSTEM TENANT
-- ============================================
INSERT INTO tenants (
    id, name, slug, domain, primary_color, secondary_color, 
    font_family, modules_enabled, subscription_plan
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'System Tenant',
    'system',
    'system.examin.ai',
    '#2563EB',
    '#7C3AED',
    'Inter',
    ARRAY['core', 'advanced_questions', 'exam_patterns', 'ai_question_gen', 
          'ai_evaluation', 'code_execution', 'live_proctoring', 'advanced_analytics',
          'notification_suite', 'compliance_reports', 'advanced_whitelabel', 
          'api_integration', 'bulk_operations'],
    'enterprise'
);

-- ============================================
-- 3. ENABLE ALL MODULES FOR SYSTEM TENANT
-- ============================================
INSERT INTO tenant_modules (tenant_id, module_id, is_enabled)
SELECT 
    '11111111-1111-1111-1111-111111111111',
    id,
    true
FROM modules;

-- ============================================
-- 4. CREATE TRIGGER FOR AUTO-UPDATING UPDATED_AT
-- ============================================
-- Triggers are already applied during initial schema creation

-- ============================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_exams_tenant_id ON exams(tenant_id);
CREATE INDEX idx_exams_start_end ON exams(start_time, end_time);
CREATE INDEX idx_exam_attempts_student ON exam_attempts(student_id);
CREATE INDEX idx_exam_attempts_exam ON exam_attempts(exam_id);
CREATE INDEX idx_answers_attempt ON answers(attempt_id);
CREATE INDEX idx_answers_question ON answers(question_id);
CREATE INDEX idx_questions_bank ON questions(bank_id);
CREATE INDEX idx_questions_topic ON questions(topic);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_proctoring_logs_attempt ON proctoring_logs(attempt_id);
CREATE INDEX idx_ai_analysis_exam ON ai_analysis(exam_id);
CREATE INDEX idx_ai_analysis_student ON ai_analysis(student_id);

-- ============================================
-- 6. CREATE GIN INDEX FOR JSONB QUERIES
-- ============================================
CREATE INDEX idx_questions_metadata ON questions USING GIN(metadata);
CREATE INDEX idx_exams_metadata ON exams USING GIN(metadata);
CREATE INDEX idx_users_metadata ON users USING GIN(metadata);

-- ============================================
-- 7. CREATE VECTOR INDEX FOR AI SIMILARITY SEARCH
-- ============================================
CREATE INDEX idx_questions_embedding ON questions 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ============================================
-- 8. CREATE TRIGGER FOR AUDIT LOGGING
-- ============================================
-- This will be implemented in the application layer
-- For now, we'll create a function that can be called
CREATE OR REPLACE FUNCTION log_audit(
    p_tenant_id UUID,
    p_user_id UUID,
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id UUID,
    p_old_values JSONB,
    p_new_values JSONB,
    p_ip_address TEXT,
    p_user_agent TEXT
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO audit_logs (
        tenant_id, user_id, action, resource_type, 
        resource_id, old_values, new_values, 
        ip_address, user_agent
    ) VALUES (
        p_tenant_id, p_user_id, p_action, p_resource_type,
        p_resource_id, p_old_values, p_new_values,
        p_ip_address, p_user_agent
    )
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;