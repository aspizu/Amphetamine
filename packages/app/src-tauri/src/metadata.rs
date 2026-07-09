use std::time::{SystemTime, UNIX_EPOCH};

use scraper::{Html, Selector};
use serde::Serialize;
use sqlx::SqlitePool;

const MODULE_URL: &str = "https://modarchive.org/index.php?request=view_by_moduleid&query=";

const CACHE_TTL_SECS: i64 = 7 * 24 * 60 * 60;

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ModMetadata {
    pub id: i64,
    pub filename: String,
    pub title: String,
    pub format: String,
    pub size: String,
    pub md5: String,
    pub channels: i64,
    pub genre: String,
    pub downloads: i64,
    pub favourites: i64,
    pub instrument_text: String,
    pub download_url: String,
}

fn now_unix() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

fn text_of(el: scraper::ElementRef) -> String {
    el.text().collect::<String>().trim().to_string()
}

fn parse_module_page(id: i64, html: &str) -> Result<ModMetadata, String> {
    let doc = Html::parse_document(html);

    let archive_info = Selector::parse(".mod-page-archive-info").unwrap();
    if doc.select(&archive_info).next().is_none() {
        return Err(format!("module {id} not found"));
    }

    // <h1>elysium <span class="module-sub-header">(ELYSIUM.MOD)</span></h1>
    let h1_sel = Selector::parse("h1").unwrap();
    let sub_sel = Selector::parse(".module-sub-header").unwrap();
    let h1 = doc.select(&h1_sel).next().ok_or("missing <h1>")?;
    let filename = h1
        .select(&sub_sel)
        .next()
        .map(|s| text_of(s).trim_matches(['(', ')']).to_string())
        .unwrap_or_default();
    let full_title = text_of(h1);
    let title = full_title
        .strip_suffix(&format!("({filename})"))
        .unwrap_or(&full_title)
        .trim()
        .to_string();

    let stats_sel = Selector::parse("li.stats").unwrap();
    let stats: Vec<String> = doc.select(&stats_sel).map(text_of).collect();
    let stat = |prefix: &str| -> Option<String> {
        stats
            .iter()
            .find_map(|s| s.strip_prefix(prefix).map(|v| v.trim().to_string()))
    };

    let format = stat("Format:").unwrap_or_default();
    let size = stat("Uncompressed Size:").unwrap_or_default();
    let md5 = stat("MD5:").unwrap_or_default();
    let genre = stat("Genre:").unwrap_or_default();
    let channels = stat("Channels:").and_then(|v| v.parse().ok()).unwrap_or(0);
    let downloads = stat("Downloads:").and_then(|v| v.parse().ok()).unwrap_or(0);
    let favourites = stat("Favourited:")
        .map(|v| v.replace(" times", ""))
        .and_then(|v| v.trim().parse().ok())
        .unwrap_or(0);

    let pre_sel = Selector::parse("pre").unwrap();
    let instrument_text = doc
        .select(&pre_sel)
        .nth(1)
        .map(|p| p.text().collect::<String>().trim().to_string())
        .unwrap_or_default();

    let download_url = format!("https://api.modarchive.org/downloads.php?moduleid={id}#{filename}");

    Ok(ModMetadata {
        id,
        filename,
        title,
        format,
        size,
        md5,
        channels,
        genre,
        downloads,
        favourites,
        instrument_text,
        download_url,
    })
}

async fn scrape_module(client: &reqwest::Client, id: i64) -> Result<ModMetadata, String> {
    let html = client
        .get(format!("{MODULE_URL}{id}"))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())?;
    parse_module_page(id, &html)
}

async fn get_or_fetch(
    db: &SqlitePool,
    http: &reqwest::Client,
    id: i64,
) -> Result<ModMetadata, String> {
    let now = now_unix();

    let cached = sqlx::query_as::<_, ModMetadata>(
        "SELECT id, filename, title, format, size, md5, channels, genre,
                downloads, favourites, instrument_text, download_url
         FROM module_metadata
         WHERE id = ?1 AND fetched_at > ?2",
    )
    .bind(id)
    .bind(now - CACHE_TTL_SECS)
    .fetch_optional(db)
    .await
    .map_err(|e| e.to_string())?;

    if let Some(row) = cached {
        sqlx::query("UPDATE module_metadata SET last_accessed_at = ?1 WHERE id = ?2")
            .bind(now)
            .bind(id)
            .execute(db)
            .await
            .map_err(|e| e.to_string())?;
        return Ok(row);
    }

    let meta = scrape_module(http, id).await?;

    sqlx::query(
        "INSERT INTO module_metadata
            (id, filename, title, format, size, md5, channels, genre,
             downloads, favourites, instrument_text, download_url,
             fetched_at, last_accessed_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)
         ON CONFLICT(id) DO UPDATE SET
            filename=excluded.filename, title=excluded.title, format=excluded.format,
            size=excluded.size, md5=excluded.md5, channels=excluded.channels,
            genre=excluded.genre, downloads=excluded.downloads,
            favourites=excluded.favourites, instrument_text=excluded.instrument_text,
            download_url=excluded.download_url, fetched_at=excluded.fetched_at,
            last_accessed_at=excluded.last_accessed_at",
    )
    .bind(meta.id)
    .bind(&meta.filename)
    .bind(&meta.title)
    .bind(&meta.format)
    .bind(&meta.size)
    .bind(&meta.md5)
    .bind(meta.channels)
    .bind(&meta.genre)
    .bind(meta.downloads)
    .bind(meta.favourites)
    .bind(&meta.instrument_text)
    .bind(&meta.download_url)
    .bind(now)
    .bind(now)
    .execute(db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(meta)
}

#[tauri::command]
pub async fn get_module_metadata(
    state: tauri::State<'_, crate::AppState>,
    id: i64,
) -> Result<ModMetadata, String> {
    get_or_fetch(&state.db, &state.http, id).await
}
