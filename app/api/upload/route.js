import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Sanitize filename
        const filename = file.name.replace(/\s+/g, '-').toLowerCase();
        const path = join(process.cwd(), 'public', filename);

        await writeFile(path, buffer);
        console.log(`File uploaded to: ${path}`);

        return NextResponse.json({ success: true, path: `/${filename}` });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
