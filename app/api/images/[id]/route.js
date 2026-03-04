import { NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

export async function GET(request, { params }) {
    const { id } = await params;

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, parseInt(id))
            .query('SELECT image_data, mime_type FROM portfolio_images WHERE id = @id');

        if (result.recordset.length === 0) {
            return new Response('Image not found', { status: 404 });
        }

        const { image_data, mime_type } = result.recordset[0];

        return new Response(image_data, {
            status: 200,
            headers: {
                'Content-Type': mime_type,
                'Cache-Control': 'public, max-age=31536000, immutable',
            }
        });
    } catch (error) {
        console.error('Image serve error:', error);
        return new Response('Error loading image', { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const { id } = await params;

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, parseInt(id))
            .query('DELETE FROM portfolio_images WHERE id = @id');

        if (result.rowsAffected[0] === 0) {
            return NextResponse.json({ success: false, message: 'Image not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: `Image ${id} deleted.` });
    } catch (error) {
        console.error('Image delete error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
