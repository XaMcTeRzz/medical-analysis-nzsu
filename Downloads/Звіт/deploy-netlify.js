#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Розгортання веб-додатку на Netlify...');

// Перевірка наявності файлів
const requiredFiles = ['index.html', 'README.md'];
for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
        console.error(`❌ Помилка: Файл ${file} не знайдено`);
        process.exit(1);
    }
}

try {
    // Ініціалізація git якщо потрібно
    if (!fs.existsSync('.git')) {
        console.log('📁 Ініціалізація Git репозиторію...');
        execSync('git init', { stdio: 'inherit' });
        execSync('git add .', { stdio: 'inherit' });
        execSync('git commit -m "Initial commit: Medical Data Analysis NSZU by XaMcTeR"', { stdio: 'inherit' });
    } else {
        console.log('📝 Додавання змін...');
        execSync('git add .', { stdio: 'inherit' });
        execSync('git commit -m "Update: Improved UI and deployment ready"', { stdio: 'inherit' });
    }

    // Створення netlify.toml якщо не існує
    if (!fs.existsSync('netlify.toml')) {
        console.log('⚙️ Створення налаштувань Netlify...');
        const netlifyConfig = `[build]
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
    Cache-Control = "public, max-age=31536000"
`;
        fs.writeFileSync('netlify.toml', netlifyConfig);
        execSync('git add netlify.toml', { stdio: 'inherit' });
        execSync('git commit -m "Add Netlify configuration"', { stdio: 'inherit' });
    }

    console.log('✅ Підготовка завершена!');
    console.log('\n📋 Наступні кроки:');
    console.log('1. Створіть акаунт на https://netlify.com');
    console.log('2. Створіть новий репозиторій на GitHub');
    console.log('3. Підключіть GitHub до Netlify');
    console.log('4. Розгорніть проєкт');
    console.log('\n🌐 Ваш сайт буде доступний за адресою: https://your-project-name.netlify.app');
    
} catch (error) {
    console.error('❌ Помилка під час підготовки:', error.message);
    process.exit(1);
}
