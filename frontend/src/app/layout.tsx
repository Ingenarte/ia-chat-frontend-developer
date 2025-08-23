import './globals.css';
import type { Metadata } from 'next';
import MobileBlocker from '@/components/MobileBlocker';

export const metadata: Metadata = {
  title: 'IA Chat Frontend',
  description: 'Left chat + right live HTML preview',
  icons: {
    icon: '/IngenarteDevLogo.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <MobileBlocker>{children}</MobileBlocker>
      </body>
    </html>
  );
}
