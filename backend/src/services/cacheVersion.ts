import pool from "../db/connection";

// Global cache version manager.
// We keep a single row with id = 1 and an integer version that we bump
// whenever any admin mutation happens (colleges, departments, semesters,
// courses, topics, subtopics, subtopic content, etc.).

const INITIAL_VERSION = 1;

async function ensureRowExists() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS cache_version (
       id INTEGER PRIMARY KEY,
       version INTEGER NOT NULL
     )`
  );

  const result = await pool.query("SELECT version FROM cache_version WHERE id = 1");
  if (result.rows.length === 0) {
    await pool.query("INSERT INTO cache_version (id, version) VALUES (1, $1)", [
      INITIAL_VERSION,
    ]);
  }
}

export async function getGlobalCacheVersion(): Promise<number> {
  try {
    await ensureRowExists();
    const result = await pool.query("SELECT version FROM cache_version WHERE id = 1");
    return result.rows[0].version as number;
  } catch (err) {
    console.error("Failed to get global cache version", err);
    // In worst case, fall back to INITIAL_VERSION so clients still behave.
    return INITIAL_VERSION;
  }
}

export async function bumpGlobalCacheVersion(): Promise<number> {
  try {
    await ensureRowExists();
    const result = await pool.query(
      "UPDATE cache_version SET version = version + 1 WHERE id = 1 RETURNING version"
    );
    const newVersion = result.rows[0].version as number;
    console.log("Global cache version bumped to", newVersion);
    return newVersion;
  } catch (err) {
    console.error("Failed to bump global cache version", err);
    // Don't block the main operation if bumping fails; just log.
    return INITIAL_VERSION;
  }
}

