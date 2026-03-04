import sql from 'mssql';

const connectionString = process.env.MSSQL_CONNECTION_STRING;

let pool = null;

export async function getPool() {
    if (pool) return pool;
    pool = await sql.connect(connectionString);
    return pool;
}

export { sql };
