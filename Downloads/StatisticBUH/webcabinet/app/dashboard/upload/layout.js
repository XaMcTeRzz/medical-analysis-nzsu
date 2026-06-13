import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { sql } from '../../../lib/db';

function idToUUID(id) {
  if (typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  const hash = crypto.createHash('md5').update(String(id || '')).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

async function getCurrentUser() {
  const cookieStore = await cookies();
  const authId = cookieStore.get('auth')?.value;
  if (!authId) return null;

  if (sql) {
    try {
      const data = await sql`SELECT id, role FROM users WHERE id = ${authId} LIMIT 1`;
      return data?.[0] || null;
    } catch {}
  }

  try {
    const filePath = path.join(process.cwd(), 'data', 'users.json');
    const users = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return users.map(u => ({ ...u, id: idToUUID(u.id) })).find(u => u.id === authId) || null;
  } catch {
    return null;
  }
}

/**
 * Серверний layout для /dashboard/upload.
 * Блокує доступ до сторінки якщо не авторизований адмін.
 */
export default async function UploadLayout({ children }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  if (user.role !== 'admin') {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
