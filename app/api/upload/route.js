import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
        }

        // Check file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            return NextResponse.json({ success: false, error: 'File too large. Max size is 2MB.' }, { status: 400 });
        }

        // Convert to base64 data URL — stored directly in DB as image path
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString('base64');
        const mimeType = file.type || 'image/png';
        const dataUrl = `data:${mimeType};base64,${base64}`;

        return NextResponse.json({ success: true, path: dataUrl });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
