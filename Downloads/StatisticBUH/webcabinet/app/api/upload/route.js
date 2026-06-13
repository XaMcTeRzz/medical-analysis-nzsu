import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { sql } from '../../../lib/db';
import { parseSalaryData } from '../../../lib/salaryParser';

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
      if (data) {
        return data;
      }
    } catch (err) {
      console.warn('Error loading users from Neon:', err?.message || err);
    }
  }

  const filePath = path.join(process.cwd(), 'data', 'users.json');
  try {
    const fileData = fs.readFileSync(filePath, 'utf8');
    let users = JSON.parse(fileData);
    users = users.map(u => ({
      ...u,
      id: idToUUID(u.id)
    }));
    return users;
  } catch (err) {
    console.error('Error reading users file:', err);
    return [];
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const authId = cookieStore.get('auth')?.value;

    if (!authId) {
      return NextResponse.json({ success: false, error: 'Не авторизовано' }, { status: 401 });
    }

    const users = await getUsers();
    const currentUser = users.find(u => u.id === authId);

    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Немає прав доступу' }, { status: 403 });
    }

    const formData = await request.formData();
    const month = formData.get('month');
    const bonusFile = formData.get('bonusFile');
    const multukFile = formData.get('multukFile');

    if (!month || !bonusFile) {
      return NextResponse.json({ success: false, error: 'Всі поля є обов\'язковими!' }, { status: 400 });
    }

    // ── MIME-валідація ──────────────────────────────────────────
    const ALLOWED_MIME = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel',                                           // .xls
      'application/octet-stream',                                           // деякі браузери для .xls
    ];
    const ALLOWED_EXT = ['.xlsx', '.xls'];

    function isValidFile(file) {
      if (!file) return true; // optional file
      const ext = '.' + (file.name || '').split('.').pop().toLowerCase();
      return ALLOWED_MIME.includes(file.type) || ALLOWED_EXT.includes(ext);
    }

    if (!isValidFile(bonusFile)) {
      return NextResponse.json({ success: false, error: 'Файл зарплати має бути у форматі .xlsx або .xls' }, { status: 400 });
    }
    if (multukFile && !isValidFile(multukFile)) {
      return NextResponse.json({ success: false, error: 'Файл Мультика має бути у форматі .xls або .xlsx' }, { status: 400 });
    }
    // ───────────────────────────────────────────────────────────

    const bonusBuffer = Buffer.from(await bonusFile.arrayBuffer());

    const multukBuffer = multukFile ? Buffer.from(await multukFile.arrayBuffer()) : null;

    // Call parser with buffers instead of file paths
    const usersFilePath = path.join(process.cwd(), 'data', 'users.json');
    const result = await parseSalaryData(month, bonusBuffer, multukBuffer, usersFilePath);

    return NextResponse.json({ 
      success: true, 
      updatedCount: result.updatedCount, 
      newUsersCount: result.newUsersCount,
      // Не повертаємо паролі на клієнт
      users: result.usersData.map(({ password, ...rest }) => rest)
    });
  } catch (error) {
    console.error('Помилка завантаження:', error);
    return NextResponse.json({ success: false, error: error.message || 'Невідома помилка на сервері' }, { status: 500 });
  }
}
