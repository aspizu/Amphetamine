use std::sync::Mutex;

mod commands {
    use super::*;

    #[tauri::command]
    #[specta::specta]
    pub fn set_activity(
        client: tauri::State<'_, Mutex<discord_presence::Client>>,
        activity: String,
    ) -> Result<(), String> {
        client
            .lock()
            .map_err(|error| error.to_string())?
            .set_activity(|current| current.state(activity))
            .map(|_| ())
            .map_err(|error| error.to_string())
    }
}

pub fn run() {
    let specta_builder = tauri_specta::Builder::<tauri::Wry>::new()
        .commands(tauri_specta::collect_commands![commands::set_activity]);

    #[cfg(debug_assertions)]
    specta_builder
        .export(
            specta_typescript::Typescript::default(),
            "../src/commands.gen.ts",
        )
        .expect("failed to export TypeScript bindings");

    let mut discord_client = discord_presence::Client::new(1521556506510885005);
    discord_client.start();

    tauri::Builder::default()
        .manage(Mutex::new(discord_client))
        .invoke_handler(specta_builder.invoke_handler())
        .plugin(tauri_plugin_fs::init())
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

#[cfg(test)]
mod tests {
    #[test]
    fn _export_typescript_bindings() {
        tauri_specta::Builder::<tauri::Wry>::new()
            .commands(tauri_specta::collect_commands![
                super::commands::set_activity
            ])
            .export(
                specta_typescript::Typescript::default(),
                "../src/commands.gen.ts",
            )
            .expect("failed to export TypeScript bindings");
    }
}
