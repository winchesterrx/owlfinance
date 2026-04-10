import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email, password } = body;

        if(!name || !email || !password) return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 });

        // Verifica existência
        const [existing]: any = await pool.query(`SELECT id FROM users WHERE email = ?`, [email]);
        if(existing.length > 0) return NextResponse.json({ error: 'Email já cadastrado.' }, { status: 400 });

        // Hash
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // Insere
        const [result]: any = await pool.query(
            `INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)`,
            [name, email, hash]
        );

        const newUserId = result.insertId;

        // Loga Instantaneamente
        const token = await signToken(newUserId);
        cookies().set('owl_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/'
        });

        return NextResponse.json({ success: true, user: { id: newUserId, name, email }});

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
