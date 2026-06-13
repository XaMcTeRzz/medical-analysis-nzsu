'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });

      const data = await res.json();

      if (data.success) {
        router.push('/dashboard');
        router.refresh(); // Refresh to let server components read the new cookie
      } else {
        setError(data.error || 'Помилка входу');
      }
    } catch (err) {
      setError('Не вдалося з\'єднатися з сервером');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '2rem' }}>
      <div className="glass-card" style={{ maxWidth: '400px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Медична Статистика</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Увійдіть до особистого кабінету</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Логін</label>
            <input 
              type="text" 
              className="input-field" 
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required 
              placeholder="Введіть ваш логін"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Пароль</label>
            <input 
              type="password" 
              className="input-field" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              placeholder="••••••••"
            />
          </div>

          {error && <div className="error-text" style={{ fontSize: '0.875rem', textAlign: 'center' }}>{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
            {loading ? 'Вхід...' : 'Увійти'}
          </button>
        </form>
      </div>
    </main>
  );
}
