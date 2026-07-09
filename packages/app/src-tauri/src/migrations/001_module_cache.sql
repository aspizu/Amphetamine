CREATE TABLE IF NOT EXISTS module (
    id INTEGER PRIMARY KEY NOT NULL,
    last_accessed_at TEXT NOT NULL
) STRICT, WITHOUT ROWID;


CREATE TABLE IF NOT EXISTS module_metadata (
    id                INTEGER PRIMARY KEY NOT NULL,
    filename          TEXT NOT NULL,
    title             TEXT NOT NULL,
    format            TEXT NOT NULL,
    size              TEXT NOT NULL,
    md5               TEXT NOT NULL,
    channels          INTEGER NOT NULL,
    genre             TEXT NOT NULL,
    downloads         INTEGER NOT NULL,
    favourites        INTEGER NOT NULL,
    instrument_text   TEXT NOT NULL,
    download_url      TEXT NOT NULL,
    fetched_at        INTEGER NOT NULL,
    last_accessed_at  INTEGER NOT NULL
) STRICT, WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS module_last_accessed_at_idx
    ON module (last_accessed_at);