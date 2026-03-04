import { NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

// Ensure the images table exists
async function ensureImagesTable(pool) {
    await pool.request().query(`
        IF NOT EXISTS (
            SELECT * FROM sysobjects WHERE name='portfolio_images' AND xtype='U'
        )
        BEGIN
            CREATE TABLE portfolio_images (
                id INT IDENTITY(1,1) PRIMARY KEY,
                image_data VARBINARY(MAX) NOT NULL,
                mime_type NVARCHAR(50) DEFAULT 'image/png',
                created_at DATETIME DEFAULT GETDATE()
            );
        END
    `);
}

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
        }

        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ success: false, error: 'File too large. Max 5MB.' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const mimeType = file.type || 'image/png';

        const pool = await getPool();
        await ensureImagesTable(pool);

        // Insert binary image into DB
        const result = await pool.request()
            .input('image_data', sql.VarBinary(sql.MAX), buffer)
            .input('mime_type', sql.NVarChar(50), mimeType)
            .query(`
                INSERT INTO portfolio_images (image_data, mime_type)
                OUTPUT INSERTED.id
                VALUES (@image_data, @mime_type)
            `);

        const imageId = result.recordset[0].id;
        const imageUrl = `/api/images/${imageId}`;

        return NextResponse.json({ success: true, path: imageUrl });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
