'use client';

import { useMemo, useState } from 'react';
import PrintButton from './PrintButton';

export default function UserView({ user, selectedMonth }) {
  const stats = user.stats || {};

  // Get current active salary data (support selected month or fallback to active salary)
  const activeSalary = useMemo(() => {
    if (selectedMonth && stats.salaries && stats.salaries[selectedMonth.toLowerCase()]) {
      return stats.salaries[selectedMonth.toLowerCase()];
    }
    return stats.salary || {};
  }, [stats, selectedMonth]);

  const formatAmount = (val) => {
    if (val === undefined || val === null || val === '') return '';
    const num = Number(String(val).replace(/\s/g, '').replace(',', '.'));
    if (isNaN(num)) return val;
    return num.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="glass-card center-card" style={{ width: '100%' }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem', width: '100%' }}>
        {activeSalary && activeSalary.multuk1C && <PrintButton />}
      </div>

      {activeSalary && activeSalary.multuk1C ? (
        <div style={{ marginTop: '1rem', width: '100%' }}>
          <div className="glass-card printable-card" style={{ background: '#fff', color: '#000', padding: '1.5rem', borderRadius: '8px', border: '1px solid #ccc', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Організація: <span style={{ fontWeight: 'normal' }}>{activeSalary.multuk1C.org}</span></div>
                <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Підрозділ: <span style={{ fontWeight: 'normal' }}>{activeSalary.multuk1C.department}</span></div>
              </div>
            </div>
            
            <div style={{ textAlign: 'center', background: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1', padding: '6px 12px', fontWeight: 'bold', marginBottom: '15px', display: 'inline-block', borderRadius: '4px' }}>
              {activeSalary.multuk1C.header}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{user.name}</div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#666', textTransform: 'uppercase' }}>Належить до виплати:</div>
                <div style={{ display: 'flex', gap: '20px', marginTop: '4px' }}>
                  <div><span style={{ fontWeight: 'bold' }}>Посада:</span> {activeSalary.multuk1C.position}</div>
                  <div><span style={{ fontWeight: 'bold' }}>Оклад (тариф):</span> {activeSalary.multuk1C.oklad}</div>
                </div>
              </div>
            </div>

            <div className="tables-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'stretch' }}>
              {/* Ліва частина - 1С */}
              <div className="table-left" style={{ flex: '1 1 0', minWidth: '450px', border: '1px solid #000', overflowX: 'auto', background: '#fff', display: 'flex', flexDirection: 'column' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', flexGrow: 1 }}>
                  <thead>
                    <tr style={{ background: '#f2f2f2' }}>
                      <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center' }}>Вид</th>
                      <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center' }}>Період</th>
                      <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center' }}>Робочі<br/>Дні | Г-ни</th>
                      <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center' }}>Оплачено</th>
                      <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center' }}>Сума</th>
                      <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center' }}>Вид</th>
                      <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center' }}>Період</th>
                      <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center' }}>Сума</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ background: '#e6e6e6', fontWeight: 'bold' }}>
                      <td colSpan="4" style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center' }}>Нараховано:</td>
                      <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center' }}>{formatAmount(activeSalary.multuk1C.totalAccrued)}</td>
                      <td colSpan="2" style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center' }}>Утримано:</td>
                      <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center' }}>{formatAmount(activeSalary.multuk1C.totalWithheld)}</td>
                    </tr>
                    
                    {/* Рядки лівої і правої під-таблиці */}
                    {Array.from({ length: Math.max(activeSalary.multuk1C.accrued.length, activeSalary.multuk1C.withheld.length + activeSalary.multuk1C.paid.length + 1) }).map((_, i) => {
                      const acc = activeSalary.multuk1C.accrued[i] || {};
                      
                      let rightCol = {};
                      let isPaidHeader = false;
                      let isPaidRow = false;
                      
                      if (i < activeSalary.multuk1C.withheld.length) {
                        rightCol = activeSalary.multuk1C.withheld[i];
                      } else if (i === activeSalary.multuk1C.withheld.length) {
                        isPaidHeader = true;
                      } else {
                        rightCol = activeSalary.multuk1C.paid[i - activeSalary.multuk1C.withheld.length - 1] || {};
                        isPaidRow = true;
                      }

                      return (
                        <tr key={i}>
                          <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{acc.name || '\u00A0'}</td>
                          <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{acc.period || '\u00A0'}</td>
                          <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                            {acc.days ? `${acc.days} | ${acc.hours}` : '\u00A0'}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{acc.paidDays || '\u00A0'}</td>
                          <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', background: acc.name && acc.name.includes('Премія') ? '#ffffcc' : acc.name && acc.name.includes('Надбавка') ? '#e6f2ff' : 'transparent' }}>{formatAmount(acc.amount)}</td>
                          
                           {isPaidHeader ? (
                            <>
                              <td colSpan="2" style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold', textAlign: 'center', background: '#f0fdf4' }}>Виплачено:</td>
                              <td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold', textAlign: 'center', background: '#f0fdf4' }}>{formatAmount(activeSalary.multuk1C.totalPaid)}</td>
                            </>
                          ) : (
                            <>
                              <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{rightCol.name || '\u00A0'}</td>
                              <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{rightCol.period || '\u00A0'}</td>
                              <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', background: isPaidRow && rightCol.name ? '#f0fdf4' : 'transparent' }}>{formatAmount(rightCol.amount)}</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Права частина - Синя таблиця */}
              <div className="table-right" style={{ flex: '1 1 0', minWidth: '350px', background: '#f8fafc', padding: '12px', border: '1px solid #cbd5e1', overflowX: 'auto', display: 'flex', flexDirection: 'column' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', flexGrow: 1 }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
                      <th colSpan="6" style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>ЛІКАР</th>
                    </tr>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.8)' }}>
                      <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center' }}>Період</th>
                      <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center' }}>К-ть</th>
                      <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center' }}>Тариф</th>
                      <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center' }}>Сума</th>
                      <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center' }}>Опис</th>
                      <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center' }}>Примітка</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSalary.multuk1C.likarTable && activeSalary.multuk1C.likarTable.length > 0 ? (
                      activeSalary.multuk1C.likarTable.map((row, idx) => {
                        const desc = row.desc ? row.desc.toLowerCase() : '';
                        const isPremiya = desc.includes('премія');
                        const isVsyaZP = desc.toLowerCase().startsWith('зарплата');
                        const isDeduction = (desc.includes('аванс') || desc.includes('зп від окладу')) && !isPremiya;
                        
                        let bgColor = 'transparent';
                        let textColor = 'inherit';
                        let fontWeight = 'normal';
                        let amountColor = 'inherit';

                        if (isPremiya) {
                          bgColor = '#fffbeb'; // Modern Soft Gold
                          textColor = '#78350f';
                          fontWeight = '600';
                          amountColor = '#b45309';
                        } else if (isVsyaZP) {
                          bgColor = '#f0fdf4'; // Modern Soft Emerald
                          textColor = '#166534';
                          fontWeight = '600';
                          amountColor = '#15803d';
                        } else if (isDeduction) {
                          bgColor = '#fef2f2'; // Modern Soft Rose
                          textColor = '#991b1b';
                          amountColor = '#b91c1c';
                        }

                        return (
                          <tr key={idx} style={{ backgroundColor: bgColor, color: textColor, fontWeight: fontWeight }}>
                            <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>{row.period}</td>
                            <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>{row.col1}</td>
                            <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>{row.col2}</td>
                            <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontWeight: '600', color: amountColor }}>
                              {isDeduction && row.amount && parseFloat(row.amount) > 0 ? '-' : ''}{formatAmount(row.amount)}
                            </td>
                            <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>{row.desc}</td>
                            <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>{row.notes}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ padding: '10px', textAlign: 'center', color: '#666' }}>Немає даних для відображення</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'rgba(255,255,255,0.5)', width: '100%' }}>
          Немає даних розрахункового листка за цей місяць
        </div>
      )}

      {stats.errors && stats.errors.length > 0 && (
        <div style={{ width: '100%' }}>
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
        </div>
      )}
    </div>
  );
}
