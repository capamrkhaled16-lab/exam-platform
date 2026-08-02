/**
 * Export utilities: CSV (Excel-compatible) download and print-to-PDF.
 */

export function exportToCSV(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
): void {
  const escape = (val: string | number) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
  // Prepend BOM so Excel detects UTF-8 Arabic correctly
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function printDocument(title: string, bodyHTML: string): void {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${title}</title>
  <style>
    * { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; box-sizing: border-box; }
    body { padding: 24px; color: #1a1a1a; }
    h1 { font-size: 20px; text-align: center; margin-bottom: 4px; }
    .subtitle { text-align: center; font-size: 13px; color: #666; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: right; font-size: 13px; }
    th { background: #f0f4f0; font-weight: 700; }
    tr:nth-child(even) { background: #fafafa; }
    .badge-paid { color: #16a34a; font-weight: 700; }
    .badge-due { color: #dc2626; font-weight: 700; }
    .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #999; }
    .blank-cell { height: 32px; }
    @media print { body { padding: 12px; } .no-print { display: none; } }
  </style></head><body>${bodyHTML}
  <div class="footer">منصة الخالد التعليمية — ${new Date().toLocaleDateString('ar-EG')}</div>
  <script>window.onload = function() { window.print(); }</script>
  </body></html>`);
  win.document.close();
}

export function buildAttendancePrintHTML(
  groupName: string,
  stageName: string,
  gradeName: string,
  date: string,
  students: { name: string }[],
  blank: boolean
): string {
  const headers = blank
    ? ['#', 'اسم الطالب', 'الحضور', 'الغياب', 'التأخير', 'ملاحظات']
    : ['#', 'اسم الطالب', 'الحالة', 'الوقت', 'ملاحظات'];
  const headerRow = headers.map((h) => `<th>${h}</th>`).join('');
  const bodyRows = students
    .map(
      (s, i) =>
        `<tr><td>${i + 1}</td><td>${s.name}</td>${
          blank
            ? '<td class="blank-cell"></td><td class="blank-cell"></td><td class="blank-cell"></td><td></td>'
            : '<td></td><td></td><td></td>'
        }</tr>`
    )
    .join('');
  return `
    <h1>${blank ? 'كشف حضور فارغ' : 'سجل الحضور'}</h1>
    <div class="subtitle">${stageName ?? ''} ${gradeName ? '— ' + gradeName : ''} ${groupName ? '— ' + groupName : ''} | ${date}</div>
    <table><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table>
  `;
}

export function buildUnpaidPrintHTML(
  students: { name: string; group_name?: string; group_schedule?: string | null; grade_name?: string; stage_name?: string; total_fees: number; paid_fees: number }[]
): string {
  const remaining = (s: { total_fees: number; paid_fees: number }) =>
    (s.total_fees ?? 0) - (s.paid_fees ?? 0);
  const bodyRows = students
    .map(
      (s, i) =>
        `<tr><td>${i + 1}</td><td>${s.name}</td><td>${s.group_name ?? '-'}</td><td>${s.group_schedule ?? '-'}</td><td>${s.stage_name ?? ''} ${s.grade_name ?? ''}</td><td>${remaining(s)}</td></tr>`
    )
    .join('');
  return `
    <h1>كشف الطلاب غير المسددين</h1>
    <div class="subtitle">إجمالي الطلاب غير المسددين: ${students.length} طالب</div>
    <table><thead><tr><th>#</th><th>اسم الطالب</th><th>المجموعة</th><th>الموعد</th><th>المرحلة</th><th>المتبقي (ج.م)</th></tr></thead><tbody>${bodyRows}</tbody></table>
  `;
}

export async function exportTableAsImage(filename: string, title: string, bodyHTML: string): Promise<void> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.padding = '24px';
  container.style.background = '#ffffff';
  container.style.fontFamily = "'Segoe UI', Tahoma, Arial, sans-serif";
  container.style.direction = 'rtl';
  container.innerHTML = `<div style="text-align:center;margin-bottom:16px;"><h1 style="font-size:20px;color:#1a1a1a;margin:0;">${title}</h1></div><style>table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ccc;padding:8px 10px;text-align:right;font-size:13px;color:#1a1a1a;}th{background:#f0f4f0;font-weight:700;}tr:nth-child(even){background:#fafafa;}.present{color:#16a34a;font-weight:700;}.absent{color:#dc2626;font-weight:700;}.unrecorded{color:#999;}</style>${bodyHTML}`;
  document.body.appendChild(container);
  try {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="${container.offsetHeight}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:800px;padding:24px;background:#fff;font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;">${container.innerHTML}</div></foreignObject></svg>`;
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = container.offsetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(svgUrl);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(svgUrl); alert('تعذر تصدير الصورة. حاول استخدام ملف PDF بدلاً من ذلك.'); };
    img.src = svgUrl;
  } finally {
    document.body.removeChild(container);
  }
}

type AttendanceDayRecord = { date: string; status: string };

export function buildMonthlyAttendanceHTML(
  groupName: string, stageName: string, gradeName: string, monthLabel: string,
  students: { id: string; name: string }[],
  recordsByStudent: Record<string, AttendanceDayRecord[]>,
  consecutiveAbsenceThreshold = 3
): string {
  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const parts = monthLabel.split(' ');
  const monthIdx = months.indexOf(parts[0]);
  const year = parseInt(parts[1] ?? String(new Date().getFullYear()));
  const daysInMonth = monthIdx >= 0 ? new Date(year, monthIdx + 1, 0).getDate() : 30;
  const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => `<th>${i + 1}</th>`).join('');

  function getConsecutiveAbsences(records: AttendanceDayRecord[]): number {
    let max = 0, current = 0;
    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
    for (const r of sorted) { if (r.status === 'absent') { current++; max = Math.max(max, current); } else { current = 0; } }
    return max;
  }

  const rows = students.map((s) => {
    const records = recordsByStudent[s.id] ?? [];
    const recordMap: Record<number, string> = {};
    for (const r of records) { const day = parseInt(r.date.split('-')[2] ?? '0'); if (day > 0) recordMap[day] = r.status; }
    const consecutive = getConsecutiveAbsences(records);
    const warnIcon = consecutive >= consecutiveAbsenceThreshold ? ' ⚠️' : '';
    const cells = Array.from({ length: daysInMonth }, (_, i) => {
      const status = recordMap[i + 1];
      const symbol = status === 'present' ? '<span class="present">✓</span>' : status === 'absent' ? '<span class="absent">✗</span>' : status === 'late' ? '<span style="color:#f59e0b;font-weight:700;">ت</span>' : status === 'excused_absence' ? '<span style="color:#3b82f6;font-weight:700;">ع</span>' : '<span class="unrecorded">—</span>';
      return `<td style="text-align:center;">${symbol}</td>`;
    }).join('');
    return `<tr><td>${s.name}${warnIcon}</td>${cells}</tr>`;
  }).join('');

  return `<h1>تقرير الحضور الشهري — ${groupName}</h1><div class="subtitle">${stageName} ${gradeName} — ${monthLabel}</div><div class="subtitle" style="font-size:11px;color:#666;">✓ حاضر &nbsp; ✗ غائب &nbsp; ت تأخير &nbsp; ع غياب بعذر &nbsp; — غير مسجل &nbsp; ⚠️ إنذار غياب متتالي</div><table style="font-size:10px;"><thead><tr><th>اسم الطالب</th>${dayHeaders}</tr></thead><tbody>${rows}</tbody></table>`;
}
