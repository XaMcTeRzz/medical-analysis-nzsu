@echo off
chcp 65001 >nul
title Розгортання веб-додатку

echo ========================================
echo   🚀 Розгортання на безкоштовний хостинг
echo ========================================
echo.

echo Виберіть платформу для розгортання:
echo 1. Netlify (Рекомендовано)
echo 2. Vercel
echo 3. GitHub Pages
echo 4. Cloudflare Pages
echo 5. Показати інструкції
echo.
set /p choice=Ваш вибір (1-5): 

if "%choice%"=="1" goto netlify
if "%choice%"=="2" goto vercel
if "%choice%"=="3" goto github
if "%choice%"=="4" goto cloudflare
if "%choice%"=="5" goto instructions
goto invalid

:netlify
echo.
echo 🌐 Розгортання на Netlify...
echo.
echo 1. Перейдіть на https://netlify.com
echo 2. Створіть акаунт або увійдіть
echo 3. Натисніть "New site from Git"
echo 4. Підключіть ваш GitHub репозиторій
echo 5. Налаштуйте збірку:
echo    - Build command: echo "No build needed"
echo    - Publish directory: .
echo.
echo Після цього ваш сайт буде доступний!
pause
goto end

:vercel
echo.
echo 🌐 Розгортання на Vercel...
echo.
echo 1. Перейдіть на https://vercel.com
echo 2. Створіть акаунт або увійдіть
echo 3. Натисніть "New Project"
echo 4. Імпортуйте ваш GitHub репозиторій
echo 5. Vercel автоматично розгорне проєкт
echo.
pause
goto end

:github
echo.
echo 🌐 Розгортання на GitHub Pages...
echo.
echo 1. Завантажте код на GitHub
echo 2. У репозиторії Settings → Pages
echo 3. Виберіть Source: Deploy from a branch
echo 4. Виберіть гілку: main
echo 5. Збережіть налаштування
echo.
echo Сайт буде доступний за адресою:
echo https://YOUR_USERNAME.github.io/repository-name
pause
goto end

:cloudflare
echo.
echo 🌐 Розгортання на Cloudflare Pages...
echo.
echo 1. Перейдіть на https://dash.cloudflare.com
echo 2. Створіть акаунт або увійдіть
echo 3. Виберіть Workers and Pages → Create application
echo 4. Виберіть Connect to Git
echo 5. Підключіть GitHub репозиторій
echo 6. Налаштуйте збірку
echo.
pause
goto end

:instructions
echo.
echo 📖 Відкриваю інструкції...
start DEPLOYMENT.md
goto end

:invalid
echo.
echo ❌ Невірний вибір! Спробуйте ще раз.
pause
goto start

:end
echo.
echo ✅ Дякуємо за використання нашого додатку!
echo 📞 Підтримка: дивіться DEPLOYMENT.md
pause
