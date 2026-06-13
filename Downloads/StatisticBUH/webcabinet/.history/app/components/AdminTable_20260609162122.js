'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const adminSortFunctions = {
  name: (a, b) => (a.name || '').localeCompare(b.name || ''),
  position: (a, b) => (a.position || '').localeCompare(b.position || ''),
  login: (a, b) => (a.login || '').localeCompare(b.login || ''),
  totalPatients: (a, b) => (Number(a.stats?.totalPatients) || 0) - (Number(b.stats?.totalPatients) || 0),
  totalAmount: (a, b) => (Number(a.stats?.totalAmount) || 0) - (Number(b.stats?.totalAmount) || 0),
  errorsCount: (a, b) => (Number(a.stats?.errorsCount) || 0) - (Number(b.stats?.errorsCount) || 0),
};

export default function AdminTable({ users }) {
  const [editingUserId, setEditingUserId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const router = useRouter();

  const doctors = useMemo(() => {
    const list = users.filter(u => u.role !== 'admin');
    const sortFn = adminSortFunctions[sortKey] || adminSortFunctions.name;

    return [...list].sort((a, b) => {
      const result = sortFn(a, b);
      return sortDirection === 'asc' ? result : -result;
    });
  }, [users, sortKey, sortDirection]);

  const handleChangePassword = async (userId) => {
    if (!newPassword.trim()) {
      alert('Введіть новий пароль');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newPassword }),
      });

      const data = await res.json();
      if (data.success) {
        alert('Пароль успішно змінено!');
        setEditingUserId(null);
        setNewPassword('');
        router.refresh();
      } else {
        alert(data.error || 'Помилка зміни пароля');
      }
    } catch (err) {
      alert('Помилка з\'єднання з сервером');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const getArrow = (key) => {
    if (sortKey !== key) return '';
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <div className="glass-card" style={{ overflowX: 'auto' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Статистика всіх лікарів</h2>
      
      <table className="data-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
              ПІБ лікаря{getArrow('name')}
            </th>
            <th onClick={() => handleSort('position')} style={{ cursor: 'pointer', userSelect: 'none' }}>
              Посада{getArrow('position')}
            </th>
            <th onClick={() => handleSort('login')} style={{ cursor: 'pointer', userSelect: 'none' }}>
              Логін{getArrow('login')}
            </th>
            <th onClick={() => handleSort('totalPatients')} style={{ cursor: 'pointer', userSelect: 'none' }}>
              Пацієнти{getArrow('totalPatients')}
            </th>
            <th onClick={() => handleSort('totalAmount')} style={{ cursor: 'pointer', userSelect: 'none' }}>
              Зароблено (₴){getArrow('totalAmount')}
            </th>
            <th onClick={() => handleSort('errorsCount')} style={{ cursor: 'pointer', userSelect: 'none' }}>
              Помилки{getArrow('errorsCount')}
            </th>
            <th>Дії</th>
          </tr>
        </thead>
        <tbody>
          {doctors.map(doc => {
            const stats = doc.stats || {};
            const isEditing = editingUserId === doc.id;

            return (
              <tr key={doc.id}>
                <td style={{ fontWeight: 500 }}>{doc.name}</td>
                <td style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>{doc.position || '-'}</td>
                <td><code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{doc.login}</code></td>
                <td>{stats.totalPatients || 0}</td>
                <td className="success-text" style={{ fontWeight: 500 }}>
                  {(stats.totalAmount || 0).toLocaleString('uk-UA', { minimumFractionDigits: 2 })}
                </td>
                <td className={stats.errorsCount > 0 ? 'error-text' : ''} style={{ fontWeight: 500 }}>
                  {stats.errorsCount || 0}
                </td>
                <td>
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="text" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Новий пароль"
                        className="input-field"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                      />
                      <button 
                        onClick={() => handleChangePassword(doc.id)} 
                        disabled={loading}
                        className="btn-primary"
                        style={{ padding: '0.25rem 0.75rem', width: 'auto', fontSize: '0.875rem' }}
                      >
                        ✓
                      </button>
                      <button 
                        onClick={() => { setEditingUserId(null); setNewPassword(''); }} 
                        className="btn-secondary"
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => { setEditingUserId(doc.id); setNewPassword(''); }}
                      className="btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                    >
                      Змінити пароль
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
