import './globals.css';
import AppProviders from '@/providers/AppProviders';

export const metadata = {
  title: 'Naxt Ecommerce',
  description: 'Next.js frontend and admin panel for ecommerce platform'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
