use rusqlite::{Connection, Result as SqliteResult};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    /// Open (or create) the SQLite database at the given app data directory.
    pub fn open(app_data_dir: PathBuf) -> SqliteResult<Self> {
        fs::create_dir_all(&app_data_dir).expect("failed to create app data directory");

        let db_path = app_data_dir.join("liteapi.db");
        let conn = Connection::open(&db_path)?;

        // Enable WAL mode for better concurrent read performance
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;

        let db = Database {
            conn: Mutex::new(conn),
        };
        db.migrate()?;
        Ok(db)
    }

    /// Create all tables if they do not exist.
    fn migrate(&self) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute_batch(
            "
            -- 1. folders
            CREATE TABLE IF NOT EXISTS folders (
                id         TEXT NOT NULL PRIMARY KEY,
                parent_id  TEXT REFERENCES folders(id) ON DELETE CASCADE,
                name       TEXT NOT NULL,
                sort       INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            -- 2. apis
            CREATE TABLE IF NOT EXISTS apis (
                id          TEXT NOT NULL PRIMARY KEY,
                folder_id   TEXT REFERENCES folders(id) ON DELETE CASCADE,
                name        TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                method      TEXT NOT NULL DEFAULT 'GET'
                            CHECK(method IN ('GET','POST','PUT','DELETE','PATCH')),
                url         TEXT NOT NULL DEFAULT '',
                sort        INTEGER NOT NULL DEFAULT 0,
                created_at  TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
            );

            -- 3. folder_configs
            CREATE TABLE IF NOT EXISTS folder_configs (
                folder_id     TEXT NOT NULL PRIMARY KEY REFERENCES folders(id) ON DELETE CASCADE,
                auth_type     TEXT NOT NULL DEFAULT 'none'
                              CHECK(auth_type IN ('none','bearer','basic')),
                auth_token    TEXT,
                auth_username TEXT,
                auth_password TEXT
            );

            -- 4. folder_config_params
            CREATE TABLE IF NOT EXISTS folder_config_params (
                id          TEXT NOT NULL PRIMARY KEY,
                folder_id   TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
                type        TEXT NOT NULL CHECK(type IN ('query','header')),
                key         TEXT NOT NULL,
                value       TEXT NOT NULL DEFAULT '',
                description TEXT NOT NULL DEFAULT '',
                enabled     INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
                sort        INTEGER NOT NULL DEFAULT 0
            );

            -- 5. api_configs
            CREATE TABLE IF NOT EXISTS api_configs (
                api_id        TEXT NOT NULL PRIMARY KEY REFERENCES apis(id) ON DELETE CASCADE,
                auth_type     TEXT NOT NULL DEFAULT 'none'
                              CHECK(auth_type IN ('none','bearer','basic')),
                auth_token    TEXT,
                auth_username TEXT,
                auth_password TEXT
            );

            -- 6. api_params (query + headers)
            CREATE TABLE IF NOT EXISTS api_params (
                id          TEXT NOT NULL PRIMARY KEY,
                api_id      TEXT NOT NULL REFERENCES apis(id) ON DELETE CASCADE,
                type        TEXT NOT NULL CHECK(type IN ('query','header')),
                key         TEXT NOT NULL,
                value       TEXT NOT NULL DEFAULT '',
                description TEXT NOT NULL DEFAULT '',
                enabled     INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
                sort        INTEGER NOT NULL DEFAULT 0
            );

            -- 7. api_cookies
            CREATE TABLE IF NOT EXISTS api_cookies (
                id     TEXT NOT NULL PRIMARY KEY,
                api_id TEXT NOT NULL REFERENCES apis(id) ON DELETE CASCADE,
                name   TEXT NOT NULL,
                value  TEXT NOT NULL DEFAULT ''
            );

            -- 8. api_bodies
            CREATE TABLE IF NOT EXISTS api_bodies (
                api_id      TEXT NOT NULL PRIMARY KEY REFERENCES apis(id) ON DELETE CASCADE,
                type        TEXT NOT NULL DEFAULT 'none'
                            CHECK(type IN ('none','json','form-data','x-www-form-urlencoded','text','xml','binary')),
                content     TEXT NOT NULL DEFAULT '',
                binary_path TEXT
            );

            -- 9. api_body_params
            CREATE TABLE IF NOT EXISTS api_body_params (
                id         TEXT NOT NULL PRIMARY KEY,
                api_id     TEXT NOT NULL REFERENCES apis(id) ON DELETE CASCADE,
                param_type TEXT NOT NULL CHECK(param_type IN ('form-data','urlencoded')),
                key        TEXT NOT NULL,
                value      TEXT NOT NULL DEFAULT '',
                enabled    INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1))
            );

            -- 10. tabs
            CREATE TABLE IF NOT EXISTS tabs (
                id       TEXT NOT NULL PRIMARY KEY,
                api_id   TEXT REFERENCES apis(id) ON DELETE SET NULL,
                sort     INTEGER NOT NULL DEFAULT 0,
                is_dirty INTEGER NOT NULL DEFAULT 0 CHECK(is_dirty IN (0,1))
            );

            -- 11. responses
            CREATE TABLE IF NOT EXISTS responses (
                api_id      TEXT NOT NULL PRIMARY KEY REFERENCES apis(id) ON DELETE CASCADE,
                status_code INTEGER,
                status_text TEXT,
                duration    INTEGER,
                size        INTEGER,
                headers     TEXT,
                cookies     TEXT,
                body        TEXT,
                updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
            );

            -- 12. settings
            CREATE TABLE IF NOT EXISTS settings (
                key   TEXT NOT NULL PRIMARY KEY,
                value TEXT
            );
            ",
        )?;

        // Migrations for existing databases
        // v2: make folder_id nullable
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS apis_v2 (
                id          TEXT NOT NULL PRIMARY KEY,
                folder_id   TEXT REFERENCES folders(id) ON DELETE CASCADE,
                name        TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                method      TEXT NOT NULL DEFAULT 'GET'
                            CHECK(method IN ('GET','POST','PUT','DELETE','PATCH')),
                url         TEXT NOT NULL DEFAULT '',
                sort        INTEGER NOT NULL DEFAULT 0,
                created_at  TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
            );
            INSERT OR IGNORE INTO apis_v2 SELECT * FROM apis;
            DROP TABLE IF EXISTS apis;
            ALTER TABLE apis_v2 RENAME TO apis;
            ",
        ).ok(); // Ignore errors — table may already be migrated

        // Indexes
        conn.execute_batch(
            "
            CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
            CREATE INDEX IF NOT EXISTS idx_folders_sort ON folders(parent_id, sort);
            CREATE INDEX IF NOT EXISTS idx_folders_name ON folders(name);
            CREATE INDEX IF NOT EXISTS idx_apis_folder_id ON apis(folder_id);
            CREATE INDEX IF NOT EXISTS idx_apis_sort ON apis(folder_id, sort);
            CREATE INDEX IF NOT EXISTS idx_apis_name ON apis(name);
            CREATE INDEX IF NOT EXISTS idx_apis_method ON apis(method);
            CREATE INDEX IF NOT EXISTS idx_fcp_folder_type ON folder_config_params(folder_id, type);
            CREATE INDEX IF NOT EXISTS idx_fcp_sort ON folder_config_params(folder_id, type, sort);
            CREATE INDEX IF NOT EXISTS idx_ap_api_type ON api_params(api_id, type);
            CREATE INDEX IF NOT EXISTS idx_ap_sort ON api_params(api_id, type, sort);
            CREATE INDEX IF NOT EXISTS idx_ac_api_id ON api_cookies(api_id);
            CREATE INDEX IF NOT EXISTS idx_abp_api_type ON api_body_params(api_id, param_type);
            CREATE INDEX IF NOT EXISTS idx_tabs_sort ON tabs(sort);
            CREATE INDEX IF NOT EXISTS idx_tabs_api_id ON tabs(api_id);
            ",
        )?;

        Ok(())
    }
}
