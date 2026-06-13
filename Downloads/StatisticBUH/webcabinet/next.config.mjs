import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const rootDir = dirname(fileURLToPath(import.meta.url));

const securityHeaders = [
  // Забороняє відображення сайту в iframe (захист від Clickjacking)
  { key: 'X-Frame-Options', value: 'DENY' },
  // Забороняє браузеру "вгадувати" MIME-тип файлів
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Мінімальна інформація про Referer при переходах
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Вимикає непотрібні браузерні можливості
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // Захист від XSS в старих браузерах
  { key: 'X-XSS-Protection', value: '1; mode=block' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: rootDir,
  },
  async headers() {
    return [
      {
        // Застосовуємо до всіх маршрутів
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
