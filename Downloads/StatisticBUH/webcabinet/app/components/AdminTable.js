'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import UserView from './UserView';

const adminSortFunctions = {
  name: (a, b) => (a.name || '').localeCompare(b.name || ''),
  position: (a, b) => (a.position || '').localeCompare(b.position || ''),
  login: (a, b) => (a.login || '').localeCompare(b.login || ''),
  vsyaZP: (a, b) => {
    const valA = parseFloat(String(a.stats?.salary?.vsyaZP || '').replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0;
    const valB = parseFloat(String(b.stats?.salary?.vsyaZP || '').replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0;
    return valA - valB;
  }
};

export default function AdminTable({ users }) {
  const [editingUserId, setEditingUserId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const router = useRouter();

  // Extract all available months across all users
  const availableMonths = useMemo(() => {
    const months = new Set();
    users.forEach(user => {
      if (user.stats?.salaries) {
        Object.keys(user.stats.salaries).forEach(m => months.add(m.toLowerCase()));
      }
      if (user.stats?.salary?.period) {
        months.add(user.stats.salary.period.toLowerCase());
      }
    });
    const ukrMonths = ['січень','лютий','березень','квітень','травень','червень','липень','серпень','вересень','жовтень','листопад','грудень'];
    // Сортуємо у зворотному хронологічному порядку (новіші місяці спочатку)
    return Array.from(months).sort((a, b) => ukrMonths.indexOf(b) - ukrMonths.indexOf(a));
  }, [users]);

  const activeMonthFromDb = useMemo(() => {
    const firstDoc = users.find(u => u.role !== 'admin');
    return firstDoc?.stats?.salary?.period?.toLowerCase() || 'травень';
  }, [users]);

  // Set default selected month to the active one in DB
  const [selectedMonth, setSelectedMonth] = useState(activeMonthFromDb);
  const [savingMonth, setSavingMonth] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserForView, setSelectedUserForView] = useState(null);

  useEffect(() => {
    setSelectedMonth(activeMonthFromDb);
  }, [activeMonthFromDb]);

  const doctors = useMemo(() => {
    let list = users.filter(u => u.role !== 'admin');

    if (searchQuery.trim()) {
      const normalize = (s) => (s || '')
        .toLowerCase()
        .replace(/['’`\u2019\u2018\u02BC\u0027]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const query = normalize(searchQuery);
      list = list.filter(doc => normalize(doc.name).includes(query));
    }

    const doctorsWithSelectedMonthStats = list.map(doc => {
      let statsForMonth = doc.stats?.salary || {};
      if (doc.stats?.salaries && doc.stats.salaries[selectedMonth]) {
        statsForMonth = doc.stats.salaries[selectedMonth];
      }
      return {
        ...doc,
        statsForMonth
      };
    });

    return [...doctorsWithSelectedMonthStats].sort((a, b) => {
      if (sortKey === 'vsyaZP') {
        const valA = parseFloat(String(a.statsForMonth?.vsyaZP || '').replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0;
        const valB = parseFloat(String(b.statsForMonth?.vsyaZP || '').replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0;
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      const sortFn = adminSortFunctions[sortKey] || adminSortFunctions.name;
      const result = sortFn(a, b);
      return sortDirection === 'asc' ? result : -result;
    });
  }, [users, sortKey, sortDirection, selectedMonth, searchQuery]);

  const handleMonthSave = async () => {
    setSavingMonth(true);
    try {
      const res = await fetch('/api/users/set-active-month', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth })
      });
      const data = await res.json();
      if (data.success) {
        alert('Активний місяць успішно збережено для всіх лікарів!');
        router.refresh();
      } else {
        alert(data.error || 'Помилка зміни активного місяця');
      }
    } catch (err) {
      alert('Помилка з\'єднання з сервером');
    } finally {
      setSavingMonth(false);
    }
  };

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

  if (selectedUserForView) {
    return (
      <div style={{ width: '100%' }}>
        <button 
          onClick={() => setSelectedUserForView(null)}
          className="btn-secondary"
          style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Назад до списку лікарів
        </button>
        <UserView user={selectedUserForView} selectedMonth={selectedMonth} />
      </div>
    );
  }

  return (
    <div className="glass-card no-hover-transform" style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h2 style={{ margin: 0 }}>Статистика всіх лікарів</h2>
          {availableMonths.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  border: '1px solid rgba(16, 185, 129, 0.5)',
                  boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  outline: 'none',
                  textTransform: 'capitalize'
                }}
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m} style={{ background: '#1a1a24', color: '#fff' }}>
                    {m}
                  </option>
                ))}
              </select>
              <button
                onClick={handleMonthSave}
                disabled={savingMonth || selectedMonth === activeMonthFromDb}
                className="btn-primary"
                style={{
                  width: 'auto',
                  padding: '6px 12px',
                  fontSize: '0.85rem',
                  background: selectedMonth === activeMonthFromDb ? 'rgba(255,255,255,0.1)' : 'var(--primary)',
                  color: selectedMonth === activeMonthFromDb ? 'rgba(255,255,255,0.65)' : '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: selectedMonth === activeMonthFromDb ? 'not-allowed' : 'pointer'
                }}
              >
                {savingMonth ? 'Збереження...' : 'Зберегти для лікарів'}
              </button>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/dashboard/upload" className="btn-primary" style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
              <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
            </svg>
            Завантажити нові файли
          </Link>
        </div>
      </div>

      {/* Рядок пошуку */}
      <div style={{ marginBottom: '1.5rem', maxWidth: '400px', position: 'relative' }}>
        <input
          type="text"
          placeholder="Пошук лікаря за ПІБ..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field"
          style={{
            padding: '0.6rem 1rem 0.6rem 2.5rem',
            fontSize: '0.9rem',
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid var(--card-border)',
            borderRadius: '8px',
            color: '#fff',
            width: '100%'
          }}
        />
        <svg 
          style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} 
          width="16" 
          height="16" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontSize: '1rem',
              padding: '0 4px',
              zIndex: 2
            }}
          >
            ✕
          </button>
        )}
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: '40px', textAlign: 'center' }}>№</th>
            <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
              ПІБ лікаря{getArrow('name')}
            </th>
            <th onClick={() => handleSort('position')} style={{ cursor: 'pointer', userSelect: 'none' }}>
              Посада{getArrow('position')}
            </th>
            <th onClick={() => handleSort('login')} style={{ cursor: 'pointer', userSelect: 'none' }}>
              Логін{getArrow('login')}
            </th>
            <th onClick={() => handleSort('vsyaZP')} style={{ cursor: 'pointer', userSelect: 'none', color: '#38bdf8' }}>
              Виплата (грн){getArrow('vsyaZP')}
            </th>
            <th>Дії</th>
          </tr>
        </thead>
        <tbody>
          {doctors.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', opacity: 0.5, color: '#fff' }}>
                Лікарів не знайдено
              </td>
            </tr>
          ) : (
            doctors.map((doc, index) => {
              const isEditing = editingUserId === doc.id;

              return (
                <tr key={doc.id} onDoubleClick={() => setSelectedUserForView(doc)} style={{ cursor: 'pointer' }} title="Двічі клацніть, щоб переглянути розрахунковий листок лікаря">
                  <td style={{ textAlign: 'center', color: '#ffffff' }}>{index + 1}</td>
                  <td style={{ fontWeight: 500 }}>{doc.name}</td>
                  <td style={{ color: '#ffffff', fontSize: '0.875rem' }}>{doc.position || '-'}</td>
                  <td><code style={{ color: '#ffffff', background: 'rgba(0,0,0,0.3)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '15px', fontWeight: '500' }}>{doc.login}</code></td>
                  <td style={{ fontWeight: 500, color: '#38bdf8' }}>
                    {(parseFloat(String(doc.statsForMonth?.vsyaZP || '').replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0).toLocaleString('uk-UA', { minimumFractionDigits: 2 })}
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
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
