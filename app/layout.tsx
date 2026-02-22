import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'QR Order MVP',
  description: 'Restaurant QR ordering MVP'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
