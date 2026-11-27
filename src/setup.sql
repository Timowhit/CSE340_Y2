-- ========================================
-- Reset: drop the tables this script owns so it can be re-run
-- ========================================
-- WARNING: this deletes every organization, project, and category (and their links).
-- The users and session tables further down are never dropped.
-- Children first, so foreign keys never block a drop.
DROP TABLE IF EXISTS project_categories;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS organization;

-- ========================================
-- Organization Table
-- ========================================
CREATE TABLE organization (
    organization_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    logo_filename VARCHAR(255) NOT NULL
);

-- ========================================
-- Insert sample data: Organizations
-- ========================================
INSERT INTO organization (name, description, contact_email, logo_filename)
VALUES
('BrightFuture Builders', 'A nonprofit focused on improving community infrastructure through sustainable construction projects.', 'info@brightfuturebuilders.org', 'brightfuture-logo.png'),
('GreenHarvest Growers', 'An urban farming collective promoting food sustainability and education in local neighborhoods.', 'contact@greenharvest.org', 'greenharvest-logo.png'),
('UnityServe Volunteers', 'A volunteer coordination group supporting local charities and service initiatives.', 'hello@unityserve.org', 'unityserve-logo.png');

SELECT * FROM organization;

-- ============================================
-- Projects, Categories, and their relationship
-- ============================================

-- Service projects (each belongs to one organization)
CREATE TABLE projects (
    project_id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    location VARCHAR(200),
    project_date DATE,
    FOREIGN KEY (organization_id) REFERENCES organization(organization_id) ON DELETE CASCADE
);

-- Categories (unique ID and unique name)
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- Junction table: many projects <-> many categories
CREATE TABLE project_categories (
    project_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    PRIMARY KEY (project_id, category_id),
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE
);

-- Seed categories
INSERT INTO categories (name) VALUES
    ('Environmental'),
    ('Education'),
    ('Community Support'),
    ('Health & Wellness');

-- Seed projects (linked to the first organization in the table)
INSERT INTO projects (organization_id, title, description, location, project_date)
SELECT organization_id, t.title, t.description, t.location, t.project_date::date
FROM (SELECT organization_id FROM organization ORDER BY organization_id LIMIT 1) o
CROSS JOIN (VALUES
    ('Community Cleanup Day', 'Neighborhood park and street cleanup', 'Central Park', '2026-11-20'),
    ('After-School Tutoring', 'Free homework help for local students', 'Public Library', '2026-12-01'),
    ('Neighborhood Food Drive', 'Collecting and sorting food donations', 'Community Center', '2026-12-10')
) AS t(title, description, location, project_date);

-- Associate every project with at least one category
INSERT INTO project_categories (project_id, category_id)
SELECT p.project_id, c.category_id
FROM projects p
JOIN categories c ON
    (p.title = 'Community Cleanup Day'    AND c.name = 'Environmental') OR
    (p.title = 'After-School Tutoring'    AND c.name = 'Education') OR
    (p.title = 'Neighborhood Food Drive'  AND c.name = 'Community Support') OR
    (p.title = 'Neighborhood Food Drive'  AND c.name = 'Health & Wellness');


-- ============================================
-- Users and roles (login + admin-only routes)
-- Safe to run on its own against an existing database: it only creates
-- the table if missing and never drops or changes other tables.
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,   -- stored lower-case; the login form lower-cases input
    password_hash TEXT NOT NULL,          -- "<saltHex>:<scryptKeyHex>", see src/utils/password.js
    role VARCHAR(20) NOT NULL DEFAULT 'volunteer' CHECK (role IN ('admin', 'volunteer'))
);

-- DEVELOPMENT-ONLY sample accounts (passwords are listed in the README).
-- Re-running this section resets the sample accounts' passwords to the README values, which
-- repairs a database that was seeded with an earlier, wrong hash.
-- Delete these rows or change their passwords before the app is reachable by anyone else.
INSERT INTO users (name, email, password_hash, role) VALUES
    ('Site Admin', 'admin@example.org', '41b2542b91d412f5e963cf7fdfb7b06d:7e3642569a108f831b83841dfa56a921f9b11009b7238dd453f7866e9a7e641da75acee1b1dbf836e1ce3f5c3e32320b5535fd3f1676c5f3afe1d1d15781c37a', 'admin'),
    ('Sample Volunteer', 'volunteer@example.org', 'fe1b8ed281e45885a0e9c753ced2b505:059d339a93e32e1e6987ce72137fe6f49816c46924ee4c65189a016b06e34d636a7a857dac8ec016e31abc1f9c55237a5a8ee34ba9e87d273620cc1c4d942fe6', 'volunteer')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;


-- ============================================
-- Login sessions (used by connect-pg-simple, see server.js)
-- Safe to run on its own against an existing database: it only creates
-- the table and index if missing. The session store deletes expired rows;
-- the index keeps that cleanup fast.
-- ============================================

CREATE TABLE IF NOT EXISTS session (
    sid VARCHAR PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire);
