import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.join(__dirname, '../docs/pr-test-items.xlsx');

const wb = new ExcelJS.Workbook();
wb.creator = 'PRAMS';
wb.created = new Date();

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
  headerBg:   '1e3a5f',
  headerFg:   'e2e8f0',
  accent1Bg:  '0f172a',
  accent1Fg:  '60a5fa',
  subBg:      '1e293b',
  subFg:      'cbd5e1',
  rowOdd:     '0f1929',
  rowEven:    '111827',
  border:     '334155',
  yellow:     'fbbf24',
  green:      '4ade80',
  orange:     'fb923c',
  red:        'f87171',
  purple:     'a78bfa',
};

function sheetHeader(ws, cols) {
  ws.columns = cols;
  const row = ws.getRow(1);
  row.values = cols.map(c => c.header);
  row.font = { bold: true, color: { argb: 'FF' + C.headerFg }, size: 11 };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.headerBg } };
  row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  row.height = 28;
  cols.forEach((_, i) => {
    const cell = row.getCell(i + 1);
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF' + C.border } },
    };
  });
}

function addRow(ws, values, rowIdx, tagColor) {
  const row = ws.addRow(values);
  const bg = rowIdx % 2 === 0 ? C.rowEven : C.rowOdd;
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bg } };
    cell.font = { color: { argb: 'FFe2e8f0' }, size: 10 };
    cell.alignment = { vertical: 'middle', wrapText: true };
    cell.border = {
      bottom: { style: 'hair', color: { argb: 'FF' + C.border } },
    };
  });
  // Colour the "Sourcing Type" cell
  if (tagColor) {
    const stCell = row.getCell(6);
    stCell.font = { bold: true, color: { argb: 'FF' + tagColor }, size: 10 };
  }
  row.height = 22;
  return row;
}

function sectionLabel(ws, label, colCount, color) {
  ws.addRow([]);
  const row = ws.addRow([label]);
  ws.mergeCells(row.number, 1, row.number, colCount);
  const cell = row.getCell(1);
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (color || C.subBg) } };
  cell.font = { bold: true, color: { argb: 'FF' + C.subFg }, size: 11, italic: true };
  cell.alignment = { vertical: 'middle', indent: 1 };
  row.height = 22;
}

// ════════════════════════════════════════════════════════════════════
// SHEET 1 — PR Test Scenarios (summary)
// ════════════════════════════════════════════════════════════════════
const overview = wb.addWorksheet('PR Scenarios', {
  views: [{ state: 'frozen', ySplit: 1 }],
  properties: { tabColor: { argb: 'FF3b82f6' } },
});

sheetHeader(overview, [
  { header: 'PR #', key: 'num',      width: 7  },
  { header: 'PR Title',  key: 'title',    width: 38 },
  { header: 'Department', key: 'dept',    width: 20 },
  { header: 'Project',   key: 'project',  width: 22 },
  { header: 'Priority',  key: 'priority', width: 12 },
  { header: 'Sourcing Mix', key: 'mix',   width: 20 },
  { header: 'Est. Total (PHP)', key: 'total', width: 18 },
  { header: 'Testing Goal', key: 'goal',  width: 42 },
]);

const scenarios = [
  { num: 1,  title: 'Website Redesign — Dev Tools & Licenses',       dept: 'IT',          project: 'Website Redesign 2026', priority: 'high',   mix: 'Online only',         total: '₱ 48,500',   goal: 'Online-only path, skips procurement' },
  { num: 2,  title: 'Office Renovation — Materials & Fixtures',      dept: 'Admin',        project: 'HQ Renovation Q2',      priority: 'medium', mix: 'Procurement only',    total: '₱ 215,000',  goal: 'Full canvass flow (3 supplier quotes)' },
  { num: 3,  title: 'Staff Training — AI Tools & Productivity Suite', dept: 'HR',          project: '',                       priority: 'low',    mix: 'Mixed',               total: '₱ 32,800',   goal: 'Mixed sourcing — both paths in one PR' },
  { num: 4,  title: 'Software Subscriptions — Q2 Renewal',          dept: 'IT',           project: '',                       priority: 'medium', mix: 'Online only',         total: '₱ 91,200',   goal: 'Annual SaaS renewals, no canvass' },
  { num: 5,  title: 'Marketing Event — Booth Materials & Printing',  dept: 'Marketing',    project: 'Q2 Trade Show 2026',     priority: 'high',   mix: 'Procurement only',    total: '₱ 78,000',   goal: 'Event-driven PR with deadline pressure' },
  { num: 6,  title: 'IT Equipment Refresh — Workstations',          dept: 'IT',           project: 'IT Refresh 2026',        priority: 'high',   mix: 'Procurement only',    total: '₱ 380,000',  goal: 'High-value PR — escalates to CEO' },
  { num: 7,  title: 'Office Supplies Restock — Monthly',            dept: 'Admin',        project: '',                       priority: 'low',    mix: 'Online only',         total: '₱ 8,400',    goal: 'Routine low-value PR' },
  { num: 8,  title: 'Accounting Software Upgrade',                  dept: 'Accounting',   project: '',                       priority: 'medium', mix: 'Online only',         total: '₱ 55,000',   goal: 'Dept-specific software request' },
  { num: 9,  title: 'Security Camera System Installation',          dept: 'Admin',        project: 'Facility Security 2026', priority: 'high',   mix: 'Procurement only',    total: '₱ 145,000',  goal: 'Infrastructure / capex procurement' },
  { num: 10, title: 'Team Building Event — Q2',                    dept: 'HR',           project: '',                       priority: 'low',    mix: 'Mixed',               total: '₱ 62,500',   goal: 'Service + supply mixed PR' },
];

scenarios.forEach((s, i) => addRow(overview, Object.values(s), i, null));

// ════════════════════════════════════════════════════════════════════
// SHEET 2 — Line Items (all PRs)
// ════════════════════════════════════════════════════════════════════
const items = wb.addWorksheet('Line Items', {
  views: [{ state: 'frozen', ySplit: 1 }],
  properties: { tabColor: { argb: 'FF818cf8' } },
});

const itemCols = [
  { header: 'PR #',          key: 'pr',          width: 7  },
  { header: 'PR Title',      key: 'prtitle',      width: 30 },
  { header: 'Item Description', key: 'desc',      width: 38 },
  { header: 'Qty',           key: 'qty',          width: 7  },
  { header: 'Unit',          key: 'unit',         width: 10 },
  { header: 'Sourcing Type', key: 'sourcing',     width: 16 },
  { header: 'Est. Unit Price (PHP)', key: 'price', width: 20 },
  { header: 'Est. Total (PHP)', key: 'total',     width: 18 },
  { header: 'Notes / Specs', key: 'notes',        width: 40 },
];

sheetHeader(items, itemCols);

const lineItems = [
  // ── PR 1: Website Redesign — Dev Tools ──────────────────────────
  ['PR1', 'Website Redesign — Dev Tools', 'GitHub Teams — annual subscription (10 seats)', 1, 'license', 'online', 15500, 15500, 'github.com — billed annually'],
  ['PR1', 'Website Redesign — Dev Tools', 'Figma Professional — annual (5 seats)', 1, 'license', 'online', 9000, 9000, 'figma.com — design tool'],
  ['PR1', 'Website Redesign — Dev Tools', 'Vercel Pro — annual (1 team)', 1, 'license', 'online', 8500, 8500, 'vercel.com — hosting & deployment'],
  ['PR1', 'Website Redesign — Dev Tools', 'Sentry Business — annual (1 org)', 1, 'license', 'online', 7500, 7500, 'sentry.io — error monitoring'],
  ['PR1', 'Website Redesign — Dev Tools', 'Postman API Platform — annual (5 seats)', 1, 'license', 'online', 8000, 8000, 'postman.com — API testing'],

  // ── PR 2: Office Renovation ──────────────────────────────────────
  ['PR2', 'Office Renovation — Materials', 'Modular office partition panels (180cm)', 10, 'panel', 'procurement', 8500, 85000, 'Steel frame, frosted glass — specify RAL color'],
  ['PR2', 'Office Renovation — Materials', 'Ergonomic office chairs', 20, 'unit', 'procurement', 4500, 90000, 'Mesh back, lumbar support, adjustable arms'],
  ['PR2', 'Office Renovation — Materials', 'Standing desk (140×70cm)', 5, 'unit', 'procurement', 8000, 40000, 'Motorized height adjustment, white top'],

  // ── PR 3: Staff Training — Mixed ────────────────────────────────
  ['PR3', 'Staff Training — AI Tools & Productivity', 'Claude Pro — annual subscription (5 seats)', 5, 'license', 'online', 2400, 12000, 'claude.ai — AI assistant for staff'],
  ['PR3', 'Staff Training — AI Tools & Productivity', 'Notion Teams — annual (10 seats)', 1, 'license', 'online', 9600, 9600, 'notion.so — docs & project tracking'],
  ['PR3', 'Staff Training — AI Tools & Productivity', 'Training workbooks & printed materials', 30, 'set', 'procurement', 250, 7500, 'Full-colour printed, spiral-bound'],
  ['PR3', 'Staff Training — AI Tools & Productivity', 'Whiteboard markers & flip chart pads', 5, 'set', 'procurement', 340, 1700, 'Assorted colours, 20-sheet pads'],
  ['PR3', 'Staff Training — AI Tools & Productivity', 'USB-C hub (7-in-1) for training room', 2, 'unit', 'online', 1000, 2000, 'HDMI, USB-A ×3, SD, PD passthrough'],

  // ── PR 4: Software Subscriptions ────────────────────────────────
  ['PR4', 'Software Subscriptions — Q2 Renewal', 'Microsoft 365 Business Standard (20 seats)', 20, 'license', 'online', 1800, 36000, 'Annual renewal — expires June 2026'],
  ['PR4', 'Software Subscriptions — Q2 Renewal', 'Slack Pro — annual (20 seats)', 1, 'license', 'online', 14400, 14400, 'slack.com — team messaging'],
  ['PR4', 'Software Subscriptions — Q2 Renewal', 'Zoom Pro — annual (5 hosts)', 5, 'license', 'online', 2760, 13800, 'zoom.us — video conferencing'],
  ['PR4', 'Software Subscriptions — Q2 Renewal', '1Password Teams — annual (20 seats)', 1, 'license', 'online', 6000, 6000, '1password.com — password manager'],
  ['PR4', 'Software Subscriptions — Q2 Renewal', 'Loom Business — annual (10 seats)', 1, 'license', 'online', 21000, 21000, 'loom.com — async video messaging'],

  // ── PR 5: Marketing Event ────────────────────────────────────────
  ['PR5', 'Marketing Event — Booth Materials', 'Pop-up display banner (3×6ft, full colour)', 4, 'unit', 'procurement', 4500, 18000, 'Double-sided, retractable with carry bag'],
  ['PR5', 'Marketing Event — Booth Materials', 'Company brochure printing (A4 tri-fold)', 500, 'piece', 'procurement', 25, 12500, '170gsm art paper, full colour both sides'],
  ['PR5', 'Marketing Event — Booth Materials', 'Branded tote bags with logo', 200, 'piece', 'procurement', 120, 24000, 'Non-woven, 35×40cm, 1-colour screen print'],
  ['PR5', 'Marketing Event — Booth Materials', 'Event table runner with branding', 6, 'unit', 'procurement', 750, 4500, '8ft table size, full dye-sublimation print'],
  ['PR5', 'Marketing Event — Booth Materials', 'Roll-up standee (60×160cm)', 5, 'unit', 'procurement', 2500, 12500, 'Premium aluminium base'],
  ['PR5', 'Marketing Event — Booth Materials', 'Canopy tent (3×3m) with side walls', 1, 'unit', 'procurement', 6500, 6500, 'Waterproof, branded print on canopy'],

  // ── PR 6: IT Equipment Refresh ───────────────────────────────────
  ['PR6', 'IT Equipment Refresh — Workstations', 'Developer workstation (AMD Ryzen 9, 64GB RAM, RTX 4070)', 5, 'unit', 'procurement', 65000, 325000, 'Min spec: 1TB NVMe SSD, Windows 11 Pro'],
  ['PR6', 'IT Equipment Refresh — Workstations', '27" 4K monitor (USB-C, 144Hz)', 10, 'unit', 'procurement', 18000, 180000, 'IPS panel, VESA mount compatible'],
  ['PR6', 'IT Equipment Refresh — Workstations', 'Mechanical keyboard (TKL, wired)', 5, 'unit', 'procurement', 3500, 17500, 'Cherry MX Red or equivalent'],
  ['PR6', 'IT Equipment Refresh — Workstations', 'Ergonomic mouse (wireless)', 5, 'unit', 'procurement', 2800, 14000, 'DPI adjustable, USB receiver'],
  ['PR6', 'IT Equipment Refresh — Workstations', 'UPS 1500VA for workstation protection', 5, 'unit', 'procurement', 8700, 43500, 'AVR + battery backup, min 30min runtime'],

  // ── PR 7: Office Supplies ────────────────────────────────────────
  ['PR7', 'Office Supplies — Monthly Restock', 'A4 bond paper (80gsm)', 20, 'ream', 'online', 220, 4400, 'Preferred brand: Hammermill or Double A'],
  ['PR7', 'Office Supplies — Monthly Restock', 'Ballpen (black, box of 50)', 3, 'box', 'online', 250, 750, 'Pilot G-2 or equivalent'],
  ['PR7', 'Office Supplies — Monthly Restock', 'Stapler + staple wire set', 5, 'set', 'online', 280, 1400, 'Full-strip, 26/6 staples'],
  ['PR7', 'Office Supplies — Monthly Restock', 'Sticky notes (76×76mm, 5-pack)', 10, 'pack', 'online', 95, 950, 'Post-it or equivalent, assorted colours'],
  ['PR7', 'Office Supplies — Monthly Restock', 'Whiteboard eraser', 4, 'unit', 'online', 75, 300, 'Felt, magnetic back'],
  ['PR7', 'Office Supplies — Monthly Restock', 'Folder, long (50pcs/pack)', 4, 'pack', 'online', 150, 600, 'Pressboard, assorted colours'],

  // ── PR 8: Accounting Software ────────────────────────────────────
  ['PR8', 'Accounting Software Upgrade', 'QuickBooks Online Advanced — annual (3 seats)', 1, 'license', 'online', 45000, 45000, 'Includes payroll module — migration from current plan'],
  ['PR8', 'Accounting Software Upgrade', 'DocuSign Business Pro — annual (5 seats)', 1, 'license', 'online', 10000, 10000, 'eSignatures for contracts & vouchers'],

  // ── PR 9: Security Cameras ───────────────────────────────────────
  ['PR9', 'Security Camera System', '5MP IP dome camera (indoor)', 8, 'unit', 'procurement', 4500, 36000, 'PoE, wide angle, IR night vision 30m'],
  ['PR9', 'Security Camera System', '8MP IP bullet camera (outdoor)', 6, 'unit', 'procurement', 7500, 45000, 'Weatherproof IP67, IR 50m, wide dynamic range'],
  ['PR9', 'Security Camera System', '16-channel NVR with 4TB HDD', 1, 'unit', 'procurement', 22000, 22000, 'H.265+, remote viewing app, RAID capable'],
  ['PR9', 'Security Camera System', 'CAT6 cable (305m box)', 2, 'box', 'procurement', 4500, 9000, 'For PoE camera runs'],
  ['PR9', 'Security Camera System', 'Installation labour (per camera point)', 14, 'point', 'procurement', 2000, 28000, 'Includes cable routing, mounting & config'],
  ['PR9', 'Security Camera System', '24-port PoE network switch', 1, 'unit', 'procurement', 5000, 5000, 'Unmanaged, 250W PoE budget'],

  // ── PR 10: Team Building ─────────────────────────────────────────
  ['PR10', 'Team Building Event — Q2', 'Venue rental — half-day function room', 1, 'session', 'procurement', 15000, 15000, 'A/C, projector, sound system included — min 30 pax'],
  ['PR10', 'Team Building Event — Q2', 'Catering — lunch buffet (35 pax)', 35, 'pax', 'procurement', 650, 22750, 'Setup + service charge included'],
  ['PR10', 'Team Building Event — Q2', 'Event facilitator / team building host', 1, 'service', 'procurement', 8000, 8000, 'Half-day, inclusive of materials'],
  ['PR10', 'Team Building Event — Q2', 'Personalised trophy / token for winners', 6, 'unit', 'online', 450, 2700, 'Acrylic plaque, custom engraving'],
  ['PR10', 'Team Building Event — Q2', 'Photo/video documentation (half-day)', 1, 'service', 'procurement', 5000, 5000, 'Edited highlight reel within 3 days'],
  ['PR10', 'Team Building Event — Q2', 'Snack bags for activities', 35, 'bag', 'online', 120, 4200, 'Assorted chips, biscuits, water — packed'],
  ['PR10', 'Team Building Event — Q2', 'Printed activity sheets & scorecards', 40, 'set', 'procurement', 15, 600, 'Full-colour, stapled set of 6 sheets'],
  ['PR10', 'Team Building Event — Q2', 'Name tag holders (reusable)', 40, 'unit', 'online', 25, 1000, 'Lanyard + clear ID sleeve'],
  ['PR10', 'Team Building Event — Q2', 'Portable Bluetooth speaker (rental)', 2, 'unit', 'procurement', 750, 1500, 'JBL Charge 5 or equivalent — full-day'],
  ['PR10', 'Team Building Event — Q2', 'Prizes — gift cards (GCash or Lazada)', 3, 'unit', 'online', 750, 2250, '₱750 each for top 3 team challenge winners'],
];

let rowIdx = 0;
let lastPr = null;
for (const item of lineItems) {
  const prNum = item[0];
  if (prNum !== lastPr) {
    const scenario = scenarios.find(s => `PR${s.num}` === prNum);
    sectionLabel(items, `  ${prNum} — ${scenario?.title ?? ''}`, itemCols.length, '0f1929');
    lastPr = prNum;
  }
  const total = item[6] * item[7]; // qty * unit price
  item[7] = total;
  const color = item[5] === 'online' ? C.green : item[5] === 'procurement' ? C.orange : C.yellow;
  addRow(items, item, rowIdx++, color);
}

// ════════════════════════════════════════════════════════════════════
// SHEET 3 — Quick Reference
// ════════════════════════════════════════════════════════════════════
const ref = wb.addWorksheet('Quick Reference', {
  properties: { tabColor: { argb: 'FF22c55e' } },
});

sheetHeader(ref, [
  { header: 'Field', key: 'field', width: 24 },
  { header: 'Allowed Values / Notes', key: 'values', width: 60 },
]);

const refData = [
  ['Priority', 'low  |  medium  |  high  |  urgent'],
  ['Sourcing Type', 'online — purchased directly online, no canvass required\nprocurement — 3 supplier quotes required from Procurement Officer'],
  ['Unit (examples)', 'unit, piece, set, ream, box, pack, license, pax, service, session, panel, point'],
  ['Departments (examples)', 'IT, Admin, HR, Marketing, Accounting, Operations, Finance'],
  ['Projects (examples)', 'Website Redesign 2026, HQ Renovation Q2, Q2 Trade Show 2026, IT Refresh 2026, Facility Security 2026'],
  ['PR Statuses', 'Draft → Pending Quotation (if procurement) → Quoted → Level 1 Review → Level 2 Review → Level 3 Review → Approved'],
  ['Canvass Rule', 'Procurement items require quotes from at least 3 suppliers. Upload canvass sheets as attachments.'],
  ['Dept Head Rule', 'When a Dept Head submits their own PR it skips Level 1 and goes directly to COO (Level 2).'],
  ['Self-approval', 'Approvers cannot approve PRs they created — enforced server-side.'],
  ['Return vs Reject', 'Returned = sent back for revision (PR stays alive). Rejected = final denial (terminal state).'],
  ['Recall', 'Requester can recall a PR back to Draft from: Level 1, Level 2, Pending Quotation, Returned for Info.'],
  ['Cancel', 'Requester can cancel from: Draft, Pending Quotation, Level 1, Level 2, Returned for Info.'],
];

refData.forEach((row, i) => {
  const r = ref.addRow(row);
  const bg = i % 2 === 0 ? C.rowOdd : C.rowEven;
  r.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bg } };
    cell.font = { color: { argb: 'FFe2e8f0' }, size: 10 };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  r.getCell(1).font = { bold: true, color: { argb: 'FF60a5fa' }, size: 10 };
  r.height = 36;
});

await wb.xlsx.writeFile(OUTPUT);
console.log('Generated:', OUTPUT);
