mod metadata;

use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

const CACHE_DB: &str = "sqlite:cache.db";

pub struct AppState {
    pub http: reqwest::Client,
    pub db: sqlx::SqlitePool,
}

fn module_cache_migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create_module_cache_table",
        sql: include_str!("migrations/001_module_cache.sql"),
        kind: MigrationKind::Up,
    }]
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(CACHE_DB, module_cache_migrations())
                .build(),
        )
        .setup(|app| {
            let db_path = app
                .path()
                .app_config_dir()
                .expect("no app config dir")
                .join("cache.db");

            let http = reqwest::Client::builder()
                .cookie_store(true)
                .build()
                .expect("failed to build http client");

            let db = tauri::async_runtime::block_on(async {
                let opts = SqliteConnectOptions::new().filename(&db_path);
                SqlitePoolOptions::new()
                    .connect_with(opts)
                    .await
                    .expect("failed to open cache db")
            });

            app.manage(AppState { http, db });

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![metadata::get_module_metadata])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
