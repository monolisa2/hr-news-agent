import type { Brief } from '@/lib/content';

export default function BriefView({ brief }: { brief: Brief }) {
  let n = 0;

  return (
    <article>
      <header className="issue-head reveal">
        <div className="stamp">
          <span>
            제 <b>{brief.issue}</b> 호
          </span>
          <span>{brief.label}</span>
          {brief.sample && <span className="badge">샘플</span>}
        </div>
        <h1 className="headline">{brief.headline}</h1>
        {brief.lede && <p className="lede">{brief.lede}</p>}
      </header>

      {brief.categories.map((cat) => (
        <section className="category" key={cat.key}>
          <div className="category-head">
            <h2 className="category-name">{cat.name}</h2>
            <span className="category-count">{cat.items.length}건</span>
          </div>

          {cat.items.map((item) => {
            n += 1;
            return (
              <div className="item" key={item.url}>
                <div className="item-index">{String(n).padStart(2, '0')}</div>
                <div>
                  <a
                    className="item-title"
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.title}
                  </a>
                  <div className="item-meta">{item.source}</div>
                  <p className="item-summary">{item.summary}</p>
                  {item.impact && <div className="impact">{item.impact}</div>}
                </div>
              </div>
            );
          })}
        </section>
      ))}

      <p className="note">
        공개된 기사 제목과 요약문을 바탕으로 자동 정리한 내용입니다. 원문 전체를 옮기지 않으며,
        정확한 사실관계는 각 기사 링크에서 확인하세요. 요약은 기계가 작성하므로 오류가 있을 수
        있습니다.
      </p>
    </article>
  );
}
