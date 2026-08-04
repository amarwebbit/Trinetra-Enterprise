-- ============================================
-- PERFORMANCE INDEXES - CRITICAL FOR SPEED
-- ============================================

-- Exams Table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exams_tenant_id ON exams(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exams_teacher_id ON exams(teacher_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exams_start_time ON exams(start_time);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exams_end_time ON exams(end_time);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exams_is_active ON exams(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exams_is_published ON exams(is_published);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exams_status ON exams(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exams_created_at ON exams(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exams_exam_type ON exams(exam_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exams_tenant_active_start ON exams(tenant_id, is_active, start_time);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exams_teacher_active_created ON exams(teacher_id, is_active, created_at);

-- Exam Attempts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_attempts_student_id ON exam_attempts(student_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_attempts_exam_id ON exam_attempts(exam_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_attempts_status ON exam_attempts(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_attempts_tenant_id ON exam_attempts(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_attempts_start_time ON exam_attempts(start_time);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_attempts_created_at ON exam_attempts(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_attempts_attempt_number ON exam_attempts(attempt_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_attempts_is_best_attempt ON exam_attempts(is_best_attempt);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_attempts_score ON exam_attempts(score);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_attempts_percentage ON exam_attempts(percentage);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_attempts_student_exam ON exam_attempts(student_id, exam_id, attempt_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_attempts_exam_status_created ON exam_attempts(exam_id, status, created_at);

-- Questions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_tenant_id ON questions(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_bank_id ON questions(bank_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_topic ON questions(topic);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_type ON questions(type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_created_at ON questions(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_is_active ON questions(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_bank_type_difficulty ON questions(bank_id, type, difficulty);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_tenant_topic_difficulty ON questions(tenant_id, topic, difficulty);

-- Users
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_role_active ON users(tenant_id, role, is_active);

-- Answers
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_answers_attempt_id ON answers(attempt_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_answers_question_id ON answers(question_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_answers_tenant_id ON answers(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_answers_grading_status ON answers(grading_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_answers_is_correct ON answers(is_correct);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_answers_attempt_grading ON answers(attempt_id, grading_status);

-- Enrollments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enrollments_tenant_id ON enrollments(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enrollments_is_active ON enrollments(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enrollments_student_course ON enrollments(student_id, course_id);

-- Question Banks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_question_banks_tenant_id ON question_banks(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_question_banks_teacher_id ON question_banks(teacher_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_question_banks_is_shared ON question_banks(is_shared);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_question_banks_is_published ON question_banks(is_published);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_question_banks_tenant_published ON question_banks(tenant_id, is_published);

-- Topics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_topics_tenant_id ON topics(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_topics_name ON topics(name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_topics_tenant_name ON topics(tenant_id, name);

-- Exam Sections
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_sections_exam_id ON exam_sections(exam_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_sections_tenant_id ON exam_sections(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_sections_exam_order ON exam_sections(exam_id, order_index);

-- Proctoring Logs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proctoring_logs_attempt_id ON proctoring_logs(attempt_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proctoring_logs_tenant_id ON proctoring_logs(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proctoring_logs_created_at ON proctoring_logs(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proctoring_logs_event_type ON proctoring_logs(event_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proctoring_logs_severity ON proctoring_logs(severity);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proctoring_logs_attempt_severity ON proctoring_logs(attempt_id, severity);

-- Audit Logs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at);
