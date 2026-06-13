'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LogoutButton from '../../components/LogoutButton';

export default function UploadPage() {
  const [month, setMonth] = useState('');
  const [bonusFile, setBonusFile] = useState(null);
  const [multukFile, setMultukFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [generatedUsers, setGeneratedUsers] = useState(null);
  const router = useRouter();

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!month.trim() || !bonusFile) {
      setError('Будь ласка, заповніть місяць та виберіть файл зарплати.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    const formData = new FormData();
    formData.append('month', month);
    formData.append('bonusFile', bonusFile);
    formData.append('multukFile', multukFile);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setMessage(`Успішно! Оновлено ${data.updatedCount} зарплат. Нових користувачів: ${data.newUsersCount}.`);
        setGeneratedUsers(data.users);
        setMonth('');
        setBonusFile(null);
        setMultukFile(null);
        e.target.reset(); // clear file inputs
      } else {
        setGeneratedUsers(null);
        setError(data.error || 'Сталася помилка при завантаженні.');
      }
    } catch (err) {
      setError('Не вдалося з\'єднатися з сервером.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearDatabase = async () => {
    if (!window.confirm('Ви впевнені, що хочете видалити всіх лікарів та їх дані? Цю дію неможливо скасувати!')) {
      return;
    }
    
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/users/clear', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMessage('Базу успішно повністю очищено! Всі лікарі видалені.');
      } else {
        setError(data.error || 'Помилка очищення бази');
      }
    } catch (err) {
      setError('Помилка з\'єднання з сервером');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container" style={{ minHeight: '100vh', padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            Завантаження даних
          </h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Оновлення бази зарплат лікарів</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link href="/dashboard" className="btn-secondary">
            ← Повернутись в адмінку
          </Link>
          <LogoutButton />
        </div>
      </header>

      <div className="glass-card center-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Звітний місяць</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Наприклад: квітень" 
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              required
            />
            <small style={{ display: 'block', marginTop: '0.25rem', color: 'rgba(255,255,255,0.5)' }}>Це слово буде відображатись у розрахункових листках.</small>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.2)' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--primary)' }}>1. Зарплата таблиця (бонуси .xlsx)</label>
            <input 
              type="file" 
              accept=".xlsx"
              onChange={(e) => setBonusFile(e.target.files[0])}
              required
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.2)' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--accent)' }}>2. Розрахункові листки 1С (multuk .xls)</label>
            <input 
              type="file" 
              accept=".xls"
              onChange={(e) => setMultukFile(e.target.files[0])}
              style={{ width: '100%' }}
            />
          </div>

          {error && <div className="error-text" style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>{error}</div>}
          {message && <div className="success-text" style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>{message}</div>}

          {generatedUsers && (
            <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.3)', margin: '1rem 0', textAlign: 'left' }}>
              <h4 style={{ color: '#38bdf8', marginBottom: '0.5rem', marginTop: 0 }}>📦 Згенерований файл користувачів готовий!</h4>
              <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', marginBottom: '1rem' }}>
                Ви можете завантажити цей файл і зберегти його як <code>webcabinet/data/users.json</code> на вашому комп'ютері, після чого зробити деплой на Netlify, щоб оновити кабінети лікарів без бази даних Neon.
              </p>
              <button
                type="button"
                onClick={() => {
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(generatedUsers, null, 2));
                  const downloadAnchor = document.createElement('a');
                  downloadAnchor.setAttribute("href", dataStr);
                  downloadAnchor.setAttribute("download", "users.json");
                  document.body.appendChild(downloadAnchor);
                  downloadAnchor.click();
                  downloadAnchor.remove();
                }}
                className="btn-primary"
                style={{ background: '#0284c7', borderColor: '#0284c7', display: 'flex', alignItems: 'center', gap: '8px', width: 'auto', padding: '0.6rem 1.2rem', cursor: 'pointer' }}
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                  <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                </svg>
                Завантажити users.json
              </button>
            </div>
          )}

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
            style={{ marginTop: '1rem', padding: '1rem', fontSize: '1.1rem' }}
          >
            {loading ? 'Йде обробка файлів...' : 'Завантажити та оновити базу'}
          </button>
        </form>

        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
          <h3 style={{ color: '#ef4444', marginBottom: '1rem' }}>Небезпечна зона</h3>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            Ця дія видалить всіх лікарів та їхні зарплати з бази даних. Використовуйте тільки якщо хочете завантажити все з чистого аркуша.
          </p>
          <button 
            type="button" 
            onClick={handleClearDatabase}
            disabled={loading}
            style={{ 
              background: 'transparent', 
              color: '#ef4444', 
              border: '1px solid #ef4444', 
              padding: '0.5rem 1rem', 
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '500'
            }}
          >
            {loading ? 'Зачекайте...' : 'Видалити всю базу лікарів'}
          </button>
        </div>
      </div>
    </main>
  );
}
