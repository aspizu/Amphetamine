CREATE TABLE IF NOT EXISTS module (
    id INTEGER PRIMARY KEY NOT NULL,
    last_accessed_at TEXT NOT NULL
) STRICT, WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS module_last_accessed_at_idx
    ON module (last_accessed_at);
