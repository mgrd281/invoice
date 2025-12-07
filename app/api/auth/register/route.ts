import { NextRequest, NextResponse } from 'next/server';
import { loadUsersFromDisk, saveUsersToDisk } from '@/lib/server-storage';
import bcrypt from 'bcryptjs';
import { sendVerificationEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const { email, password, name } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const users = loadUsersFromDisk();

        if (users.find((u: any) => u.email === email)) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString('hex');

        const newUser = {
            id: crypto.randomUUID(), // UNIQUE ID ensures data isolation
            email,
            name: name || email.split('@')[0],
            password: hashedPassword,
            provider: 'credentials',
            isVerified: false, // Enforce email verification
            verificationToken,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        saveUsersToDisk(users);

        // Send verification email
        // We don't await this to speed up the response, but in production queues are better
        sendVerificationEmail(email, verificationToken).catch(console.error);

        return NextResponse.json({
            success: true,
            message: 'Registration successful. Please check your email to verify your account.'
        });

    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
