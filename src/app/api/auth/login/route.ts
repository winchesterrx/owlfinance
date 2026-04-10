import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if(!email || !password) return NextResponse.json({ error: 'Credenciais incompletas' }, { status: 400 });

        const [users]: any = await pool.query(`SELECT * FROM users WHERE email = ? LIMIT 1`, [email]);
        if(users.length === 0) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 401 });

        const user = users[0];
        const tokenMatch = await bcrypt.compare(password, user.password_hash);
        
        if(!tokenMatch) return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });

        // Gera token
        const token = await signToken(user.id);
        
        // Seta cookie
        cookies().set('owl_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 dias
            path: '/'
        });

        return NextResponse.json({ success: true, user: { id: user.id, name: user.name, email: user.email }});

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
