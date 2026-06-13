import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import LogoutButton from '../components/LogoutButton';
import AdminTable from '../components/AdminTable';
import PatientTable from '../components/PatientTable';
import UserView from '../components/UserView';
import { sql } from '../../lib/db';

// Функція для конвертування ID в UUID
function idToUUID(id) {
  if (typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  const hash = crypto.createHash('md5').update(String(id || '')).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

// Функція для отримання користувачів
async function getUsers() {
  // Спробуємо отримати з Neon PostgreSQL
  if (sql) {
    try {
      const data = await sql`SELECT * FROM users`;
      if (data) {
        console.log('Користувачів завантажено з Neon PostgreSQL');
        return data;
      }
    } catch (err) {
      console.warn('Помилка Neon PostgreSQL, використовуємо локальний файл:', err);
    }
  }
  
  // Fallback: читаємо локальний файл
  const filePath = path.join(process.cwd(), 'data', 'users.json');
  try {
    const fileData = fs.readFileSync(filePath, 'utf8');
    let users = JSON.parse(fileData);
    // Конвертуємо ID
    users = users.map(u => ({
      ...u,
      id: idToUUID(u.id)
    }));
    return users;
  } catch (err) {
    console.error('Помилка читання файлу користувачів:', err);
    return [];
  }
}

/** Прибирає пароль з об'єктів користувачів перед відправкою на клієнт */
function sanitizeUsers(users) {
  return users.map(({ password, ...rest }) => rest);
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const authId = cookieStore.get('auth')?.value;

  if (!authId) {
    redirect('/');
  }

  const users = await getUsers();

  const currentUser = users.find(u => u.id === authId);

  if (!currentUser) {
    // If cookie is invalid
    redirect('/');
  }

  const safeUsers = sanitizeUsers(users);
  const safeCurrentUser = sanitizeUsers([currentUser])[0];

  return (
    <main className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div>
          <h1 className="text-gradient">Особистий Кабінет</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem' }}>
            {safeCurrentUser.name} • <span style={{ color: 'var(--primary)' }}>{safeCurrentUser.role === 'admin' ? 'Адміністратор' : safeCurrentUser.position || 'Лікар'}</span>
          </p>
        </div>
        <LogoutButton />
      </header>

      {safeCurrentUser.role === 'admin' ? (
        <AdminTable users={safeUsers} />
      ) : (
        <div className="centered-page">
          <UserView user={safeCurrentUser} />
        </div>
      )}
    </main>
  );
}
