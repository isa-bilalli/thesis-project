import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RowDataPacket } from "mysql2/promise";
import { database } from "../src/config/database.js";
import { env } from "../src/config/env.js";

interface IdRow extends RowDataPacket {
  id: number;
}

const measuredTables = [
  "vehicles",
  "customers",
  "leads",
  "lead_activities",
  "test_drives",
  "offers",
  "vehicle_reservations",
  "sales",
] as const;

async function main(): Promise<void> {
  const connection = await database.getConnection();
  try {
    const [versionRows] = await connection.query<RowDataPacket[]>(
      "SELECT VERSION() AS mysqlVersion, DATABASE() AS databaseName",
    );
    const [variableRows] = await connection.query<RowDataPacket[]>(
      "SHOW VARIABLES WHERE Variable_name IN ('max_connections', 'performance_schema', 'innodb_buffer_pool_size')",
    );
    const [tenantRows] = await connection.query<IdRow[]>(
      "SELECT id FROM tenants WHERE slug = 'demo-motors' LIMIT 1",
    );
    const tenantId = tenantRows[0]?.id;
    if (!tenantId) throw new Error("Demo tenant not found");

    const counts: Record<string, number> = {};
    for (const table of measuredTables) {
      const [rows] = await connection.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS total FROM \`${table}\` WHERE tenant_id = ?`,
        [tenantId],
      );
      counts[table] = Number(rows[0]?.total ?? 0);
    }

    const [inventoryExplain] = await connection.query<RowDataPacket[]>(
      `
        EXPLAIN ANALYZE
        SELECT v.id, v.stock_number, v.make, v.model, l.name
        FROM vehicles v
        INNER JOIN locations l
          ON l.id = v.location_id AND l.tenant_id = v.tenant_id
        WHERE v.tenant_id = ?
          AND v.deleted_at IS NULL
          AND CONCAT_WS(
            ' ', v.stock_number, COALESCE(v.vin, ''), v.make, v.model,
            COALESCE(v.trim_level, ''), l.name, l.code
          ) LIKE '%Performance%'
        ORDER BY v.created_at DESC, v.id DESC
        LIMIT 20 OFFSET 0
      `,
      [tenantId],
    );

    const [customerExplain] = await connection.query<RowDataPacket[]>(
      `
        EXPLAIN ANALYZE
        SELECT c.id, c.first_name, c.last_name, c.email, c.phone
        FROM customers c
        WHERE c.tenant_id = ?
          AND c.deleted_at IS NULL
          AND CONCAT_WS(
            ' ', COALESCE(c.first_name, ''), COALESCE(c.last_name, ''),
            COALESCE(c.company_name, ''), COALESCE(c.email, ''), c.phone,
            COALESCE(c.secondary_phone, '')
          ) LIKE '%Performance%'
        ORDER BY c.created_at DESC, c.id DESC
        LIMIT 20 OFFSET 0
      `,
      [tenantId],
    );

    let statementDigests: RowDataPacket[] = [];
    try {
      const [digestRows] = await connection.query<RowDataPacket[]>(
        `
          SELECT
            DIGEST_TEXT AS digestText,
            COUNT_STAR AS executions,
            ROUND(SUM_TIMER_WAIT / 1000000000000, 6) AS totalSeconds,
            ROUND(AVG_TIMER_WAIT / 1000000000, 3) AS averageMilliseconds,
            SUM_ROWS_EXAMINED AS rowsExamined,
            SUM_ROWS_SENT AS rowsSent,
            SUM_NO_INDEX_USED AS noIndexUsed
          FROM performance_schema.events_statements_summary_by_digest
          WHERE SCHEMA_NAME = ?
          ORDER BY SUM_TIMER_WAIT DESC
          LIMIT 25
        `,
        [env.database.name],
      );
      statementDigests = digestRows;
    } catch (error) {
      statementDigests = [
        {
          unavailable:
            error instanceof Error ? error.message : String(error),
        } as RowDataPacket,
      ];
    }

    const report = {
      capturedAt: new Date().toISOString(),
      database: versionRows[0],
      variables: variableRows,
      counts,
      explainAnalyze: {
        inventoryCommonSearch: inventoryExplain.map((row) => Object.values(row)[0]),
        customerCommonSearch: customerExplain.map((row) => Object.values(row)[0]),
      },
      statementDigests,
    };

    const outputPath = path.resolve(
      process.env.PERF_AUDIT_OUTPUT ??
        "../testing/results/database/performance-audit.json",
    );
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, JSON.stringify(report, null, 2), "utf8");
    console.log(JSON.stringify(report, null, 2));
  } finally {
    connection.release();
    await database.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
