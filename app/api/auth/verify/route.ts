import { NextRequest, NextResponse } from 'next/server';
import { loadUsersFromDisk, saveUsersToDisk } from '@/lib/server-storage';

export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get('token');

    if (!token) {
        return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const users = loadUsersFromDisk();
    const user = users.find((u: any) => u.verificationToken === token);

    if (!user) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    user.isVerified = true;
    user.verificationToken = undefined; // Clear token
    saveUsersToDisk(users);

    // Redirect to login with success message
    // Assuming /auth/signin handles the 'verified' query param to show a success alert
    return NextResponse.redirect(new URL('/auth/signin?verified=true', req.url));
}
