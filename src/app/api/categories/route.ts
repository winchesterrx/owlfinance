import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // Auto-migration
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                name VARCHAR(100) NOT NULL,
                type ENUM('income', 'expense') NOT NULL,
                color VARCHAR(20) DEFAULT '#f1f5f9',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS subcategories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                category_id INT NOT NULL,
                name VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
            )
        `);
        // Adaptação da transactions
        try {
            await pool.query(`ALTER TABLE transactions ADD COLUMN subcategory VARCHAR(100) DEFAULT NULL`);
        } catch(e) {} // Ignora se a coluna já existe
    } catch(e) { console.error("Migration Error", e) }

    // Obter as Categorias aninhadas e popular Seed Inicial se estiver vazio
    const [categories]: any = await pool.query(
      `SELECT * FROM categories WHERE user_id = ? ORDER BY type ASC, name ASC`,
      [userId]
    );

    if (categories.length === 0) {
        const defaults = ['Moradia', 'Lazer', 'Educação', 'Farmácia', 'Alimentação', 'Assinaturas'];
        for (const name of defaults) {
             await pool.query(
                `INSERT INTO categories (user_id, name, type, color) VALUES (?, ?, ?, ?)`,
                [userId, name, 'expense', '#ef4444'] // Red color as fallback
             );
        }
        // re-fetch
        const [newCats]: any = await pool.query(
          `SELECT * FROM categories WHERE user_id = ? ORDER BY type ASC, name ASC`,
          [userId]
        );
        categories.length = 0;
        categories.push(...newCats);
    }

    const [subcategories]: any = await pool.query(
      `SELECT s.* FROM subcategories s JOIN categories c ON s.category_id = c.id WHERE c.user_id = ? ORDER BY s.name ASC`,
      [userId]
    );

    // Montando a Arvore JSON
    const result = categories.map((cat: any) => ({
      ...cat,
      subcategories: subcategories.filter((sub: any) => sub.category_id === cat.id)
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
    try {
      const body = await request.json();
      const userId = await getSessionUserId();
      if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
      if (body.action === 'create_category') {
          const [result]: any = await pool.query(
             `INSERT INTO categories (user_id, name, type, color) VALUES (?, ?, ?, ?)`,
             [userId, body.name, body.type, body.color || '#f1f5f9']
          );
          return NextResponse.json({ success: true, id: result.insertId });
      }

      if (body.action === 'create_subcategory') {
         const [result]: any = await pool.query(
            `INSERT INTO subcategories (category_id, name) VALUES (?, ?)`,
            [body.category_id, body.name]
         );
         return NextResponse.json({ success: true, id: result.insertId });
      }
      
      return NextResponse.json({ error: 'Ação Inválida solicitada na API' }, { status: 400 });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
      const { searchParams } = new URL(request.url);
      const action = searchParams.get('action');
      const id = searchParams.get('id');
      const userId = await getSessionUserId(); 
      if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      
      if (action === 'delete_category') {
         await pool.query(`DELETE FROM categories WHERE id = ? AND user_id = ?`, [id, userId]);
      } else if (action === 'delete_subcategory') {
         await pool.query(`DELETE FROM subcategories WHERE id = ?`, [id]);
      }
      
      return NextResponse.json({ success: true });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
