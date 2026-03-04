import { NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
import portfolioDataFile from '@/data/portfolioData.json';

// Run once to create table + seed initial data if empty
async function ensureTable(pool) {
    await pool.request().query(`
        IF NOT EXISTS (
            SELECT * FROM sysobjects WHERE name='portfolio_data' AND xtype='U'
        )
        BEGIN
            CREATE TABLE portfolio_data (
                id INT PRIMARY KEY DEFAULT 1,
                data NVARCHAR(MAX) NOT NULL,
                updated_at DATETIME DEFAULT GETDATE()
            );
            INSERT INTO portfolio_data (id, data)
            VALUES (1, '${JSON.stringify(portfolioDataFile).replace(/'/g, "''")}');
        END
    `);
}

export async function GET() {
    try {
        const pool = await getPool();
        await ensureTable(pool);
        const result = await pool.request().query('SELECT data FROM portfolio_data WHERE id = 1');
        if (result.recordset.length === 0) {
            return NextResponse.json(portfolioDataFile);
        }
        const data = JSON.parse(result.recordset[0].data);
        return NextResponse.json(data);
    } catch (error) {
        console.error('DB read error:', error);
        // Fallback to JSON file if DB fails
        return NextResponse.json(portfolioDataFile);
    }
}

export async function POST(request) {
    try {
        const newData = await request.json();
        const jsonString = JSON.stringify(newData).replace(/'/g, "''"); // escape single quotes

        const pool = await getPool();
        await ensureTable(pool);

        await pool.request()
            .input('data', sql.NVarChar(sql.MAX), JSON.stringify(newData))
            .query(`
                IF EXISTS (SELECT 1 FROM portfolio_data WHERE id = 1)
                    UPDATE portfolio_data SET data = @data, updated_at = GETDATE() WHERE id = 1
                ELSE
                    INSERT INTO portfolio_data (id, data) VALUES (1, @data)
            `);

        return NextResponse.json({ success: true, message: 'Saved to database!' });
    } catch (error) {
        console.error('DB write error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
