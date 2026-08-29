import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { getAllBriefs, countItems } from '@/lib/content';
import DateRail from '@/components/DateRail';

export const metadata: Metadata = {
  title: '인사 브리핑',
  description: '매일 아침 정리하는 인사·노무 뉴스 브리핑 아카이브',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const entries = getAllBriefs().map((b) => ({
    date: b.date,
    headline: b.headline,
    count: countItems(b),
  }));

  return (
    <html lang="ko">
      <body>
        <header className="masthead">
          <div className="shell masthead-inner">
            <Link href="/" className="wordmark">
              <span>Daily HR Brief</span>
              인사 브리핑
            </Link>
            <nav className="nav">
              <Link href="/">오늘</Link>
              <Link href="/archive">아카이브</Link>
            </nav>
          </div>
        </header>

        <DateRail entries={entries} />

        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
