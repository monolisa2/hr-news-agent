import { getAllBriefs, countItems } from '@/lib/content';
import ArchiveList, { type ArchiveEntry } from '@/components/ArchiveList';

export default function ArchivePage() {
  const entries: ArchiveEntry[] = getAllBriefs().map((b) => ({
    date: b.date,
    label: b.label,
    headline: b.headline,
    count: countItems(b),
    haystack: [
      b.date,
      b.headline,
      b.lede,
      ...b.categories.flatMap((c) =>
        c.items.flatMap((i) => [i.title, i.summary, i.impact, i.source])
      ),
    ]
      .join(' ')
      .toLowerCase(),
  }));

  return (
    <>
      <header className="issue-head">
        <div className="stamp">
          <span>
            누적 <b>{entries.length}</b> 호
          </span>
        </div>
        <h1 className="headline">아카이브</h1>
        <p className="lede">
          지난 브리핑 전체입니다. 검색어는 제목·요약·실무 포인트까지 함께 훑습니다.
        </p>
      </header>

      <ArchiveList entries={entries} />
    </>
  );
}
