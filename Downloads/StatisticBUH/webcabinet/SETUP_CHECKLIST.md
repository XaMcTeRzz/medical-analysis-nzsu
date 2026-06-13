# ✅ CHECKLIST: Фіксинг зміни пароля на Netlify

## 🛠️ Що вже виправлено (LOCAL)

- [x] Оновлено `/app/api/users/change-password/route.js` - тепер використовує Supabase
- [x] Оновлено `/app/api/auth/login/route.js` - тепер використовує Supabase
- [x] Оновлено `/app/dashboard/page.js` - тепер використовує Supabase
- [x] Встановлено пакет `@supabase/supabase-js`
- [x] Створено `.env.local` для локальної розробки
- [x] Створено документацію

## 🚀 ЧО РОБИТИ ДАЛІ (NETLIFY)

### 1️⃣ Налаштування Supabase (5 хвилин)

```
[ ] Перейди на https://app.supabase.com
[ ] Вибери проект "tlddplfebghyctfresja"
[ ] Перейди на вкладку SQL Editor
[ ] Запусти SQL-запит для створення таблиці users (див. FIX_SUMMARY.md)
[ ] Імпортуй користувачів з data/users.json
```

### 2️⃣ Отримання Service Role Key (3 хвилини)

```
[ ] На Supabase: Settings > API
[ ] Скопіюй Service Role Key
[ ] (НЕ Anon Key - це інший ключ!)
```

### 3️⃣ Додавання змінних на Netlify (3 хвилини)

```
[ ] Перейди на https://app.netlify.com
[ ] Вибери сайт "NewSite2026Statistic"
[ ] Site settings > Build & deploy > Environment
[ ] Натисни Edit variables
[ ] Додай:
    SUPABASE_URL = https://tlddplfebghyctfresja.supabase.co
    SUPABASE_SERVICE_KEY = (вставь скопійований ключ)
```

### 4️⃣ Розгортання (2 хвилини)

```bash
# У терміналі вашого проекту:
git add .
git commit -m "fix: Use Supabase for persistent user data"
git push
# Чекай 2-3 хвилин для розгортання на Netlify
```

### 5️⃣ Тестування (2 хвилини)

```
[ ] Перейди на ваш сайт на Netlify
[ ] Залогінься як admin
[ ] Перейди до "Особистий Кабінет"
[ ] Натисни "Змінити пароль" для лікаря
[ ] Введи новий пароль
[ ] Перезавантаж сторінку
[ ] ✅ Пароль повинен залишитися змінено!
```

---

## 📚 Документи для прочитання

- **FIX_SUMMARY.md** - Детальне пояснення проблеми та рішення
- **NETLIFY_PASSWORD_FIX.md** - Підробна інструкція по налаштуванню
- **.env.local.example** - Приклад конфігурації

---

## ❓ Часті питання

**Q: Що, якщо рішення не розв'яже проблему?**
A: Перевір:
- [ ] Чи Service Role Key додана на Netlify (не Anon Key)?
- [ ] Чи таблиця `users` існує в Supabase?
- [ ] Чи користувачі імпортовані в Supabase?
- [ ] Перегляни логи Netlify Functions для помилок

**Q: Чи мої локальні дані будуть втрачені?**
A: Ні! Локально все працює як раніше:
- Локально: `data/users.json` використовується при розробці
- На Netlify: Supabase використовується для постійних даних

**Q: Як я можу кешировать користувачів локально?**
A: Поточний код вже має fallback:
1. Спробує прочитати з Supabase
2. Якщо не вдається, використовує `data/users.json`

---

⏱️ **Загальний час налаштування: ~15 хвилин**
