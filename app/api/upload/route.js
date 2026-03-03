import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
        }

        // Sanitize filename
        const filename = file.name.replace(/\s+/g, '-').toLowerCase();

        const blob = await put(`uploads/${filename}`, file, {
            access: 'public',
            addRandomSuffix: false,
        });

        console.log(`File uploaded to Vercel Blob: ${blob.url}`);

        return NextResponse.json({ success: true, path: blob.url });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
