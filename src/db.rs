use sqlx::{SqlitePool, sqlite::SqlitePoolOptions, Row};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Scout {
    pub id: i64,
    pub name: String,
    pub den: String,
    pub car_number: i32,
    pub car_weight: f64,
    pub checked_in: bool,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewScout {
    pub name: String,
    pub den: String,
    pub car_number: i32,
    pub car_weight: f64,
}

pub async fn init_db(db_path: &str) -> Result<SqlitePool, sqlx::Error> {
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&format!("sqlite:{}", db_path))
        .await?;

    // Create scouts table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS scouts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            den TEXT NOT NULL,
            car_number INTEGER UNIQUE NOT NULL,
            car_weight REAL NOT NULL,
            checked_in BOOLEAN NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // Create race_config table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS race_config (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            num_lanes INTEGER NOT NULL DEFAULT 4,
            timer_port TEXT,
            heats_per_scout INTEGER NOT NULL DEFAULT 3,
            scoring_method TEXT NOT NULL DEFAULT 'points'
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // Insert default config if not exists
    sqlx::query(
        r#"
        INSERT OR IGNORE INTO race_config (id, num_lanes, heats_per_scout, scoring_method)
        VALUES (1, 4, 3, 'points')
        "#,
    )
    .execute(&pool)
    .await?;

    Ok(pool)
}

pub async fn checkin_scout(
    pool: &SqlitePool,
    new_scout: NewScout,
) -> Result<Scout, sqlx::Error> {
    let result = sqlx::query(
        r#"
        INSERT INTO scouts (name, den, car_number, car_weight, checked_in)
        VALUES (?, ?, ?, ?, 1)
        "#,
    )
    .bind(&new_scout.name)
    .bind(&new_scout.den)
    .bind(new_scout.car_number)
    .bind(new_scout.car_weight)
    .execute(pool)
    .await?;

    let scout_id = result.last_insert_rowid();

    // Fetch the created scout
    get_scout_by_id(pool, scout_id).await
}

pub async fn get_scout_by_id(pool: &SqlitePool, id: i64) -> Result<Scout, sqlx::Error> {
    let row = sqlx::query(
        r#"
        SELECT id, name, den, car_number, car_weight, checked_in, created_at
        FROM scouts
        WHERE id = ?
        "#,
    )
    .bind(id)
    .fetch_one(pool)
    .await?;

    Ok(Scout {
        id: row.get("id"),
        name: row.get("name"),
        den: row.get("den"),
        car_number: row.get("car_number"),
        car_weight: row.get("car_weight"),
        checked_in: row.get("checked_in"),
        created_at: row.get("created_at"),
    })
}

pub async fn get_checked_in_scouts(pool: &SqlitePool) -> Result<Vec<Scout>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT id, name, den, car_number, car_weight, checked_in, created_at
        FROM scouts
        WHERE checked_in = 1
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(|row| Scout {
        id: row.get("id"),
        name: row.get("name"),
        den: row.get("den"),
        car_number: row.get("car_number"),
        car_weight: row.get("car_weight"),
        checked_in: row.get("checked_in"),
        created_at: row.get("created_at"),
    }).collect())
}

pub async fn get_next_car_number(pool: &SqlitePool) -> Result<i32, sqlx::Error> {
    let result: Option<i32> = sqlx::query_scalar("SELECT MAX(car_number) FROM scouts")
        .fetch_optional(pool)
        .await?;

    Ok(result.map(|n| n + 1).unwrap_or(1))
}
