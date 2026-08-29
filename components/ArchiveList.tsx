'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

export type ArchiveEntry = {
  date: string;
  label: string;
  headline: string;
  count: number;
  haystack: string;
};

export default function ArchiveList({ entries }: { entries: ArchiveEntry[] }) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return entries;
    return entries.filter((e) => e.haystack.includes(term));
  }, [q, entries]);

  return (
    <>
      <input
        className="filter"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="키워드로 지난 브리핑 찾기 — 예: 최저임금, 부당해고"
        aria-label="브리핑 검색"
      />

      {filtered.length === 0 ? (
        <div className="empty">“{q}”가 들어간 브리핑이 없습니다. 다른 키워드를 넣어보세요.</div>
      ) : (
        filtered.map((e) => (
          <Link className="archive-row" href={`/brief/${e.date}`} key={e.date}>
            <span className="archive-date">{e.date}</span>
            <span className="archive-headline">{e.headline}</span>
            <span className="archive-count">{e.count}건</span>
          </Link>
        ))
      )}
    </>
  );
}
