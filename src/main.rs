// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;

use std::sync::{Arc, Mutex};
use sqlx::SqlitePool;
use tauri::State;

struct AppState {
    db: Arc<Mutex<Option<SqlitePool>>>,
}

#[tauri::command]
async fn init_database(state: State<'_, AppState>) -> Result<String, String> {
    let pool = db::init_db("pinewood.db")
        .await
        .map_err(|e| format!("Failed to initialize database: {}", e))?;

    let mut db_lock = state.db.lock().unwrap();
    *db_lock = Some(pool);

    Ok("Database initialized".to_string())
}

#[tauri::command]
async fn checkin_scout(
    state: State<'_, AppState>,
    name: String,
    den: String,
    car_number: i32,
    car_weight: f64,
) -> Result<db::Scout, String> {
    let pool = {
        let db_lock = state.db.lock().unwrap();
        db_lock
            .as_ref()
            .ok_or("Database not initialized")?
            .clone()
    };

    let new_scout = db::NewScout {
        name,
        den,
        car_number,
        car_weight,
    };

    db::checkin_scout(&pool, new_scout)
        .await
        .map_err(|e| format!("Failed to check in scout: {}", e))
}

#[tauri::command]
async fn get_checked_in_scouts(state: State<'_, AppState>) -> Result<Vec<db::Scout>, String> {
    let pool = {
        let db_lock = state.db.lock().unwrap();
        db_lock
            .as_ref()
            .ok_or("Database not initialized")?
            .clone()
    };

    db::get_checked_in_scouts(&pool)
        .await
        .map_err(|e| format!("Failed to get scouts: {}", e))
}

#[tauri::command]
async fn get_next_car_number(state: State<'_, AppState>) -> Result<i32, String> {
    let pool = {
        let db_lock = state.db.lock().unwrap();
        db_lock
            .as_ref()
            .ok_or("Database not initialized")?
            .clone()
    };

    db::get_next_car_number(&pool)
        .await
        .map_err(|e| format!("Failed to get next car number: {}", e))
}

fn main() {
    tauri::Builder::default()
        .manage(AppState {
            db: Arc::new(Mutex::new(None)),
        })
        .invoke_handler(tauri::generate_handler![
            init_database,
            checkin_scout,
            get_checked_in_scouts,
            get_next_car_number
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
