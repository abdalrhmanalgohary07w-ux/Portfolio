import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const isLocal = process.env.NODE_ENV === 'development';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO; // e.g. "abdalrhmanalgohary07w-ux/Portfolio"
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const FILE_PATH = 'data/portfolioData.json';

async function updateFileOnGitHub(content) {
    // 1. Get current file SHA (required by GitHub API to update a file)
    const getRes = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`,
        { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'portfolio-admin' } }
    );
    if (!getRes.ok) throw new Error(`GitHub GET failed: ${getRes.status}`);
    const fileData = await getRes.json();
    const sha = fileData.sha;

    // 2. Update the file
    const encoded = Buffer.from(content).toString('base64');
    const putRes = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`,
        {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
                'User-Agent': 'portfolio-admin'
            },
            body: JSON.stringify({
                message: 'chore: update portfolio data via admin panel',
                content: encoded,
                sha,
                branch: GITHUB_BRANCH
            })
        }
    );
    if (!putRes.ok) {
        const err = await putRes.json();
        throw new Error(`GitHub PUT failed: ${JSON.stringify(err)}`);
    }
    return await putRes.json();
}

export async function POST(request) {
    const newData = await request.json();
    const jsonContent = JSON.stringify(newData, null, 2);

    // ── Local development: write directly to file ──────────────────────────
    if (isLocal) {
        try {
            const filePath = path.join(process.cwd(), 'data', 'portfolioData.json');
            fs.writeFileSync(filePath, jsonContent, 'utf-8');
            return NextResponse.json({ success: true, mode: 'local', message: 'Saved to file!' });
        } catch (error) {
            return NextResponse.json({ success: false, message: error.message }, { status: 500 });
        }
    }

    // ── Vercel: update file on GitHub → triggers auto-redeploy ───────────
    if (GITHUB_TOKEN && GITHUB_REPO) {
        try {
            await updateFileOnGitHub(jsonContent);
            return NextResponse.json({
                success: true,
                mode: 'github',
                message: 'Saved! Site will update in ~1 minute as Vercel redeploys.'
            });
        } catch (error) {
            console.error('GitHub API error:', error);
            return NextResponse.json({ success: false, message: error.message }, { status: 500 });
        }
    }

    // ── Fallback: no GitHub token configured ──────────────────────────────
    return NextResponse.json({
        success: true,
        mode: 'browser',
        message: 'No GitHub token set. Add GITHUB_TOKEN to Vercel env vars to enable auto-save.'
    });
}

export async function GET() {
    return NextResponse.json({ success: false }, { status: 404 });
}
