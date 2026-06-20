use crate::db::Database;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Instant;
use tauri::State;

// ─── Data types ──────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Folder {
    pub id: String,
    pub parent_id: Option<String>,
    pub name: String,
    pub sort: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Api {
    pub id: String,
    pub folder_id: Option<String>,
    pub name: String,
    pub description: String,
    pub method: String,
    pub url: String,
    pub sort: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Tab {
    pub id: String,
    pub api_id: Option<String>,
    pub sort: i32,
    pub is_dirty: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InitData {
    pub folders: Vec<Folder>,
    pub apis: Vec<Api>,
    pub tabs: Vec<Tab>,
    pub settings: Vec<Setting>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Setting {
    pub key: String,
    pub value: Option<String>,
}

// ─── Init ────────────────────────────────────────────────

#[tauri::command]
pub fn init_app(db: State<Database>) -> Result<InitData, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT id, parent_id, name, sort, created_at, updated_at FROM folders ORDER BY sort"
    ).map_err(|e| e.to_string())?;
    let folders: Vec<Folder> = stmt.query_map([], |row| {
        Ok(Folder {
            id: row.get(0)?,
            parent_id: row.get(1)?,
            name: row.get(2)?,
            sort: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?
      .filter_map(|r| r.ok())
      .collect();

    let mut stmt = conn.prepare(
        "SELECT id, folder_id, name, description, method, url, sort, created_at, updated_at FROM apis ORDER BY sort"
    ).map_err(|e| e.to_string())?;
    let apis: Vec<Api> = stmt.query_map([], |row| {
        Ok(Api {
            id: row.get(0)?,
            folder_id: row.get(1)?,
            name: row.get(2)?,
            description: row.get(3)?,
            method: row.get(4)?,
            url: row.get(5)?,
            sort: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?
      .filter_map(|r| r.ok())
      .collect();

    let mut stmt = conn.prepare(
        "SELECT id, api_id, sort, is_dirty FROM tabs ORDER BY sort"
    ).map_err(|e| e.to_string())?;
    let tabs: Vec<Tab> = stmt.query_map([], |row| {
        Ok(Tab {
            id: row.get(0)?,
            api_id: row.get(1)?,
            sort: row.get(2)?,
            is_dirty: row.get::<_, i32>(3).unwrap_or(0) != 0,
        })
    }).map_err(|e| e.to_string())?
      .filter_map(|r| r.ok())
      .collect();

    let mut stmt = conn.prepare(
        "SELECT key, value FROM settings"
    ).map_err(|e| e.to_string())?;
    let settings: Vec<Setting> = stmt.query_map([], |row| {
        Ok(Setting {
            key: row.get(0)?,
            value: row.get(1)?,
        })
    }).map_err(|e| e.to_string())?
      .filter_map(|r| r.ok())
      .collect();

    Ok(InitData { folders, apis, tabs, settings })
}

// ─── Folders ─────────────────────────────────────────────

#[tauri::command]
pub fn create_folder(db: State<Database>, id: String, parent_id: Option<String>, name: String) -> Result<Folder, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();

    // Get next sort value
    let max_sort: i32 = conn.query_row(
        "SELECT COALESCE(MAX(sort), -1) FROM folders WHERE parent_id IS ?",
        params![parent_id],
        |row| row.get(0),
    ).unwrap_or(-1);

    conn.execute(
        "INSERT INTO folders (id, parent_id, name, sort, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, parent_id, name, max_sort + 1, now, now],
    ).map_err(|e| e.to_string())?;

    Ok(Folder {
        id,
        parent_id,
        name,
        sort: max_sort + 1,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_folder(db: State<Database>, id: String, name: Option<String>, parent_id: Option<Option<String>>, sort: Option<i32>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();

    if let Some(n) = name {
        conn.execute("UPDATE folders SET name = ?1, updated_at = ?2 WHERE id = ?3", params![n, now, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(pid) = parent_id {
        conn.execute("UPDATE folders SET parent_id = ?1, updated_at = ?2 WHERE id = ?3", params![pid, now, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(s) = sort {
        conn.execute("UPDATE folders SET sort = ?1, updated_at = ?2 WHERE id = ?3", params![s, now, id])
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn delete_folder(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    // Recursive delete of all child folders (CASCADE handles FK children)
    fn delete_recursive(conn: &rusqlite::Connection, folder_id: &str) -> Result<(), String> {
        let mut stmt = conn.prepare("SELECT id FROM folders WHERE parent_id = ?1")
            .map_err(|e| e.to_string())?;
        let children: Vec<String> = stmt.query_map(params![folder_id], |row| row.get(0))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        for child in children {
            delete_recursive(conn, &child)?;
        }
        conn.execute("DELETE FROM folders WHERE id = ?1", params![folder_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    delete_recursive(&conn, &id)
}

// ─── APIs ────────────────────────────────────────────────

#[tauri::command]
pub fn create_api(
    db: State<Database>,
    id: String,
    folder_id: Option<String>,
    name: String,
    method: String,
    url: String,
) -> Result<Api, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();

    let max_sort: i32 = if folder_id.is_some() {
        conn.query_row(
            "SELECT COALESCE(MAX(sort), -1) FROM apis WHERE folder_id = ?1",
            params![folder_id],
            |row| row.get(0),
        ).unwrap_or(-1)
    } else {
        conn.query_row(
            "SELECT COALESCE(MAX(sort), -1) FROM apis WHERE folder_id IS NULL",
            [],
            |row| row.get(0),
        ).unwrap_or(-1)
    };

    conn.execute(
        "INSERT INTO apis (id, folder_id, name, method, url, sort, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![id, folder_id, name, method, url, max_sort + 1, now, now],
    ).map_err(|e| e.to_string())?;

    // Also create default api_configs and api_bodies
    conn.execute("INSERT OR IGNORE INTO api_configs (api_id) VALUES (?1)", params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("INSERT OR IGNORE INTO api_bodies (api_id) VALUES (?1)", params![id])
        .map_err(|e| e.to_string())?;

    Ok(Api {
        id,
        folder_id,
        name,
        description: String::new(),
        method,
        url,
        sort: max_sort + 1,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn delete_api(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM apis WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_api(
    db: State<Database>,
    id: String,
    name: Option<String>,
    method: Option<String>,
    url: Option<String>,
    folder_id: Option<Option<String>>,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();

    if let Some(n) = name {
        conn.execute("UPDATE apis SET name = ?1, updated_at = ?2 WHERE id = ?3", params![n, now, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(m) = method {
        conn.execute("UPDATE apis SET method = ?1, updated_at = ?2 WHERE id = ?3", params![m, now, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(u) = url {
        conn.execute("UPDATE apis SET url = ?1, updated_at = ?2 WHERE id = ?3", params![u, now, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(fid) = folder_id {
        conn.execute("UPDATE apis SET folder_id = ?1, updated_at = ?2 WHERE id = ?3", params![fid, now, id])
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn copy_folder(db: State<Database>, source_id: String, new_parent_id: Option<String>, new_name: String) -> Result<Folder, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    let new_id = uuid::Uuid::new_v4().to_string();

    // Get source folder
    let (_old_name, parent_id, sort): (String, Option<String>, i32) = conn.query_row(
        "SELECT name, parent_id, sort FROM folders WHERE id = ?1",
        params![source_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    ).map_err(|e| e.to_string())?;

    let target_parent = new_parent_id.or(parent_id);

    // Insert the new folder
    conn.execute(
        "INSERT INTO folders (id, parent_id, name, sort, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![new_id, target_parent, new_name, sort + 1, now, now],
    ).map_err(|e| e.to_string())?;

    // Copy folder_configs
    let fc: Option<(String, Option<String>, Option<String>, Option<String>)> = conn.query_row(
        "SELECT auth_type, auth_token, auth_username, auth_password FROM folder_configs WHERE folder_id = ?1",
        params![source_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
    ).ok();
    if let Some((at, tok, un, pw)) = fc {
        conn.execute(
            "INSERT OR IGNORE INTO folder_configs (folder_id, auth_type, auth_token, auth_username, auth_password) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![new_id, at, tok, un, pw],
        ).map_err(|e| e.to_string())?;
    }

    // Copy folder_config_params (one new UUID per row)
    {
        let mut stmt = conn.prepare(
            "SELECT type, key, value, description, enabled, sort FROM folder_config_params WHERE folder_id = ?1",
        ).map_err(|e| e.to_string())?;
        let rows: Vec<(String, String, String, String, i32, i32)> = stmt.query_map(params![source_id], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?, row.get(5)?))
        }).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();
        for (typ, key, val, desc, enabled, sort) in &rows {
            conn.execute(
                "INSERT INTO folder_config_params (id, folder_id, type, key, value, description, enabled, sort) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![uuid::Uuid::new_v4().to_string(), new_id, typ, key, val, desc, enabled, sort],
            ).map_err(|e| e.to_string())?;
        }
    }

    // Recursively copy child folders
    let mut child_stmt = conn.prepare("SELECT id FROM folders WHERE parent_id = ?1").map_err(|e| e.to_string())?;
    let children: Vec<String> = child_stmt.query_map(params![source_id], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    drop(child_stmt);
    for child_id in children {
        let child_name: String = conn.query_row("SELECT name FROM folders WHERE id = ?1", params![child_id], |row| row.get(0))
            .map_err(|e| e.to_string())?;
        copy_folder_internal(&conn, &child_id, Some(&new_id), &child_name)?;
    }

    // Copy APIs in this folder
    let mut api_stmt = conn.prepare("SELECT id, name FROM apis WHERE folder_id = ?1").map_err(|e| e.to_string())?;
    let apis: Vec<(String, String)> = api_stmt.query_map(params![source_id], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    drop(api_stmt);
    for (api_id, api_name) in apis {
        copy_api_internal(&conn, &api_id, Some(&new_id), &api_name)?;
    }

    Ok(Folder { id: new_id, parent_id: target_parent, name: new_name, sort: sort + 1, created_at: now.clone(), updated_at: now })
}

fn copy_folder_internal(conn: &rusqlite::Connection, source_id: &str, new_parent_id: Option<&str>, new_name: &str) -> Result<String, String> {
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    let new_id = uuid::Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO folders (id, parent_id, name, sort, created_at, updated_at) VALUES (?1, ?2, ?3, 0, ?4, ?5)",
        params![new_id, new_parent_id, new_name, now, now],
    ).map_err(|e| e.to_string())?;

    // Children
    let mut stmt = conn.prepare("SELECT id, name FROM folders WHERE parent_id = ?1").map_err(|e| e.to_string())?;
    let children: Vec<(String, String)> = stmt.query_map(params![source_id], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    drop(stmt);
    for (child_id, child_name) in children {
        copy_folder_internal(conn, &child_id, Some(&new_id), &child_name)?;
    }

    // APIs
    let mut api_stmt = conn.prepare("SELECT id, name FROM apis WHERE folder_id = ?1").map_err(|e| e.to_string())?;
    let apis: Vec<(String, String)> = api_stmt.query_map(params![source_id], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    drop(api_stmt);
    for (api_id, api_name) in apis {
        copy_api_internal(conn, &api_id, Some(&new_id), &api_name)?;
    }

    Ok(new_id)
}

fn copy_api_internal(conn: &rusqlite::Connection, source_id: &str, new_folder_id: Option<&str>, new_name: &str) -> Result<String, String> {
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    let new_id = uuid::Uuid::new_v4().to_string();

    // Get source method & url
    let (method, url, description): (String, String, String) = conn.query_row(
        "SELECT method, url, description FROM apis WHERE id = ?1",
        params![source_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    ).map_err(|e| format!("API not found: {}", e))?;

    conn.execute(
        "INSERT INTO apis (id, folder_id, name, description, method, url, sort, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7, ?8)",
        params![new_id, new_folder_id, new_name, description, method, url, now, now],
    ).map_err(|e| e.to_string())?;

    // Copy configs
    conn.execute(
        "INSERT INTO api_configs (api_id, auth_type, auth_token, auth_username, auth_password)
         SELECT ?1, auth_type, auth_token, auth_username, auth_password FROM api_configs WHERE api_id = ?2",
        params![new_id, source_id],
    ).map_err(|e| e.to_string())?;

    // Copy api_params (one new UUID per row)
    {
        let mut stmt = conn.prepare(
            "SELECT type, key, value, description, enabled, sort FROM api_params WHERE api_id = ?1",
        ).map_err(|e| e.to_string())?;
        let rows: Vec<(String, String, String, String, i32, i32)> = stmt.query_map(params![source_id], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?, row.get(5)?))
        }).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();
        for (typ, key, val, desc, enabled, sort) in &rows {
            conn.execute(
                "INSERT INTO api_params (id, api_id, type, key, value, description, enabled, sort) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![uuid::Uuid::new_v4().to_string(), new_id, typ, key, val, desc, enabled, sort],
            ).map_err(|e| e.to_string())?;
        }
    }

    // Copy api_cookies (one new UUID per row)
    {
        let mut stmt = conn.prepare(
            "SELECT name, value FROM api_cookies WHERE api_id = ?1",
        ).map_err(|e| e.to_string())?;
        let rows: Vec<(String, String)> = stmt.query_map(params![source_id], |row| {
            Ok((row.get(0)?, row.get(1)?))
        }).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();
        for (name, val) in &rows {
            conn.execute(
                "INSERT INTO api_cookies (id, api_id, name, value) VALUES (?1, ?2, ?3, ?4)",
                params![uuid::Uuid::new_v4().to_string(), new_id, name, val],
            ).map_err(|e| e.to_string())?;
        }
    }

    conn.execute(
        "INSERT INTO api_bodies (api_id, type, content, binary_path)
         SELECT ?1, type, content, binary_path FROM api_bodies WHERE api_id = ?2",
        params![new_id, source_id],
    ).map_err(|e| e.to_string())?;

    // Copy api_body_params (one new UUID per row)
    {
        let mut stmt = conn.prepare(
            "SELECT param_type, key, value, enabled FROM api_body_params WHERE api_id = ?1",
        ).map_err(|e| e.to_string())?;
        let rows: Vec<(String, String, String, i32)> = stmt.query_map(params![source_id], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        }).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();
        for (ptype, key, val, enabled) in &rows {
            conn.execute(
                "INSERT INTO api_body_params (id, api_id, param_type, key, value, enabled) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![uuid::Uuid::new_v4().to_string(), new_id, ptype, key, val, enabled],
            ).map_err(|e| e.to_string())?;
        }
    }

    Ok(new_id)
}

#[tauri::command]
pub fn copy_api(db: State<Database>, source_id: String, target_folder_id: Option<String>, new_name: String) -> Result<Api, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();

    let new_id = copy_api_internal(&conn, &source_id, target_folder_id.as_deref(), &new_name)?;

    // Get the new API data
    let (method, url, desc, folder_id): (String, String, String, Option<String>) = conn.query_row(
        "SELECT method, url, description, folder_id FROM apis WHERE id = ?1",
        params![new_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
    ).map_err(|e| e.to_string())?;

    Ok(Api { id: new_id, folder_id, name: new_name, description: desc, method, url, sort: 0, created_at: now.clone(), updated_at: now })
}

// ─── Tabs ────────────────────────────────────────────────

#[tauri::command]
pub fn save_tabs(db: State<Database>, tabs: Vec<Tab>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM tabs", []).map_err(|e| e.to_string())?;
    for tab in &tabs {
        conn.execute(
            "INSERT INTO tabs (id, api_id, sort, is_dirty) VALUES (?1, ?2, ?3, ?4)",
            params![tab.id, tab.api_id, tab.sort, tab.is_dirty as i32],
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ─── Settings ────────────────────────────────────────────

#[tauri::command]
pub fn get_setting(db: State<Database>, key: String) -> Result<Option<String>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let result = conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![key],
        |row| row.get(0),
    );
    match result {
        Ok(val) => Ok(val),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn set_setting(db: State<Database>, key: String, value: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        params![key, value],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Data Export/Import ─────────────────────────────────

use serde_json::Value;

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportData {
    pub version: i32,
    pub exported_at: String,
    pub folders: Vec<Value>,
    pub apis: Vec<Value>,
    pub folder_configs: Vec<Value>,
    pub folder_config_params: Vec<Value>,
    pub api_configs: Vec<Value>,
    pub api_params: Vec<Value>,
    pub api_cookies: Vec<Value>,
    pub api_bodies: Vec<Value>,
    pub api_body_params: Vec<Value>,
    pub responses: Vec<Value>,
    pub settings: Vec<Value>,
}

fn query_all(conn: &rusqlite::Connection, table: &str) -> Result<Vec<Value>, String> {
    let sql = format!("SELECT * FROM {}", table);
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let col_count = stmt.column_count();
    let col_names: Vec<String> = (0..col_count)
        .map(|i| stmt.column_name(i).unwrap_or("?").to_string())
        .collect();

    let rows: Vec<Value> = stmt
        .query_map([], |row| {
            let mut map = serde_json::Map::new();
            for (i, name) in col_names.iter().enumerate() {
                let val: rusqlite::Result<String> = row.get(i);
                match val {
                    Ok(v) => { map.insert(name.clone(), Value::String(v)); }
                    Err(_) => { map.insert(name.clone(), Value::Null); }
                }
            }
            Ok(Value::Object(map))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(rows)
}

#[tauri::command]
pub fn export_all_data(db: State<Database>) -> Result<String, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let data = ExportData {
        version: 1,
        exported_at: chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string(),
        folders: query_all(&conn, "folders")?,
        apis: query_all(&conn, "apis")?,
        folder_configs: query_all(&conn, "folder_configs")?,
        folder_config_params: query_all(&conn, "folder_config_params")?,
        api_configs: query_all(&conn, "api_configs")?,
        api_params: query_all(&conn, "api_params")?,
        api_cookies: query_all(&conn, "api_cookies")?,
        api_bodies: query_all(&conn, "api_bodies")?,
        api_body_params: query_all(&conn, "api_body_params")?,
        responses: query_all(&conn, "responses")?,
        settings: query_all(&conn, "settings")?,
    };

    serde_json::to_string_pretty(&data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_all_data(db: State<Database>, json_str: String) -> Result<(), String> {
    let data: ExportData = serde_json::from_str(&json_str).map_err(|e| format!("Invalid JSON: {}", e))?;

    if data.version != 1 {
        return Err(format!("Unsupported version: {}", data.version));
    }

    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    // Wrap everything in a transaction
    conn.execute("BEGIN", []).map_err(|e| e.to_string())?;

    let result = (|| -> Result<(), String> {
        // Clear all data (order matters for FK constraints)
        conn.execute("DELETE FROM api_body_params", []).map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM api_bodies", []).map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM api_cookies", []).map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM api_params", []).map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM api_configs", []).map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM responses", []).map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM folder_config_params", []).map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM folder_configs", []).map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM tabs", []).map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM apis", []).map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM folders", []).map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM settings", []).map_err(|e| e.to_string())?;

        // Helper to insert row from Value object
        fn insert_rows(conn: &rusqlite::Connection, table: &str, rows: &[Value]) -> Result<(), String> {
            for row in rows {
                if let Value::Object(map) = row {
                    let keys: Vec<&str> = map.keys().map(|k| k.as_str()).collect();
                    let vals: Vec<String> = map.values().map(|v| {
                        match v {
                            Value::String(s) => s.clone(),
                            Value::Null => String::new(),
                            other => other.to_string(),
                        }
                    }).collect();

                    if keys.is_empty() { continue; }

                    let placeholders: Vec<&str> = keys.iter().map(|_| "?").collect();
                    let sql = format!(
                        "INSERT OR REPLACE INTO {} ({}) VALUES ({})",
                        table,
                        keys.join(", "),
                        placeholders.join(", ")
                    );

                    let params: Vec<&dyn rusqlite::types::ToSql> = vals.iter()
                        .map(|v| v as &dyn rusqlite::types::ToSql)
                        .collect();

                    conn.execute(&sql, params.as_slice()).map_err(|e| {
                        format!("Failed to insert into {}: {}", table, e)
                    })?;
                }
            }
            Ok(())
        }

        insert_rows(&conn, "folders", &data.folders)?;
        insert_rows(&conn, "apis", &data.apis)?;
        insert_rows(&conn, "folder_configs", &data.folder_configs)?;
        insert_rows(&conn, "folder_config_params", &data.folder_config_params)?;
        insert_rows(&conn, "api_configs", &data.api_configs)?;
        insert_rows(&conn, "api_params", &data.api_params)?;
        insert_rows(&conn, "api_cookies", &data.api_cookies)?;
        insert_rows(&conn, "api_bodies", &data.api_bodies)?;
        insert_rows(&conn, "api_body_params", &data.api_body_params)?;
        insert_rows(&conn, "responses", &data.responses)?;
        insert_rows(&conn, "settings", &data.settings)?;

        Ok(())
    })();

    match result {
        Ok(()) => {
            conn.execute("COMMIT", []).map_err(|e| e.to_string())?;
            Ok(())
        }
        Err(e) => {
            conn.execute("ROLLBACK", []).map_err(|e2| e2.to_string())?;
            Err(e)
        }
    }
}

// ─── HTTP Request ────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct HttpKeyValue {
    pub key: String,
    pub value: String,
    pub enabled: bool,
}

#[derive(Debug, Deserialize)]
pub struct HttpRequestConfig {
    pub method: String,
    pub url: String,
    pub headers: Vec<HttpKeyValue>,
    pub query_params: Vec<HttpKeyValue>,
    pub body_type: String,
    pub body_content: String,
    pub auth_type: String,
    pub auth_token: Option<String>,
    pub auth_username: Option<String>,
    pub auth_password: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct HttpResponseData {
    pub status: u16,
    pub status_text: String,
    pub duration: u64,
    pub size: u64,
    pub headers: HashMap<String, String>,
    pub body: String,
}

#[tauri::command]
pub async fn send_http_request(config: HttpRequestConfig) -> Result<HttpResponseData, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .danger_accept_invalid_certs(false)
        .build()
        .map_err(|e| e.to_string())?;

    let mut req = client.request(
        reqwest::Method::from_bytes(config.method.as_bytes()).unwrap_or(reqwest::Method::GET),
        &config.url,
    );

    // Query params
    for q in &config.query_params {
        if q.enabled && !q.key.is_empty() {
            req = req.query(&[(&q.key, &q.value)]);
        }
    }

    // Headers
    for h in &config.headers {
        if h.enabled && !h.key.is_empty() {
            req = req.header(&h.key, &h.value);
        }
    }

    // Auth
    match config.auth_type.as_str() {
        "bearer" => {
            if let Some(tok) = &config.auth_token {
                req = req.header("Authorization", format!("Bearer {}", tok));
            }
        }
        "basic" => {
            if let (Some(u), Some(p)) = (&config.auth_username, &config.auth_password) {
                req = req.basic_auth(u, Some(p));
            }
        }
        _ => {}
    }

    // Body
    if config.method != "GET" && config.body_type != "none" {
        match config.body_type.as_str() {
            "json" => {
                req = req.header("Content-Type", "application/json");
                req = req.body(config.body_content.clone());
            }
            "raw" | "text" | "xml" => {
                req = req.body(config.body_content.clone());
            }
            "x-www-form-urlencoded" => {
                req = req.header("Content-Type", "application/x-www-form-urlencoded");
                req = req.body(config.body_content.clone());
            }
            "form-data" => {
                req = req.body(config.body_content.clone());
            }
            "binary" => {
                req = req.header("Content-Type", "application/octet-stream");
                req = req.body(config.body_content.clone());
            }
            _ => {}
        }
    }

    let start = Instant::now();
    let resp = req.send().await.map_err(|e| {
        if e.is_timeout() {
            "Request timed out".to_string()
        } else if e.is_connect() {
            format!("Connection failed: {}", e)
        } else {
            format!("Request failed: {}", e)
        }
    })?;

    let duration = start.elapsed().as_millis() as u64;
    let status = resp.status().as_u16();
    let status_text = resp.status().canonical_reason().unwrap_or("").to_string();

    let resp_headers: HashMap<String, String> = resp
        .headers()
        .iter()
        .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
        .collect();

    let body = resp.text().await.map_err(|e| e.to_string())?;
    let size = body.len() as u64;

    Ok(HttpResponseData {
        status,
        status_text,
        duration,
        size,
        headers: resp_headers,
        body,
    })
}
