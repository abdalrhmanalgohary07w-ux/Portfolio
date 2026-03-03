import { NextResponse } from 'next/server';

// On Vercel, the filesystem is read-only.
// Data persistence is managed client-side via localStorage.
// This route is kept as a no-op success so the client doesn't break.
export async function POST() {
    return NextResponse.json({ success: true, message: 'Saved to localStorage on client.' });
}

export async function GET() {
    return NextResponse.json({ success: false, message: 'Use localStorage on client.' }, { status: 404 });
}
