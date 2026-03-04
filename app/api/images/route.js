import { NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

// GET all images metadata (id, mime_type, size, created_at)
export async function GET() {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT id, mime_type, created_at,
                   DATALENGTH(image_data) AS size_bytes
            FROM portfolio_images
            ORDER BY created_at DESC
        `);
        return NextResponse.json({ success: true, images: result.recordset });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
