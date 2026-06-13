import './globals.css';

export const metadata = {
  title: 'Медична Статистика - Особистий Кабінет',
  description: 'Преміальна система статистики',
};

export default function RootLayout({ children }) {
  return (
    <html lang="uk">
      <body>
        {children}
      </body>
    </html>
  );
}
