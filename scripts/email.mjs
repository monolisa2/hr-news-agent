import nodemailer from 'nodemailer';

const C = {
  paper: '#e9ecef',
  card: '#ffffff',
  ink: '#101820',
  soft: '#5a6673',
  rule: '#c9d0d7',
  accent: '#275b4e',
};

function esc(s = '') {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderHtml(brief, { date, issue, siteUrl }) {
  let n = 0;
  const sections = brief.categories
    .map((cat) => {
      const items = cat.items
        .map((it) => {
          n += 1;
          const num = String(n).padStart(2, '0');
          return `
          <tr><td style="padding:0 0 26px 0;">
            <div style="font:600 11px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.12em;color:${C.soft};padding-bottom:6px;">${num} · ${esc(it.source)}</div>
            <a href="${esc(it.url)}" style="font:700 17px/1.45 'Noto Sans KR',-apple-system,'Malgun Gothic',sans-serif;color:${C.ink};text-decoration:none;">${esc(it.title)}</a>
            <div style="font:400 14px/1.75 'Noto Sans KR',-apple-system,'Malgun Gothic',sans-serif;color:${C.soft};padding-top:8px;">${esc(it.summary)}</div>
            ${
              it.impact
                ? `<div style="margin-top:10px;padding:9px 0 9px 12px;border-left:2px solid ${C.accent};font:500 13px/1.6 'Noto Sans KR',-apple-system,'Malgun Gothic',sans-serif;color:${C.accent};">${esc(it.impact)}</div>`
                : ''
            }
          </td></tr>`;
        })
        .join('');
      return `
      <tr><td style="padding:0 0 8px 0;">
        <div style="font:700 11px/1 'Noto Sans KR',-apple-system,'Malgun Gothic',sans-serif;letter-spacing:.18em;color:${C.accent};border-bottom:1px solid ${C.rule};padding:22px 0 10px;margin-bottom:20px;">${esc(cat.name)}</div>
      </td></tr>
      ${items}`;
    })
    .join('');

  return `<!doctype html><html><body style="margin:0;padding:24px 12px;background:${C.paper};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:${C.card};border:1px solid ${C.rule};">
<tr><td style="padding:34px 34px 0;">
  <div style="font:700 10px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.22em;color:${C.soft};">제 ${issue}호 · ${date}</div>
  <div style="font:400 30px/1.3 'Nanum Myeongjo',Batang,serif;color:${C.ink};padding:12px 0 0;">인사 브리핑</div>
  <div style="font:600 17px/1.55 'Noto Sans KR',-apple-system,'Malgun Gothic',sans-serif;color:${C.accent};padding:18px 0 0;">${esc(brief.headline)}</div>
  <div style="font:400 14px/1.8 'Noto Sans KR',-apple-system,'Malgun Gothic',sans-serif;color:${C.soft};padding:10px 0 0;">${esc(brief.lede)}</div>
</td></tr>
<tr><td style="padding:20px 34px 0;">
  <div style="font:400 12px/1.7 'Noto Sans KR',-apple-system,'Malgun Gothic',sans-serif;color:${C.soft};background:${C.paper};border-left:2px solid ${C.rule};padding:12px 14px;">
    지난 브리핑 전체는 <a href="${esc(siteUrl)}" style="color:${C.accent};">아카이브</a>에서 볼 수 있습니다.<br>
    본문은 공개 기사 제목과 링크를 바탕으로 자동 요약한 것입니다. 정확한 내용은 원문을 확인하세요.
  </div>
</td></tr>
<tr><td style="padding:6px 34px 30px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${sections}</table>
</td></tr>
</table></body></html>`;
}

function renderText(brief, { date, issue, siteUrl }) {
  let out = `인사 브리핑 제 ${issue}호 · ${date}\n${brief.headline}\n\n${brief.lede}\n`;
  out += `\n지난 브리핑 전체는 아카이브에서 볼 수 있습니다: ${siteUrl}\n`;
  out += `본문은 공개 기사 제목과 링크를 바탕으로 자동 요약한 것입니다. 정확한 내용은 원문을 확인하세요.\n`;
  let n = 0;
  for (const cat of brief.categories) {
    out += `\n[${cat.name}]\n`;
    for (const it of cat.items) {
      n += 1;
      out += `\n${String(n).padStart(2, '0')}. ${it.title} (${it.source})\n${it.summary}\n`;
      if (it.impact) out += `→ ${it.impact}\n`;
      out += `${it.url}\n`;
    }
  }
  return out;
}

export async function sendEmail(brief, meta) {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const to = (process.env.MAIL_TO || '').split(',').map((s) => s.trim()).filter(Boolean);

  if (!user || !pass || to.length === 0) {
    console.log('메일 설정이 없어 발송을 건너뜁니다.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"인사 브리핑" <${user}>`,
    to: user,
    bcc: to,
    subject: `[인사 브리핑 ${meta.date}] ${brief.headline}`,
    text: renderText(brief, meta),
    html: renderHtml(brief, meta),
  });

  console.log(`메일 발송 완료: ${to.length}명`);
}
