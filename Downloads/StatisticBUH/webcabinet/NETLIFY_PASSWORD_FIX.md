# Розв'язання проблеми зміни пароля на Netlify

## 🔴 Проблема
Зміна пароля лікаря не працює на Netlify тому, що API намагається зберегти дані у локальному файлі (`data/users.json`), але Netlify має **ephemeral файлову систему** - всі зміни втрачаються після завершення функції.

## ✅ Рішення

### Крок 1: Налаштування Supabase (у вас вже є конфіг)

Переконайтеся, що у Supabase існує таблиця `users` з колонками:
- `id` (UUID, Primary Key)
- `login` (text)
- `password` (text)  
- `name` (text)
- `role` (text) - 'admin' або 'doctor'
- `position` (text, optional)
- `stats` (jsonb, optional)

**SQL для створення таблиці:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  login TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'doctor',
  position TEXT,
  stats JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT now()
);
```

### Крок 2: Отримання Service Role Key

1. Перейдіть на https://app.supabase.com
2. Виберіть ваш проект
3. Перейдіть на **Settings > API**
4. Скопіюйте **Service Role Key** (не Anon Key!)

### Крок 3: Додавання環境變數на Netlify

1. Перейдіть на https://app.netlify.com
2. Виберіть ваш сайт (`NewSite2026Statistic`)
3. Перейдіть на **Site settings > Build & deploy > Environment**
4. Натисніть **Edit variables**
5. Додайте дві змінні:
   - **SUPABASE_URL**: `https://tlddplfebghyctfresja.supabase.co`
   - **SUPABASE_SERVICE_KEY**: вставте Service Role Key з Supabase

### Крок 4: Оновлення інших API маршрутів

⚠️ **Важливо**: Вам також потрібно оновити `/api/auth/login/route.js`, щоб використовувати Supabase замість файлової системи. Без цього логін також не буде працювати після перезавантаження.

Виконайте ці команди:
```bash
cd c:\Users\PC\Downloads\NewSite2026Statistic
npm run build
npm run start
```

Потім розгорніть на Netlify:
```bash
git add .
git commit -m "Fix: Use Supabase for persistent user data on Netlify"
git push
```

### Крок 5: Тестування

1. На Netlify перезавантажте сайт
2. Спробуйте змінити пароль для профіля іншого лікаря
3. Перезавантажте сторінку - пароль повинен залишатися змінено

## 🐛 Якщо все ще не працює

Проверьте:
- Чи встановлені змінні середовища на Netlify? (перевіріть в Build & deploy > Environment)
- Чи правильний Service Role Key (повинен починатися з `eyJ` або подібного)?
- Чи існує таблиця `users` у Supabase?
- Чи є доступ до базисної бази від Netlify IP? (зазвичай дозволено за замовчуванням)

## 📝 Додатково: Оновлення інших API

Для повної розробки на Netlify, будуть потрібні оновлення всіх файлів:
- `/app/api/auth/login/route.js` - використовувати Supabase для логіну
- `/app/api/auth/logout/route.js` - залишається без змін (може залишитися як є)
- Всі інші API маршрути, що працюють з користувачами
