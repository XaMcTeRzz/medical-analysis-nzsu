const fetch = require('node-fetch'); // fallback if not available
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gijfxhpneyayltprmhul.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

// SQL для створення таблиці
const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  login TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  position TEXT,
  stats JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_users_login ON public.users(login);
`;

async function createTableViaSQL() {
  try {
    console.log('🔧 Спроба створити таблицю через SQL...');
    
    // Запит до Supabase SQL Editor
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
      },
      body: JSON.stringify({
        query: CREATE_TABLE_SQL
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    console.log('✅ Таблиця успішно створена!');
    return true;
  } catch (error) {
    console.warn('⚠️  Не можу створити таблицю через API');
    console.log('\n❌ ВРУЧНУ: Виконайте цей SQL запит на https://app.supabase.com:');
    console.log('1. Перейдіть на свій проект Supabase');
    console.log('2. SQL Editor (в лівому меню)');
    console.log('3. Натисніть "New Query"');
    console.log('4. Вставте цей код:');
    console.log('\n' + CREATE_TABLE_SQL);
    console.log('\n5. Натисніть "Run"');
    return false;
  }
}

createTableViaSQL();
