import Link from 'next/link';
import { getAllBriefs, countItems } from '@/lib/content';
import BriefView from '@/components/BriefView';

export default function Home() {
  const briefs = getAllBriefs();

  if (briefs.length === 0) {
    return (
      <div className="empty">
        아직 발행된 브리핑이 없습니다. GitHub Actions에서 <code>Daily HR Brief</code> 워크플로를 한
        번 실행하면 첫 호가 여기에 표시됩니다.
      </div>
    );
  }

  const [latest, ...rest] = briefs;

  return (
    <>
      <BriefView brief={latest} />

      {rest.length > 0 && (
        <section>
          <h2 className="section-title">지난 브리핑</h2>
          {rest.slice(0, 10).map((b) => (
            <Link className="archive-row" href={`/brief/${b.date}`} key={b.date}>
              <span className="archive-date">{b.date}</span>
              <span className="archive-headline">{b.headline}</span>
              <span className="archive-count">{countItems(b)}건</span>
            </Link>
          ))}
          {rest.length > 10 && (
            <p className="note">
              <Link href="/archive">전체 아카이브 보기 →</Link>
            </p>
          )}
        </section>
      )}
    </>
  );
}
