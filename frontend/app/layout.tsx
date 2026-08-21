import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'Market Data AI Analyzer — Intelligence Terminal',
  description:
    'Dark-themed market intelligence terminal with AI-powered analysis, real-time data, and editorial typography.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      dir="ltr"
      className="dark"
      suppressHydrationWarning
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Serif+Display:ital@0;1&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="bg-[#08080a] text-[#e2e3e9] antialiased min-h-screen selection:bg-[#cc9166]/20 selection:text-[#e2e3e9]"
        suppressHydrationWarning
        style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
