import * as jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'owlfinance-super-secret-key-123!';

export async function signToken(userId: number) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export async function verifyToken(token: string): Promise<any> {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (e) {
        return null;
    }
}

export function authMiddleware(request: Request) {
    // Para Edge middleware (opicional)
}

// Extrator de Sessão Padrão para API Routes
export async function getSessionUserId(): Promise<number | null> {
    const cookieStore = cookies();
    const token = cookieStore.get('owl_session')?.value;
    
    if (!token) return null;
    
    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        return decoded.userId || null;
    } catch(e) {
        return null;
    }
}
