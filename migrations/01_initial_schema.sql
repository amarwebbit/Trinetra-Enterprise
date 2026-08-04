-- ============================================
-- EXAMINAI - COMPLETE DATABASE SCHEMA
-- Based on System Architecture Document
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- 1. TENANTS TABLE
-- ============================================
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(255) UNIQUE,
    logo_url TEXT,
    favicon_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#2563EB',
    secondary_color VARCHAR(7) DEFAULT '#7C3AED',
    font_family VARCHAR(100) DEFAULT 'Inter',
    custom_css TEXT,
    email_template TEXT,
    sms_template TEXT,
    modules_enabled TEXT[] DEFAULT ARRAY['core'],
    module_settings JSONB DEFAULT '{}',
    overage_limits JSONB DEFAULT '{"ai_questions": 500, "ai_evaluations": 1000, "sms": 100, "storage_gb": 5}',
    usage_metrics JSONB DEFAULT '{"ai_questions_used": 0, "ai_evaluations_used": 0, "sms_used": 0, "storage_used_gb": 0}',
    is_active BOOLEAN DEFAULT true,
    subscription_plan VARCHAR(50) DEFAULT 'starter',
    subscription_end_date TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. USERS TABLE (with RBAC)
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'admin', 'teacher', 'student')),
    phone VARCHAR(20),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    refresh_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- ============================================
-- 3. DEPARTMENTS
-- ============================================
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    head_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. COURSES
-- ============================================
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    year INTEGER,
    semester INTEGER,
    description TEXT,
    credits INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. ENROLLMENTS
-- ============================================
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, course_id)
);

-- ============================================
-- 6. QUESTION BANKS
-- ============================================
CREATE TABLE question_banks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    description TEXT,
    is_shared BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    question_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. QUESTIONS (Core)
-- ============================================
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    bank_id UUID REFERENCES question_banks(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'mcq_single', 'mcq_multiple', 'true_false', 'assertion_reasoning',
        'match_following', 'fill_blanks', 'short_answer', 'long_answer',
        'numerical', 'file_upload', 'code', 'nat'
    )),
    question_text TEXT NOT NULL,
    options JSONB, -- For MCQ, Match, etc.
    correct_answer TEXT, -- For auto-grading
    marks DECIMAL(5,2) DEFAULT 1.0,
    negative_marks DECIMAL(5,2) DEFAULT 0.0,
    difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
    bloom_taxonomy VARCHAR(50) CHECK (bloom_taxonomy IN (
        'remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'
    )),
    co_tag VARCHAR(50),
    topic VARCHAR(255),
    explanation TEXT,
    embedding vector(1536), -- For AI duplicate detection
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. EXAMS
-- ============================================
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    exam_type VARCHAR(100) DEFAULT 'general',
    pattern VARCHAR(100) DEFAULT 'custom',
    duration_minutes INTEGER NOT NULL,
    total_marks DECIMAL(8,2),
    passing_percentage DECIMAL(5,2) DEFAULT 40.0,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    shuffle_questions BOOLEAN DEFAULT false,
    shuffle_options BOOLEAN DEFAULT false,
    allow_back_navigation BOOLEAN DEFAULT true,
    show_results_immediately BOOLEAN DEFAULT false,
    require_webcam BOOLEAN DEFAULT false,
    ip_restriction TEXT[],
    full_screen_required BOOLEAN DEFAULT false,
    disable_copy_paste BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    attempt_count INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. EXAM SECTIONS
-- ============================================
CREATE TABLE exam_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    order_index INTEGER NOT NULL,
    question_count INTEGER,
    marks_per_question DECIMAL(5,2),
    negative_marks DECIMAL(5,2) DEFAULT 0.0,
    section_time_limit INTEGER, -- In minutes
    shuffle_questions BOOLEAN DEFAULT false,
    instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. EXAM QUESTIONS (Junction)
-- ============================================
CREATE TABLE exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    exam_section_id UUID NOT NULL REFERENCES exam_sections(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    order_index INTEGER,
    marks DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(exam_section_id, question_id)
);

-- ============================================
-- 11. EXAM ATTEMPTS
-- ============================================
CREATE TABLE exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    score DECIMAL(8,2),
    total_marks DECIMAL(8,2),
    percentage DECIMAL(5,2),
    status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN (
        'in_progress', 'submitted', 'auto_submitted', 'evaluated', 'grading', 'flagged'
    )),
    ip_address TEXT,
    browser_info TEXT,
    device_info TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, exam_id)
);

-- ============================================
-- 12. ANSWERS
-- ============================================
CREATE TABLE answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    answer_text TEXT,
    answer_file_url TEXT,
    code_submission TEXT,
    marks_awarded DECIMAL(5,2),
    is_correct BOOLEAN,
    ai_confidence DECIMAL(5,2),
    ai_feedback TEXT,
    teacher_feedback TEXT,
    grading_status VARCHAR(50) DEFAULT 'pending' CHECK (grading_status IN (
        'pending', 'ai_graded', 'teacher_reviewed', 'flagged', 'manual_grading'
    )),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 13. PROCTORING LOGS
-- ============================================
CREATE TABLE proctoring_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL CHECK (event_type IN (
        'webcam_snapshot', 'tab_switch', 'face_detected', 'multiple_faces',
        'audio_detected', 'suspicious_activity', 'warning_issued', 'violation',
        'screen_capture', 'eye_movement', 'object_detected', 'connection_lost'
    )),
    event_data JSONB NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    screenshot_url TEXT,
    video_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 14. AI ANALYSIS RESULTS
-- ============================================
CREATE TABLE ai_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    analysis_type VARCHAR(50) NOT NULL CHECK (analysis_type IN (
        'question_generation', 'answer_evaluation', 'student_insights', 'class_insights'
    )),
    input_data JSONB NOT NULL,
    output_data JSONB NOT NULL,
    confidence_score DECIMAL(5,2),
    model_used VARCHAR(100),
    processing_time_ms INTEGER,
    tokens_used INTEGER,
    cost_usd DECIMAL(10,6),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 15. NOTIFICATIONS
-- ============================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) CHECK (type IN ('email', 'sms', 'whatsapp', 'in_app', 'push')),
    title VARCHAR(255),
    content TEXT NOT NULL,
    channel VARCHAR(50) CHECK (channel IN ('email', 'sms', 'whatsapp', 'app', 'push')),
    is_read BOOLEAN DEFAULT false,
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 16. MODULES CATALOG
-- ============================================
CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    depends_on TEXT[] DEFAULT '{}',
    is_core BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sub_modules JSONB DEFAULT '[]',
    features JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 17. TENANT MODULES (Junction)
-- ============================================
CREATE TABLE tenant_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT false,
    custom_limits JSONB DEFAULT '{}',
    usage_count JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, module_id)
);

-- ============================================
-- 18. AUDIT LOGS (Immutable)
-- ============================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 19. COMPLIANCE REPORTS
-- ============================================
CREATE TABLE compliance_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN (
        'naac', 'nba', 'aicte', 'ugc', 'iso', 'custom', 'nirf'
    )),
    title VARCHAR(255) NOT NULL,
    file_url TEXT,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    parameters JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'generating',
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 20. API KEYS
-- ============================================
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    key_preview VARCHAR(20),
    permissions JSONB DEFAULT '{"read": true, "write": false}',
    rate_limit_per_minute INTEGER DEFAULT 60,
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 21. WEBHOOKS
-- ============================================
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL,
    secret TEXT,
    is_active BOOLEAN DEFAULT true,
    retry_count INTEGER DEFAULT 3,
    timeout_ms INTEGER DEFAULT 5000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 22. WEBHOOK DELIVERY LOGS
-- ============================================
CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    attempt_count INTEGER DEFAULT 0,
    success BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 23. COURSE OUTCOMES (CO)
-- ============================================
CREATE TABLE course_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    bloom_level VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 24. CO ATTAINMENT
-- ============================================
CREATE TABLE co_attainment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    co_id UUID NOT NULL REFERENCES course_outcomes(id) ON DELETE CASCADE,
    attainment_percentage DECIMAL(5,2),
    target_percentage DECIMAL(5,2),
    student_count INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);