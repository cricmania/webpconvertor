import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'WebP Converter - Fast & Secure Image Optimization',
  description: 'Bulk convert PNG and JPG to WebP, AVIF, and JPEG locally in your browser. Privacy-first, high-performance image optimization by Web Design Sutra.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
