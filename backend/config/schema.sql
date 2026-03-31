-- CVQR Database Schema
-- Run this file once to set up the database from scratch.

CREATE DATABASE IF NOT EXISTS cvqr;
USE cvqr;

-- ------------------------------------------------------------------
-- users
-- Stores both students and companies. Role is assigned on registration:
--   - email ending in @school.com → student
--   - anything else              → company
--   - admin accounts are inserted manually
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    name          VARCHAR(255)    NOT NULL,
    email         VARCHAR(255)    NOT NULL UNIQUE,
    password_hash VARCHAR(255)    NOT NULL,
    role          ENUM('student', 'company', 'admin') NOT NULL,
    created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- ------------------------------------------------------------------
-- cvs
-- One CV per student (enforced at the application layer).
-- file_path stores the UUID-based filename on disk (not the full path).
-- updated_at is set explicitly on replace, not auto-updated.
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cvs (
    id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    user_id       INT UNSIGNED    NOT NULL,
    file_path     VARCHAR(255)    NOT NULL,
    original_name VARCHAR(255)    NOT NULL,
    uploaded_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME                 DEFAULT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------------
-- qr_tokens
-- One token per CV. Replaced (not deleted) when the student replaces
-- their CV so old QR codes stop working immediately.
-- Deleted automatically via CASCADE when the CV is deleted.
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qr_tokens (
    id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    cv_id         INT UNSIGNED    NOT NULL UNIQUE,
    token         VARCHAR(255)    NOT NULL UNIQUE,
    expires_at    DATETIME        NOT NULL,
    created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (cv_id) REFERENCES cvs(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------------
-- scan_logs
-- Records which company scanned which CV.
-- UNIQUE constraint on (company_id, cv_id) prevents duplicate entries
-- when the same company scans the same QR code more than once.
-- Deleted automatically via CASCADE when the CV or company is removed.
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scan_logs (
    id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    company_id    INT UNSIGNED    NOT NULL,
    cv_id         INT UNSIGNED    NOT NULL,
    scanned_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_company_cv (company_id, cv_id),
    FOREIGN KEY (company_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (cv_id)      REFERENCES cvs(id)   ON DELETE CASCADE
);
