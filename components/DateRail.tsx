import Link from 'next/link';

type Entry = { date: string; headline: string; count: number };

// 최근 90일을 눈금으로 펼쳐, 브리핑이 쌓인 날과 빈 날을 한눈에 보여줍니다.
// 눈금 높이는 그날 실린 기사 수입니다.
export default function DateRail({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) return null;

  const map = new Map(entries.map((e) => [e.date, e]));
  const latest = entries[0].date;
  const end = new Date(`${latest}T00:00:00Z`);

  const days: string[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  return (
    <div className="rail" aria-label="발행 기록">
      <div className="rail-inner">
        <span className="rail-label">발행 기록 · 최근 90일</span>
        {days.map((d) => {
          const e = map.get(d);
          if (!e) {
            return <span key={d} className="tick tick-off" style={{ height: 4 }} aria-hidden />;
          }
          const h = Math.min(30, 11 + e.count * 1.6);
          return (
            <Link
              key={d}
              href={`/brief/${d}`}
              className={`tick ${d === latest ? 'tick-current' : 'tick-on'}`}
              style={{ height: h }}
              title={`${d} · ${e.headline}`}
            >
              <span className="sr-only" style={{ position: 'absolute', left: -9999 }}>
                {d} 브리핑
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
