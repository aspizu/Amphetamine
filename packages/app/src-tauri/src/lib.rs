use tauri_plugin_sql::{Migration, MigrationKind};

const CACHE_DB: &str = "sqlite:cache.db";

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
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
