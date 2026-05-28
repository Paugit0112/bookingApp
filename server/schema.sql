-- ============================================================
-- EvalBook – MySQL Schema
-- Run once: mysql -u root < server/schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS evalbook CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE evalbook;

-- ─── admin_profiles ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_profiles (
    id          CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
    full_name   VARCHAR(100) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    role        ENUM('evaluator','admin','super_admin') NOT NULL DEFAULT 'evaluator',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── students ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
    id          CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
    full_name   VARCHAR(100) NOT NULL,
    student_id  VARCHAR(50)  NOT NULL UNIQUE,
    section     VARCHAR(20)  NOT NULL,
    email       VARCHAR(255) NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_student_id (student_id)
);

-- ─── appointments ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
    id                CHAR(36)   PRIMARY KEY DEFAULT (UUID()),
    student_id        CHAR(36)   NOT NULL,
    appointment_date  DATE       NOT NULL,
    appointment_time  TIME       NOT NULL,
    status            ENUM('pending','approved','rejected','evaluated','cancelled') NOT NULL DEFAULT 'pending',
    created_at        DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_date   (appointment_date),
    INDEX idx_status (status)
);

-- ─── evaluations ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evaluations (
    id                      CHAR(36)       PRIMARY KEY DEFAULT (UUID()),
    appointment_id          CHAR(36)       NOT NULL UNIQUE,
    evaluator_id            CHAR(36)       NOT NULL,
    functionality_score     DECIMAL(5,2)   NOT NULL DEFAULT 0,
    data_structure_score    DECIMAL(5,2)   NOT NULL DEFAULT 0,
    algorithm_score         DECIMAL(5,2)   NOT NULL DEFAULT 0,
    file_handling_score     DECIMAL(5,2)   NOT NULL DEFAULT 0,
    dataset_score           DECIMAL(5,2)   NOT NULL DEFAULT 0,
    ui_score                DECIMAL(5,2)   NOT NULL DEFAULT 0,
    code_quality_score      DECIMAL(5,2)   NOT NULL DEFAULT 0,
    documentation_score     DECIMAL(5,2)   NOT NULL DEFAULT 0,
    presentation_score      DECIMAL(5,2)   NOT NULL DEFAULT 0,
    total_score             DECIMAL(5,2)   GENERATED ALWAYS AS (
                                functionality_score + data_structure_score + algorithm_score +
                                file_handling_score + dataset_score + ui_score +
                                code_quality_score + documentation_score + presentation_score
                            ) STORED,
    evaluator_comments      TEXT           NOT NULL,
    recommendation          ENUM('passed','passed_with_revisions','needs_major_revision','failed') NOT NULL,
    evaluated_at            DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

-- ─── audit_logs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id          CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
    admin_id    CHAR(36)     NOT NULL,
    action      VARCHAR(100) NOT NULL,
    target_type ENUM('appointment','evaluation','student') NOT NULL,
    target_id   CHAR(36)     NOT NULL,
    metadata    JSON         NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_admin   (admin_id),
    INDEX idx_target  (target_type, target_id),
    INDEX idx_created (created_at)
);

-- ─── Seed: default admin (password: admin123) ────────────────────────────────
-- Default admin: email=admin@evalbook.local  password=admin123
-- Re-generate hash via: node -e "require('bcryptjs').hash('admin123',10).then(console.log)"
INSERT IGNORE INTO admin_profiles (id, full_name, email, password, role)
VALUES (
    UUID(),
    'Administrator',
    'admin@evalbook.local',
    '$2a$10$uMgBJzHBRYXlvBpK5ZPjXeOXXkZerAk9JkT7w8tDyHJYGWmJnLYKm',
    'admin'
);
