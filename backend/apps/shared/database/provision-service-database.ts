import mysql, {
    type Connection,
    type RowDataPacket,
} from "mysql2/promise";

interface ProvisionOptions {
    sourceDatabase: string;
    targetDatabase: string;
    tables: readonly string[];
}

interface ColumnRow extends RowDataPacket {
    columnName: string;
}

function required(name: string): string {
    const value = process.env[name];

    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
}

async function connect(database?: string): Promise<Connection> {
    return mysql.createConnection({
        host: required("DB_HOST"),
        port: Number(process.env.DB_PORT ?? 3306),
        user: required("DB_USER"),
        password: process.env.DB_PASSWORD ?? "",
        ...(database ? { database } : {}),
    });
}

async function commonColumns(
    connection: Connection,
    sourceDatabase: string,
    targetDatabase: string,
    table: string,
): Promise<string[]> {
    const [rows] = await connection.execute<ColumnRow[]>(
        `SELECT source_columns.COLUMN_NAME AS columnName
         FROM information_schema.COLUMNS source_columns
         INNER JOIN information_schema.COLUMNS target_columns
           ON target_columns.TABLE_SCHEMA = ?
          AND target_columns.TABLE_NAME = source_columns.TABLE_NAME
          AND target_columns.COLUMN_NAME = source_columns.COLUMN_NAME
         WHERE source_columns.TABLE_SCHEMA = ?
           AND source_columns.TABLE_NAME = ?
           AND source_columns.EXTRA NOT LIKE '%GENERATED%'
           AND target_columns.EXTRA NOT LIKE '%GENERATED%'
         ORDER BY source_columns.ORDINAL_POSITION`,
        [targetDatabase, sourceDatabase, table],
    );

    return rows.map((row) => row.columnName);
}

export async function provisionServiceDatabase(
    options: ProvisionOptions,
): Promise<void> {
    const adminConnection = await connect();

    try {
        const targetDatabase = adminConnection.escapeId(options.targetDatabase);
        await adminConnection.query(
            `CREATE DATABASE IF NOT EXISTS ${targetDatabase}
             CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
        );
    } finally {
        await adminConnection.end();
    }

    const connection = await connect(options.targetDatabase);

    try {
        const sourceDatabase = connection.escapeId(options.sourceDatabase);

        for (const table of options.tables) {
            const escapedTable = connection.escapeId(table);
            await connection.query(
                `CREATE TABLE IF NOT EXISTS ${escapedTable}
                 LIKE ${sourceDatabase}.${escapedTable}`,
            );

            const columns = await commonColumns(
                connection,
                options.sourceDatabase,
                options.targetDatabase,
                table,
            );

            if (columns.length === 0) {
                throw new Error(`No common columns found for ${table}`);
            }

            const columnList = columns
                .map((column) => connection.escapeId(column))
                .join(", ");
            await connection.query(
                `INSERT IGNORE INTO ${escapedTable} (${columnList})
                 SELECT ${columnList}
                 FROM ${sourceDatabase}.${escapedTable}`,
            );
        }
    } finally {
        await connection.end();
    }
}
