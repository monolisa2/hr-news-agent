import { getAllBriefs, getBrief } from '@/lib/content';
import BriefView from '@/components/BriefView';

export function generateStaticParams() {
  const params = getAllBriefs().map((b) => ({ date: b.date }));
  // 브리핑이 한 건도 없으면 output:'export' 빌드가 실패합니다.
  // 기사가 0건인 날에도 사이트 배포가 죽지 않도록 자리표시자를 하나 둡니다.
  return params.length > 0 ? params : [{ date: 'none' }];
}

export default async function BriefPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const brief = getBrief(date);
  if (!brief) {
    return <div className="empty">아직 발행된 브리핑이 없습니다.</div>;
  }
  return <BriefView brief={brief} />;
}
