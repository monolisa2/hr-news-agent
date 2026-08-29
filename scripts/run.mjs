import fs from 'node:fs';
import path from 'node:path';
import { collect } from './collect.mjs';
import { summarize } from './summarize.mjs';
import { sendEmail } from './email.mjs';

const CONTENT_DIR = path.join(process.cwd(), 'content');
const dryRun = process.argv.includes('--dry-run');
const noMail = process.argv.includes('--no-mail') || dryRun;

// KST 기준 오늘 날짜 (YYYY-MM-DD)
function kstToday() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
}

function kstLabel(iso) {
  const [y, m, d] = iso.split('-');
  const weekday = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
  }).format(new Date(`${iso}T03:00:00Z`));
  return `${y}년 ${Number(m)}월 ${Number(d)}일 (${weekday})`;
}

async function main() {
  const date = kstToday();
  const label = kstLabel(date);
  console.log(`\n=== 인사 브리핑 ${label} ===\n`);

  fs.mkdirSync(CONTENT_DIR, { recursive: true });

  const existing = fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f));
  const issue = existing.filter((f) => f !== `${date}.json`).length + 1;

  let items = await collect({ window: '1d' });
  if (items.length < 8) {
    console.log('기사가 적어 수집 범위를 2일로 넓힙니다.');
    items = await collect({ window: '2d' });
  }
  if (items.length === 0) {
    console.log('수집된 기사가 없어 종료합니다.');
    return;
  }

  const brief = await summarize(items, label);
  const total = brief.categories.reduce((n, c) => n + c.items.length, 0);
  if (total === 0) {
    console.log('선별된 기사가 없어 종료합니다.');
    return;
  }

  const record = {
    date,
    label,
    issue,
    generatedAt: new Date().toISOString(),
    ...brief,
  };

  if (dryRun) {
    console.log('\n--- DRY RUN 결과 ---\n');
    console.log(JSON.stringify(record, null, 2));
    return;
  }

  const file = path.join(CONTENT_DIR, `${date}.json`);
  fs.writeFileSync(file, JSON.stringify(record, null, 2) + '\n', 'utf8');
  console.log(`저장 완료: content/${date}.json`);

  if (!noMail) {
    await sendEmail(record, {
      date: label,
      issue,
      siteUrl: process.env.SITE_URL || '#',
    });
  }
}

main().catch((err) => {
  console.error('\n실패:', err.message);
  process.exit(1);
});
