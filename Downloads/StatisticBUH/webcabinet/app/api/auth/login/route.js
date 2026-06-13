import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { sql } from '../../../../lib/db';

// ──────────────────────────────────────────────
// Rate limiting (проста захист від брутфорсу)
// ──────────────────────────────────────────────
const loginAttempts = new Map();
const RATE_LIMIT_MAX    = 10;
const RATE_LIMIT_WINDOW = 10 * 60_000;
const RATE_LIMIT_BLOCK  = 15 * 60_000;

function getRateLimitEntry(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip) || { count: 0, firstAt: now };
  if (now - entry.firstAt > RATE_LIMIT_WINDOW) {
    const fresh = { count: 0, firstAt: now };
    loginAttempts.set(ip, fresh);
    return fresh;
  }
  return entry;
}

function recordFailed(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip) || { count: 0, firstAt: now };
  entry.count++;
  loginAttempts.set(ip, entry);
}

function clearAttempts(ip) {
  loginAttempts.delete(ip);
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function idToUUID(id) {
  if (typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  const hash = crypto.createHash('md5').update(String(id || '')).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

async function getUsers() {
  if (sql) {
    try {
      const data = await sql`SELECT * FROM users`;
      if (data) return data;
    } catch (err) {
      console.warn('Помилка Neon PostgreSQL, використовуємо локальний файл:', err.message || err);
    }
  }
  const filePath = path.join(process.cwd(), 'data', 'users.json');
  try {
    const fileData = fs.readFileSync(filePath, 'utf8');
    let users = JSON.parse(fileData);
    users = users.map(u => ({ ...u, id: idToUUID(u.id) }));
    return users;
  } catch (err) {
    console.error('Помилка читання файлу користувачів:', err);
    return [];
  }
}

// ──────────────────────────────────────────────
// POST /api/auth/login
// ──────────────────────────────────────────────
export async function POST(request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  try {
    const entry = getRateLimitEntry(ip);
    if (entry.count >= RATE_LIMIT_MAX && (Date.now() - entry.firstAt) < RATE_LIMIT_BLOCK) {
      const minutesLeft = Math.ceil((RATE_LIMIT_BLOCK - (Date.now() - entry.firstAt)) / 60_000);
      return NextResponse.json(
        { success: false, error: `Забагато спроб. Спробуйте через ${minutesLeft} хв.` },
        { status: 429 }
      );
    }

    const { login, password } = await request.json();

    if (!login || !password) {
      recordFailed(ip);
      return NextResponse.json({ success: false, error: 'Невірний логін або пароль' }, { status: 401 });
    }

    const users = await getUsers();
    // Просте порівняння паролів (рядки)
    const user = users.find(u => u.login === login && String(u.password) === String(password));

    if (!user) {
      await new Promise(r => setTimeout(r, 300)); // мала затримка
      recordFailed(ip);
      return NextResponse.json({ success: false, error: 'Невірний логін або пароль' }, { status: 401 });
    }

    clearAttempts(ip);

    const cookieStore = await cookies();
    cookieStore.set('auth', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24
    });

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, role: user.role }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Внутрішня помилка сервера' }, { status: 500 });
  }
}
