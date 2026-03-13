-- Source of truth for admin-applied lock/unlock decisions per cohort.
-- Separates intentional admin overrides from sequential progression state
-- so new enrolling students inherit only admin decisions, not peer progress.

CREATE TABLE IF NOT EXISTS cohort_admin_locks (
  subtopic_id  INTEGER     NOT NULL REFERENCES subtopics(id) ON DELETE CASCADE,
  college_id   UUID        NOT NULL,
  year         INTEGER     NOT NULL,
  is_locked    BOOLEAN     NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (subtopic_id, college_id, year)
);
