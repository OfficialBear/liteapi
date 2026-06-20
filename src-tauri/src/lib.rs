mod commands;
mod db;

use db::Database;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Resolve app data directory
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data directory");

            // Initialize database
            let database = Database::open(app_data_dir)
                .expect("failed to initialize database");

            // Store database as managed state
            app.manage(database);

            // Logger plugin in debug mode
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::init_app,
            commands::create_folder,
            commands::update_folder,
            commands::delete_folder,
            commands::create_api,
            commands::update_api,
            commands::delete_api,
            commands::copy_folder,
            commands::copy_api,
            commands::save_tabs,
            commands::get_setting,
            commands::set_setting,
            commands::export_all_data,
            commands::import_all_data,
            commands::send_http_request,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
