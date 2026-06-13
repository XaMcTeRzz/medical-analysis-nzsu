'use client';

import { useMemo, useState } from 'react';

const sortFunctions = {
  id: (a, b) => (a.id || '').localeCompare(b.id || ''),
  emzId: (a, b) => (String(a.emzId || '')).localeCompare(String(b.emzId || '')),
  amount: (a, b) => (Number(a.amount) || 0) - (Number(b.amount) || 0),
};

const columns = [
  { key: 'id', label: 'ID Пацієнта (Хеш)' },
  { key: 'emzId', label: 'EMZ ID' },
  { key: 'amount', label: 'Сума (₴)' },
];

export default function PatientTable({ patients = [] }) {
  const [sortKey, setSortKey] = useState('id');
  const [sortDirection, setSortDirection] = useState('asc');

  const sortedPatients = useMemo(() => {
    const list = [...patients];
    const sortFn = sortFunctions[sortKey] || sortFunctions.id;

    list.sort((a, b) => {
      const result = sortFn(a, b);
      return sortDirection === 'asc' ? result : -result;
    });

    return list;
  }, [patients, sortKey, sortDirection]);

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
    <div style={{ overflowX: 'auto', maxHeight: '400px', marginBottom: '2rem' }}>
      <table className="data-table">
        <thead style={{ position: 'sticky', top: 0, background: '#0f0f15', zIndex: 10 }}>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                onClick={() => handleSort(column.key)}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                {column.label}{getArrow(column.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedPatients.length > 0 ? (
            sortedPatients.map((p, idx) => (
              <tr key={`${p.id || 'patient'}-${idx}`}>
                <td style={{ fontSize: '0.8rem', opacity: 0.8 }}>{(p.id || '').substring(0, 16)}...</td>
                <td style={{ fontSize: '0.85rem' }}>
                  <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                    {p.emzId}
                  </code>
                </td>
                <td className="success-text" style={{ fontWeight: 500 }}>
                  {(Number(p.amount) || 0).toLocaleString('uk-UA', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} style={{ textAlign: 'center', opacity: 0.5 }}>Немає даних</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
