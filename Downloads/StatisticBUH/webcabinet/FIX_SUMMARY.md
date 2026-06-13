# ✅ Розв'язання: Зміна пароля на Netlify

## 🔴 ЧОМ НЕ ПРАЦЮВАЛО

Ваш додаток на Netlify не міг змінювати пароль тому що:

1. **API намагалася писати в локальну файлову систему** 
   - Файл: `/data/users.json`
   - Проблема: На Netlify файлова система є **ephemeral** (тимчасова)
   - Результат: Зміни втрачаються після завершення функції

2. **Цей файл існує лише під час build**
   - Генерується скриптом `generateUsers.js` при `npm run netlify-build`
   - Но не оновлюється при запуску API на Netlify Functions

3. **Затримувачі даних на Netlify:**
   ```
   ❌ fs.writeFileSync() - не работає на serverless
   ❌ fs.readFileSync() - работає лише під час build
   ✅ База даних (Supabase) - лучше рішення
   ```

## ✅ ЧТО БУЛо ВИПРАВЛЕНО

### Оновлені файлы:

1. **`/app/api/users/change-password/route.js`**
   - Спочатку: писав у `data/users.json`
   - Тепер: ✅ Записує в Supabase + fallback до локального файлу

2. **`/app/api/auth/login/route.js`**
   - Спочатку: читав з `data/users.json`
   - Тепер: ✅ Читає з Supabase + fallback до локального файлу

3. **`/app/dashboard/page.js`**
   - Спочатку: читав з `data/users.json`
   - Тепер: ✅ Читає з Supabase + fallback до локального файлу

4. **Встановлено:**
   - Пакет `@supabase/supabase-js` для роботи з базою даних

## 📋 НЕОБХІДНІ ДІЇ НА NETLIFY

### Крок 1: Налаштування таблиці в Supabase

Перейдіть на https://app.supabase.com і виконайте SQL-запит:

```sql
CREATE TABLE IF NOT EXISTS users (
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

### Крок 2: Импортуйте існуючих користувачів в Supabase

1. Прочитайте файл `data/users.json` з вашого локального проекту
2. На Supabase Dashboard, перейдіть на вкладку **SQL Editor**
3. Запустите команду для вставки користувачів:

```sql
INSERT INTO users (id, login, password, name, role, position, stats) VALUES
('user-id-1', 'admin', 'password', 'Admin Name', 'admin', NULL, '{}'),
('user-id-2', 'doctor1', 'password', 'Doctor Name', 'doctor', 'Терапевт', '{}')
-- ... додайте всіх лікарів з вашого файлу
```

Або експортуйте JSON з `data/users.json` через UI Supabase.

### Крок 3: Отримайте Service Role Key

1. На https://app.supabase.com виберіть ваш проект
2. Перейдіть: **Settings** > **API**
3. Скопіюйте: **Service Role Key** (НЕ Anon Key!)
   - Повинен виглядати як: `eyJhbGc...` (довга строка)

### Крок 4: Додайте змінні на Netlify

1. Перейдіть на https://app.netlify.com
2. Виберіть ваш сайт: `NewSite2026Statistic`
3. Нав.: **Site settings** > **Build & deploy** > **Environment**
4. Натисніть: **Edit variables**
5. Додайте дві змінні:

| Назва | Значення |
|-------|----------|
| `SUPABASE_URL` | `https://tlddplfebghyctfresja.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Вставте скопійований Service Role Key |

### Крок 5: Розгорніть на Netlify

```bash
git add .
git commit -m "fix: Use Supabase for persistent user data"
git push
```

Залльте кілька хвилин для розгортання на Netlify.

## 🧪 ТЕСТУВАННЯ

1. Перейдіть на ваш сайт на Netlify
2. Залогіньтеся як admin
3. Перейдіть до **Особистий Кабінет**
4. Знайдіть лікаря і натисніть **Змінити пароль**
5. Введіть новий пароль і натисніть ✓
6. Перезавантажте сторінку
7. ✅ **Пароль повинен залишатися змінено!**

## ❌ ЯКЩО ВСЕ ЩЕ НЕ ПРАЦЮЄ

### Перевірьте:

- [ ] Чи змінні середовища додані на Netlify? 
  - Goto: Site settings > Build & deploy > Environment
  - Вони повинні бути там **перед** розгортанням

- [ ] Чи Service Role Key правильний?
  - НЕ Anon Key (коротша)
  - НЕ опублікована (секретна)

- [ ] Чи таблиця `users` існує в Supabase?
  - Goto: Supabase > Database > Tables
  - Повинна бути таблиця `users`

- [ ] Чи користувачі імпортовані в Supabase?
  - Goto: Supabase > Table editor > users
  - Повинні бути всі лікарі зі списку

### Перегляд логів:

```bash
# На Netlify перегляньте логи функцій:
Site settings > Functions > change-password logs
```

## 📝 ПОДАЛЬШІ КРОКИ (Опціонально)

Для повної безпеки в майбутньому:

1. **Хешуйте паролі** - використовуйте bcrypt для зберігання паролів
2. **Видаліть** файл `data/users.json` з проекту (його більше не потрібно)
3. **Встановіть** Row Level Security (RLS) в Supabase для більшої безпеки

---

**🎉 Готово!** Ваша система змін пароля на Netlify тепер буде працювати!
