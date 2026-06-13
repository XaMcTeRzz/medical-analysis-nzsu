import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import LogoutButton from '../components/LogoutButton';
import AdminTable from '../components/AdminTable';
import PatientTable from '../components/PatientTable';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gijfxhpneyayltprmhul.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

// Функція для конвертування ID в UUID
function idToUUID(id) {
  const hash = crypto.createHash('md5').update(id).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

// Функція для отримання користувачів
async function getUsers() {
  // Спробуємо отримати з Supabase
  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { data, error } = await supabase
        .from('users')
        .select('*');
      
      if (!error && data) {
        console.log('Користувачів завантажено з Supabase');
        return data;
      }
    } catch (err) {
      console.warn('Помилка Supabase, використовуємо локальний файл:', err);
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

  return (
    <main className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div>
          <h1 className="text-gradient">Особистий Кабінет</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem' }}>
            {currentUser.name} • <span style={{ color: 'var(--primary)' }}>{currentUser.role === 'admin' ? 'Адміністратор' : currentUser.position || 'Лікар'}</span>
          </p>
        </div>
        <LogoutButton />
      </header>

      {currentUser.role === 'admin' ? (
        <AdminTable users={users} />
      ) : (
        <div className="centered-page">
          <UserView user={currentUser} />
        </div>
      )}
    </main>
  );
}

function UserView({ user }) {
  const stats = user.stats || {};
  const source = stats.source || {};

  const formatPeriod = (value) => {
    if (!value) return 'Невідомо';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric' }).format(date);
  };

  return (
    <div className="glass-card center-card">
      <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Ваша статистика</h2>

      <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="stat-box">
          <div className="stat-label">Період даних</div>
          <div>{formatPeriod(source.created)}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Файл джерела</div>
          <div>{source.filename || 'Немає'}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Опис даних</div>
          <div>{source.title || source.description || 'Немає'}</div>
        </div>
        {source.version && (
          <div className="stat-box">
            <div className="stat-label">Версія</div>
            <div>{source.version}</div>
          </div>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-label">Всього пацієнтів</div>
          <div className="stat-value">{stats.totalPatients || 0}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Зароблені кошти (₴)</div>
          <div className="stat-value success-text">
            {(stats.totalAmount || 0).toLocaleString('uk-UA', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Виявлено помилок</div>
          <div className={`stat-value ${stats.errorsCount > 0 ? 'error-text' : ''}`}>
            {stats.errorsCount || 0}
          </div>
        </div>
      </div>

      <h3 style={{ marginTop: '2.5rem', marginBottom: '1rem', color: 'rgba(255,255,255,0.8)' }}>
        Деталі по пацієнтам
      </h3>
      <div style={{ overflowX: 'auto', maxHeight: '400px', marginBottom: '2rem' }}>
        <table className="data-table">
          <thead style={{ position: 'sticky', top: 0, background: '#0f0f15', zIndex: 10 }}>
            <tr>
              <th>ID Пацієнта (Хеш)</th>
              <th>EMZ ID</th>
              <th>Сума (₴)</th>
            </tr>
          </thead>
          <tbody>
            {(stats.patients || []).map((p, idx) => (
              <tr key={idx}>
                <td style={{ fontSize: '0.8rem', opacity: 0.8 }}>{p.id.substring(0, 16)}...</td>
                <td style={{ fontSize: '0.85rem' }}><code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{p.emzId}</code></td>
                <td className="success-text" style={{ fontWeight: 500 }}>{(p.amount || 0).toLocaleString('uk-UA', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            {(!stats.patients || stats.patients.length === 0) && (
              <tr><td colSpan="3" style={{ textAlign: 'center', opacity: 0.5 }}>Немає даних</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <PatientTable patients={stats.patients || []} />

      {stats.errors && stats.errors.length > 0 && (
        <>
          <h3 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--danger)' }}>
            Виявлені помилки
          </h3>
          <div style={{ overflowX: 'auto', maxHeight: '300px' }}>
            <table className="data-table">
              <thead style={{ position: 'sticky', top: 0, background: '#0f0f15', zIndex: 10 }}>
                <tr>
                  <th>EMZ ID</th>
                  <th>Статус</th>
                  <th>Клас взаємодії</th>
                  <th>Коментар</th>
                </tr>
              </thead>
              <tbody>
                {stats.errors.map((err, idx) => (
                  <tr key={idx}>
                    <td style={{ fontSize: '0.85rem' }}><code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{err.emzId}</code></td>
                    <td><span style={{ 
                      background: 'rgba(239, 68, 68, 0.15)', 
                      color: 'var(--danger)', 
                      padding: '0.3rem 0.6rem', 
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>{err.status}</span></td>
                    <td style={{ fontSize: '0.85rem', opacity: 0.8 }}>{err.classInteraction}</td>
                    <td style={{ fontSize: '0.85rem' }}>{err.comment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
