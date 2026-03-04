import sql from 'mssql';

const config = {
    server: 'db43366.public.databaseasp.net',
    database: 'db43366',
    user: 'db43366',
    password: '4n=JN-8f_bD2',
    options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let pool = null;

export async function getPool() {
    if (pool && pool.connected) return pool;
    pool = await sql.connect(config);
    return pool;
}

export { sql };
