use std::sync::{Arc, Mutex};

mod commands {
    use super::*;
    use discord_presence::models::{
        ActivityType as DiscordActivityType, DisplayType as DiscordDisplayType,
    };
    use serde::Deserialize;
    use specta::Type;

    #[derive(Default, Deserialize, Type)]
    #[serde(default, rename_all = "camelCase")]
    pub struct Activity {
        pub state: Option<String>,
        pub details: Option<String>,
        pub instance: Option<bool>,
        pub status_display_type: Option<StatusDisplayType>,
        pub activity_type: Option<ActivityType>,
        pub timestamps: Option<ActivityTimestamps>,
        pub assets: Option<ActivityAssets>,
        pub party: Option<ActivityParty>,
        pub secrets: Option<ActivitySecrets>,
        pub buttons: Vec<ActivityButton>,
    }

    #[derive(Default, Deserialize, Type)]
    #[serde(default, rename_all = "camelCase")]
    pub struct ActivityTimestamps {
        pub start: Option<u32>,
        pub end: Option<u32>,
    }

    #[derive(Default, Deserialize, Type)]
    #[serde(default, rename_all = "camelCase")]
    pub struct ActivityAssets {
        pub large_image: Option<String>,
        pub large_text: Option<String>,
        pub small_image: Option<String>,
        pub small_text: Option<String>,
    }

    #[derive(Default, Deserialize, Type)]
    #[serde(default, rename_all = "camelCase")]
    pub struct ActivityParty {
        pub id: Option<String>,
        pub size: Option<(u32, u32)>,
    }

    #[derive(Default, Deserialize, Type)]
    #[serde(default)]
    pub struct ActivitySecrets {
        pub join: Option<String>,
        pub spectate: Option<String>,
        #[serde(rename = "match")]
        pub game: Option<String>,
    }

    #[derive(Default, Deserialize, Type)]
    #[serde(default)]
    pub struct ActivityButton {
        pub label: Option<String>,
        pub url: Option<String>,
    }

    #[derive(Deserialize, Type)]
    #[serde(rename_all = "camelCase")]
    pub enum ActivityType {
        Playing,
        Listening,
        Watching,
        Competing,
    }

    #[derive(Deserialize, Type)]
    #[serde(rename_all = "camelCase")]
    pub enum StatusDisplayType {
        Name,
        State,
        Details,
    }

    #[tauri::command]
    #[specta::specta]
    pub async fn set_activity(
        client: tauri::State<'_, Arc<Mutex<discord_presence::Client>>>,
        activity: Activity,
    ) -> Result<(), String> {
        let client = Arc::clone(client.inner());

        tauri::async_runtime::spawn_blocking(move || {
            let Activity {
                state,
                details,
                instance,
                status_display_type,
                activity_type,
                timestamps,
                assets,
                party,
                secrets,
                buttons,
            } = activity;

            client
                .lock()
                .map_err(|error| error.to_string())?
                .set_activity(|mut current| {
                    if let Some(state) = state {
                        current = current.state(state);
                    }
                    if let Some(details) = details {
                        current = current.details(details);
                    }
                    if let Some(instance) = instance {
                        current = current.instance(instance);
                    }
                    if let Some(status_display_type) = status_display_type {
                        current = current.status_display(match status_display_type {
                            StatusDisplayType::Name => DiscordDisplayType::Name,
                            StatusDisplayType::State => DiscordDisplayType::State,
                            StatusDisplayType::Details => DiscordDisplayType::Details,
                        });
                    }
                    if let Some(activity_type) = activity_type {
                        current = current.activity_type(match activity_type {
                            ActivityType::Playing => DiscordActivityType::Playing,
                            ActivityType::Listening => DiscordActivityType::Listening,
                            ActivityType::Watching => DiscordActivityType::Watching,
                            ActivityType::Competing => DiscordActivityType::Competing,
                        });
                    }
                    if let Some(timestamps) = timestamps {
                        current = current.timestamps(|mut current| {
                            if let Some(start) = timestamps.start {
                                current = current.start(u64::from(start));
                            }
                            if let Some(end) = timestamps.end {
                                current = current.end(u64::from(end));
                            }
                            current
                        });
                    }
                    if let Some(assets) = assets {
                        current = current.assets(|mut current| {
                            if let Some(large_image) = assets.large_image {
                                current = current.large_image(large_image);
                            }
                            if let Some(large_text) = assets.large_text {
                                current = current.large_text(large_text);
                            }
                            if let Some(small_image) = assets.small_image {
                                current = current.small_image(small_image);
                            }
                            if let Some(small_text) = assets.small_text {
                                current = current.small_text(small_text);
                            }
                            current
                        });
                    }
                    if let Some(party) = party {
                        current = current.party(|mut current| {
                            if let Some(id) = party.id {
                                current = current.id(id);
                            }
                            if let Some(size) = party.size {
                                current = current.size(size);
                            }
                            current
                        });
                    }
                    if let Some(secrets) = secrets {
                        current = current.secrets(|mut current| {
                            if let Some(join) = secrets.join {
                                current = current.join(join);
                            }
                            if let Some(spectate) = secrets.spectate {
                                current = current.spectate(spectate);
                            }
                            if let Some(game) = secrets.game {
                                current = current.game(game);
                            }
                            current
                        });
                    }
                    for button in buttons {
                        current = current.append_buttons(|mut current| {
                            if let Some(label) = button.label {
                                current = current.label(label);
                            }
                            if let Some(url) = button.url {
                                current = current.url(url);
                            }
                            current
                        });
                    }
                    current
                })
                .map(|_| ())
                .map_err(|error| error.to_string())
        })
        .await
        .map_err(|error| error.to_string())?
    }

    #[tauri::command]
    #[specta::specta]
    pub async fn clear_activity(
        client: tauri::State<'_, Arc<Mutex<discord_presence::Client>>>,
    ) -> Result<(), String> {
        let client = Arc::clone(client.inner());

        tauri::async_runtime::spawn_blocking(move || {
            client
                .lock()
                .map_err(|error| error.to_string())?
                .clear_activity()
                .map(|_| ())
                .map_err(|error| error.to_string())
        })
        .await
        .map_err(|error| error.to_string())?
    }
}

pub fn run() {
    let specta_builder =
        tauri_specta::Builder::<tauri::Wry>::new().commands(tauri_specta::collect_commands![
            commands::set_activity,
            commands::clear_activity
        ]);

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
        .manage(Arc::new(Mutex::new(discord_client)))
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
                super::commands::set_activity,
                super::commands::clear_activity
            ])
            .export(
                specta_typescript::Typescript::default(),
                "../src/commands.gen.ts",
            )
            .expect("failed to export TypeScript bindings");
    }
}
