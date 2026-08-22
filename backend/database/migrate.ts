import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { env } from "../src/config/env.js";

const migrationsDirectory = path.resolve(process.cwd(), "database", "migrations");

interface AppliedMigration extends RowDataPacket {
  filename: string;
  checksum: string;
}

async function ensureDatabaseExists(): Promise<void> {
  const connection = await mysql.createConnection({
    host: env.database.host,
    port: env.database.port,
    user: env.database.user,
    password: env.database.password,
  });

  try {
    const databaseName = connection.escapeId(env.database.name);

    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${databaseName}
       CHARACTER SET utf8mb4
       COLLATE utf8mb4_unicode_ci`,
    );
  } finally {
    await connection.end();
  }
}

async function getMigrationFiles(): Promise<string[]> {
  const entries = await readdir(migrationsDirectory, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "en"));
}

async function runMigrations(): Promise<void> {
  await ensureDatabaseExists();

  const connection = await mysql.createConnection({
    host: env.database.host,
    port: env.database.port,
    user: env.database.user,
    password: env.database.password,
    database: env.database.name,
    multipleStatements: true,
  });

  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        checksum CHAR(64) NOT NULL,
        applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        CONSTRAINT uq_schema_migrations_filename UNIQUE (filename)
      )
    `);

    const [rows] = await connection.query<AppliedMigration[]>(
      "SELECT filename, checksum FROM schema_migrations",
    );
    const appliedMigrations = new Map(
      rows.map((migration) => [migration.filename, migration.checksum]),
    );
    const migrationFiles = await getMigrationFiles();

    if (migrationFiles.length === 0) {
      console.log("No migration files found.");
      return;
    }

    let appliedCount = 0;

    for (const filename of migrationFiles) {
      const sql = await readFile(path.join(migrationsDirectory, filename), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const appliedChecksum = appliedMigrations.get(filename);

      if (appliedChecksum) {
        if (appliedChecksum !== checksum) {
          throw new Error(
            `Migration ${filename} has changed since it was applied. Create a new migration instead of editing an applied one.`,
          );
        }

        console.log(`Skipping ${filename} (already applied)`);
        continue;
      }

      if (!sql.trim()) {
        throw new Error(`Migration ${filename} is empty.`);
      }

      console.log(`Applying ${filename}...`);
      await connection.query(sql);
      await connection.execute(
        "INSERT INTO schema_migrations (filename, checksum) VALUES (?, ?)",
        [filename, checksum],
      );
      appliedCount += 1;
      console.log(`Applied ${filename}`);
    }

    console.log(
      appliedCount === 0
        ? "Database is already up to date."
        : `Migration complete. Applied ${appliedCount} migration${appliedCount === 1 ? "" : "s"}.`,
    );
  } finally {
    await connection.end();
  }
}

runMigrations().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Migration failed: ${message}`);
  process.exitCode = 1;
});
