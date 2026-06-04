-- CVQR Database Schema
-- Destructive development reset schema. Do not run against production data.

CREATE DATABASE IF NOT EXISTS cvqr;
USE cvqr;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS scan_logs;
DROP TABLE IF EXISTS qr_tokens;
DROP TABLE IF EXISTS participations;
DROP TABLE IF EXISTS event_companies;
DROP TABLE IF EXISTS cv_versions;
DROP TABLE IF EXISTS cvs;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------------
-- users
-- Stores students, company representatives, and admins.
-- Role is assigned on registration:
--   - email ending in @school.com -> student
--   - anything else              -> company
--   - admin accounts are inserted manually
-- ------------------------------------------------------------------
CREATE TABLE users (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('student', 'company', 'admin') NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_role (role)
);

-- ------------------------------------------------------------------
-- events
-- Admin-managed event/location records.
-- Registration and access are controlled by status plus date windows.
-- ------------------------------------------------------------------
CREATE TABLE events (
    id                       INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name                     VARCHAR(255) NOT NULL,
    location                 VARCHAR(255) NOT NULL,
    status                   ENUM('draft', 'open', 'closed') NOT NULL DEFAULT 'draft',
    registration_opens_at    DATETIME NOT NULL,
    registration_closes_at   DATETIME NOT NULL,
    starts_at                DATETIME NOT NULL,
    ends_at                  DATETIME NOT NULL,
    closed_at                DATETIME DEFAULT NULL,
    created_by               INT UNSIGNED DEFAULT NULL,
    created_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_events_status_dates (status, registration_opens_at, registration_closes_at, starts_at, ends_at),
    KEY idx_events_created_by (created_by),
    CONSTRAINT fk_events_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT chk_events_registration_window
        CHECK (registration_opens_at <= registration_closes_at),
    CONSTRAINT chk_events_event_window
        CHECK (starts_at <= ends_at)
);

-- ------------------------------------------------------------------
-- event_companies
-- Assigns company representative accounts to events.
-- Role correctness is enforced by application code.
-- ------------------------------------------------------------------
CREATE TABLE event_companies (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_id    INT UNSIGNED NOT NULL,
    company_id  INT UNSIGNED NOT NULL,
    assigned_by INT UNSIGNED DEFAULT NULL,
    assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_event_companies_event_company (event_id, company_id),
    KEY idx_event_companies_company (company_id),
    KEY idx_event_companies_assigned_by (assigned_by),
    CONSTRAINT fk_event_companies_event
        FOREIGN KEY (event_id) REFERENCES events(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_event_companies_company
        FOREIGN KEY (company_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_event_companies_assigned_by
        FOREIGN KEY (assigned_by) REFERENCES users(id)
        ON DELETE SET NULL
);

-- ------------------------------------------------------------------
-- cvs
-- One logical CV record per student. Actual uploaded files live in
-- cv_versions so the latest retained version can be exposed.
-- ------------------------------------------------------------------
CREATE TABLE cvs (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    student_id INT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_cvs_student (student_id),
    CONSTRAINT fk_cvs_student
        FOREIGN KEY (student_id) REFERENCES users(id)
        ON DELETE CASCADE
);

-- ------------------------------------------------------------------
-- cv_versions
-- Stores retained uploaded CV files. Application code keeps only the
-- latest three versions for each logical CV.
-- ------------------------------------------------------------------
CREATE TABLE cv_versions (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    cv_id         INT UNSIGNED NOT NULL,
    file_path     VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    version_number INT UNSIGNED NOT NULL,
    uploaded_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_cv_versions_file_path (file_path),
    UNIQUE KEY uq_cv_versions_cv_version (cv_id, version_number),
    KEY idx_cv_versions_latest (cv_id, uploaded_at, id),
    CONSTRAINT fk_cv_versions_cv
        FOREIGN KEY (cv_id) REFERENCES cvs(id)
        ON DELETE CASCADE
);

-- ------------------------------------------------------------------
-- participations
-- A student's registration for an event. The selected cv_id is nullable
-- so a student can register before uploading/selecting a CV. QR tokens
-- are generated only after selected_cv_id is set.
-- ------------------------------------------------------------------
CREATE TABLE participations (
    id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
    student_id     INT UNSIGNED NOT NULL,
    event_id       INT UNSIGNED NOT NULL,
    selected_cv_id INT UNSIGNED DEFAULT NULL,
    registered_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_participations_student_event (student_id, event_id),
    KEY idx_participations_event (event_id),
    KEY idx_participations_selected_cv (selected_cv_id),
    CONSTRAINT fk_participations_student
        FOREIGN KEY (student_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_participations_event
        FOREIGN KEY (event_id) REFERENCES events(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_participations_selected_cv
        FOREIGN KEY (selected_cv_id) REFERENCES cvs(id)
        ON DELETE SET NULL
);

-- ------------------------------------------------------------------
-- qr_tokens
-- QR tokens belong to participations. Old tokens are retained but
-- revoked when the active token changes.
-- ------------------------------------------------------------------
CREATE TABLE qr_tokens (
    id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
    participation_id INT UNSIGNED NOT NULL,
    token            VARCHAR(255) NOT NULL,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at       DATETIME DEFAULT NULL,
    revoked_reason   VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_qr_tokens_token (token),
    KEY idx_qr_tokens_participation_active (participation_id, revoked_at),
    CONSTRAINT fk_qr_tokens_participation
        FOREIGN KEY (participation_id) REFERENCES participations(id)
        ON DELETE CASCADE
);

-- ------------------------------------------------------------------
-- scan_logs
-- Audit log of company scans. Company-facing access is filtered by
-- current event state and assignment; rows are not deleted on close.
-- ------------------------------------------------------------------
CREATE TABLE scan_logs (
    id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id       INT UNSIGNED NOT NULL,
    event_id         INT UNSIGNED NOT NULL,
    participation_id INT UNSIGNED NOT NULL,
    qr_token_id      INT UNSIGNED NOT NULL,
    scanned_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_scan_logs_company_participation (company_id, participation_id),
    KEY idx_scan_logs_event_company (event_id, company_id),
    KEY idx_scan_logs_qr_token (qr_token_id),
    CONSTRAINT fk_scan_logs_company
        FOREIGN KEY (company_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_scan_logs_event
        FOREIGN KEY (event_id) REFERENCES events(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_scan_logs_participation
        FOREIGN KEY (participation_id) REFERENCES participations(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_scan_logs_qr_token
        FOREIGN KEY (qr_token_id) REFERENCES qr_tokens(id)
        ON DELETE RESTRICT
);
