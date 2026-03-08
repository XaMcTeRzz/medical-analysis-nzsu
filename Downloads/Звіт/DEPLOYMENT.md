# 🚀 Розгортання веб-додатку "Аналіз медичних даних НСЗУ"

## Безкоштовні варіанти хостингу

### 1. Netlify (Рекомендовано)
**Переваги:**
- Безкоштовний план до 100GB/місяць
- Автоматичне розгортання з GitHub
- HTTPS за замовчуванням
- Швидкий CDN

**Як розгорнути:**
1. Завантажте код на GitHub
2. Зареєструйтесь на [netlify.com](https://netlify.com)
3. Підключіть GitHub репозиторій
4. Налаштуйте збірку:
   - Build command: `echo "No build needed"`
   - Publish directory: `.`
5. Розгорніть сайт

### 2. Vercel
**Переваги:**
- Безкоштовний план 100GB/місяць
- Підтримка статичних сайтів
- Автоматичне розгортання
- Глобальна CDN

**Як розгорнути:**
1. Завантажте код на GitHub
2. Зареєструйтесь на [vercel.com](https://vercel.com)
3. Імпортуйте репозиторій
4. Vercel автоматично визначить налаштування

### 3. GitHub Pages
**Переваги:**
- Повністю безкоштовно
- Інтеграція з GitHub
- Надійність

**Як розгорнути:**
1. Завантажте код на GitHub
2. У налаштуваннях репозиторію → Pages
3. Виберіть гілку `main`
4. Встановіть джерело: `Deploy from a branch`
5. Сайт буде доступний за адресою: `https://username.github.io/repository-name`

### 4. Cloudflare Pages
**Переваги:**
- Безкоштовний план з необмеженою пропускною здатністю
- Швидка CDN
- Підтримка кастомних доменів

**Як розгорнути:**
1. Завантажте код на GitHub
2. Зареєструйтесь на [dash.cloudflare.com](https://dash.cloudflare.com)
3. Створіть новий сайт з GitHub
4. Виберіть гілку та налаштування збірки

## 📁 Підготовка файлів для розгортання

### Крок 1: Створення репозиторію GitHub
```bash
# Ініціалізація git
git init
git add .
git commit -m "Initial commit: Medical Data Analysis NSZU"

# Створення репозиторію на GitHub та пуш
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/medical-analysis-nzsu.git
git push -u origin main
```

### Крок 2: Оптимізація файлів
Веб-додаток вже готовий до розгортання:
- ✅ HTML файл оптимізований
- ✅ CSS мінімізований
- ✅ JavaScript готовий
- ✅ Всі залежності підключені через CDN

## 🔧 Налаштування для різних платформ

### Для Netlify:
Створіть файл `netlify.toml`:
```toml
[build]
  publish = "."
  command = "echo 'No build needed'"

[build.environment]
  NODE_VERSION = "18"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
```

### Для Vercel:
Створіть файл `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "**/*",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

## 🌐 Кастомний домен (опціонально)

### Для Netlify:
1. У налаштуваннях сайту → Domain management
2. Додайте свій домен
3. Налаштуйте DNS записи

### Для Vercel:
1. У налаштуваннях проєкту → Domains
2. Додайте домен
3. Додайте DNS записи

## 📊 Моніторинг та аналітика

### Google Analytics (безкоштовно):
1. Створіть акаунт на [analytics.google.com](https://analytics.google.com)
2. Додіть трекінг код в `index.html`:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## 🚨 Важливі примітки

1. **Безпека:** Усі дані обробляються локально, на сервер нічого не відправляється
2. **Продуктивність:** Використовуйте CDN для швидкості завантаження
3. **SEO:** Мета-теги вже оптимізовані для пошукових систем
4. **Резервне копіювання:** GitHub автоматично створює бекапи коду

## 📞 Підтримка

Якщо виникли проблеми з розгортанням:
- Перевірте консоль браузера на помилки
- Переконайтесь, що всі файли завантажені
- Перевірте налаштування CORS на хостингу

---

**Рекомендований варіант:** Netlify - найпростіший для початківців з чудовою документацією та підтримкою.
