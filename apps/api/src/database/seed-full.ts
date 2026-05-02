import mongoose, { Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { join } from 'path';
import PDFDocument = require('pdfkit');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');
import { randomUUID } from 'crypto';
const uuidv4 = randomUUID;

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prams';
const UPLOADS_DIR = join(process.cwd(), 'uploads', 'attachments');
const ITEM_PHOTOS_DIR = join(process.cwd(), 'uploads', 'item-photos');
const USER_PHOTOS_DIR = join(process.cwd(), 'uploads', 'user-photos');
const SIGNATURES_DIR = join(process.cwd(), 'uploads', 'signatures');

// Relative paths stored in DB — works in both host dev and Docker container
const REL_ITEM_PHOTOS = 'uploads/item-photos';

// ─── Schemas ──────────────────────────────────────────────

const userSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, default: null },
  isActive: { type: Boolean, default: true },
  refreshToken: { type: String, default: null },
  lastLoginAt: { type: Date, default: null },
  photoUrl: { type: String, default: null },
  signatureUrl: { type: String, default: null },
}, { timestamps: true });

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  headId: { type: mongoose.Schema.Types.ObjectId, default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, default: null },
  description: { type: String, default: null },
  status: { type: String, enum: ['active', 'completed', 'archived'], default: 'active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const lineItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  specifications: { type: String, required: true },
  sourcingType: { type: String, enum: ['procurement', 'online'], default: 'procurement' },
  estimatedPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  notes: { type: String, default: null },
  sellerReferences: { type: [mongoose.Schema.Types.Mixed], default: [] },
  sellerReferencesJustification: { type: String, default: null },
  referencePhotoPath: { type: String, default: null },
  referencePhotoOriginalName: { type: String, default: null },
  quotedUnitPrice: { type: Number, default: null },
  selectedSupplierId: { type: mongoose.Schema.Types.ObjectId, default: null },
  quotedAt: { type: Date, default: null },
});

const prSchema = new mongoose.Schema({
  prNumber: { type: String, unique: true, sparse: true },
  requestType: { type: String, enum: ['purchase_request', 'job_request'], default: 'purchase_request' },
  title: { type: String, required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  description: { type: String, default: '' },
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  status: { type: String, required: true, default: 'draft' },
  sourcingMode: { type: String, enum: ['procurement', 'online'], required: true, default: 'procurement' },
  priority: { type: String, required: true, default: 'medium' },
  items: [lineItemSchema],
  totalAmount: { type: Number, default: 0 },
  currency: { type: String, default: 'PHP' },
  justification: { type: String, required: true },
  neededByDate: { type: Date, default: null },
  attachments: { type: [mongoose.Schema.Types.Mixed], default: [] },
  currentApprovalLevel: { type: Number, default: 0 },
  returnedAtLevel: { type: Number, default: null },
  approvalHistory: [{ type: mongoose.Schema.Types.ObjectId }],
  submittedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', default: null },
  cancellationReason: { type: String, default: null },
  quotationNote: { type: String, default: null },
  canvassEntries: { type: [mongoose.Schema.Types.Mixed], default: [] },
  canvassJustification: { type: String, default: null },
  quotationReturnHistory: { type: [mongoose.Schema.Types.Mixed], default: [] },
  recallHistory: { type: [mongoose.Schema.Types.Mixed], default: [] },
  resubmissionHistory: { type: [mongoose.Schema.Types.Mixed], default: [] },
  clarificationReplies: { type: [mongoose.Schema.Types.Mixed], default: [] },
  quotationSubmissionHistory: { type: [mongoose.Schema.Types.Mixed], default: [] },
  previousSubmissionSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  resubmissionNote: { type: String, default: null },
}, { timestamps: true });

const supplierSchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  address: { type: String, required: true },
  taxType: { type: String, enum: ['vat', 'non_vat'], required: true },
  tin: { type: String, required: true, unique: true },
  contactPerson: { type: String, default: null },
  contactNumber: { type: String, default: null },
  email: { type: String, default: null },
  paymentTerms: { type: String, default: null },
  bankAccountName: { type: String, default: null },
  bankAccountNumber: { type: String, default: null },
  bankName: { type: String, default: null },
  status: { type: String, enum: ['active', 'inactive', 'blacklisted'], default: 'active' },
  notes: { type: String, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const poLineItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  notes: { type: String, default: null },
});

const canvassEntrySchema = new mongoose.Schema({
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  supplierName: { type: String, required: true },
  quotedItems: [{ itemId: mongoose.Schema.Types.ObjectId, description: String, unitPrice: Number, totalPrice: Number, remarks: String }],
  totalQuotedAmount: { type: Number, required: true },
  remarks: { type: String, default: null },
  isSelected: { type: Boolean, default: false },
});

const purchaseOrderSchema = new mongoose.Schema({
  poNumber: { type: String, unique: true, sparse: true },
  purchaseRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseRequest', required: true },
  sourceRequestNumber: { type: String, default: null },
  sourceRequestType: { type: String, enum: ['purchase_request', 'job_request'], required: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  supplierName: { type: String, default: null },
  projectName: { type: String, default: null },
  items: [poLineItemSchema],
  totalAmount: { type: Number, default: 0 },
  currency: { type: String, default: 'PHP' },
  canvassEntries: [canvassEntrySchema],
  status: { type: String, enum: ['pending', 'ordered', 'received', 'cancelled'], default: 'pending' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  estimatedArrivalDate: { type: Date, default: null },
  orderedAt: { type: Date, default: null },
  orderedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  receivedAt: { type: Date, default: null },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  receivingNotes: { type: String, default: null },
  proofPhotos: [{ originalName: String, storagePath: String, mimeType: String, size: Number, uploadedBy: mongoose.Schema.Types.ObjectId, uploadedAt: Date }],
  cancellationReason: { type: String, default: null },
  remarks: { type: String, default: null },
}, { timestamps: true });

const approvalSchema = new mongoose.Schema({
  purchaseRequestId: { type: mongoose.Schema.Types.ObjectId, required: true },
  approverId: { type: mongoose.Schema.Types.ObjectId, required: true },
  approvalLevel: { type: Number, required: true },
  action: { type: String, required: true },
  comments: { type: String, default: '' },
  conditions: { type: String, default: null },
  actionDate: { type: Date, required: true },
}, { timestamps: true });

const notificationSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, required: true },
  purchaseRequestId: { type: mongoose.Schema.Types.ObjectId, default: null },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date, default: null },
}, { timestamps: true });

const prSequenceSchema = new mongoose.Schema({
  year: { type: Number, required: true, unique: true },
  lastNumber: { type: Number, default: 0 },
}, { timestamps: true });

// ─── Helpers ──────────────────────────────────────────────

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(8 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60), 0, 0);
  return d;
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(8 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60), 0, 0);
  return d;
}

function hoursAfter(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function makeItems(items: Array<{
  desc: string;
  qty: number;
  unit: string;
  price: number;
  notes?: string;
  specs: string;
  sourcingType?: 'procurement' | 'online';
}>) {
  return items.map(i => ({
    _id: new Types.ObjectId(),
    description: i.desc,
    quantity: i.qty,
    unit: i.unit,
    specifications: i.specs,
    sourcingType: i.sourcingType || 'procurement',
    estimatedPrice: (i.sourcingType || 'procurement') === 'online' ? i.price : 0,
    totalPrice: (i.sourcingType || 'procurement') === 'online' ? i.qty * i.price : 0,
    _seedPrice: i.price,
    notes: i.notes || null,
    sellerReferences: [],
    sellerReferencesJustification: null,
    referencePhotoPath: null,
    referencePhotoOriginalName: null,
    quotedUnitPrice: null,
    selectedSupplierId: null,
    quotedAt: null,
  }));
}

function totalOf(items: ReturnType<typeof makeItems>) {
  return items.reduce((sum, i) => sum + i.totalPrice, 0);
}

/**
 * Single-mode invariant: every PR is either fully online or fully procurement.
 * If a PR template happened to mix sourcing types, coerce all items to the
 * majority mode (ties go to procurement) and recompute pricing fields so the
 * data is internally consistent.
 */
function normalizeSourcingMode(prDoc: any): void {
  const items = prDoc.items ?? [];
  if (items.length === 0) {
    prDoc.sourcingMode = prDoc.sourcingMode || 'procurement';
    return;
  }
  const counts = items.reduce(
    (acc: { online: number; procurement: number }, i: any) => {
      if (i.sourcingType === 'online') acc.online += 1;
      else acc.procurement += 1;
      return acc;
    },
    { online: 0, procurement: 0 },
  );
  const mode: 'online' | 'procurement' = counts.online > counts.procurement ? 'online' : 'procurement';
  prDoc.sourcingMode = mode;

  for (const item of items) {
    if (item.sourcingType !== mode) {
      item.sourcingType = mode;
      const seedPrice = item._seedPrice ?? 0;
      if (mode === 'online') {
        item.estimatedPrice = seedPrice;
        item.totalPrice = seedPrice * (item.quantity || 0);
      } else {
        item.estimatedPrice = 0;
        item.totalPrice = 0;
      }
    }
  }
  prDoc.totalAmount = items.reduce((sum: number, i: any) => sum + (i.totalPrice || 0), 0);
}

// ─── Attachment PDF Generation ─────────────────────────────

interface SupplierQuoteConfig {
  supplierName: string;
  address: string;
  contact: string;
  tin: string;
  multiplier: number;
  remarks: string;
}

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  if (!fs.existsSync(ITEM_PHOTOS_DIR)) {
    fs.mkdirSync(ITEM_PHOTOS_DIR, { recursive: true });
  }
  if (!fs.existsSync(USER_PHOTOS_DIR)) {
    fs.mkdirSync(USER_PHOTOS_DIR, { recursive: true });
  }
  if (!fs.existsSync(SIGNATURES_DIR)) {
    fs.mkdirSync(SIGNATURES_DIR, { recursive: true });
  }
}

async function generateDummySignature(employeeId: string, firstName: string, lastName: string): Promise<string> {
  const filename = `${employeeId.toLowerCase()}.png`;
  const filePath = join(SIGNATURES_DIR, filename);
  const localUrl = `/uploads/signatures/${filename}`;

  if (fs.existsSync(filePath)) return localUrl;

  // The Alpine container doesn't ship with handwriting fonts and librsvg silently
  // drops <text> nodes whose font-family resolves to nothing. Draw a procedural
  // signature scribble instead — deterministic from the name, font-independent.
  const seedStr = `${firstName} ${lastName}`;
  const seed = seedStr.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  let rngState = seed * 9301 + 49297;
  const rand = () => {
    rngState = (rngState * 9301 + 49297) % 233280;
    return rngState / 233280;
  };

  const W = 480;
  const H = 140;
  const baselineY = 95;
  const inkColor = '#0b1a4a';

  // Build a flowing stroke with letter-shaped loops along a baseline
  let x = 30;
  let path = `M ${x} ${baselineY}`;
  const loops = 7 + Math.floor(rand() * 4); // 7-10 loops
  for (let i = 0; i < loops; i++) {
    const dx = 28 + Math.floor(rand() * 22);
    const peakY = baselineY - 25 - Math.floor(rand() * 25);
    const dipY = baselineY + 6 + Math.floor(rand() * 12);
    const endY = baselineY + (rand() > 0.5 ? -3 : 3);
    path += ` C ${x + dx * 0.3} ${peakY}, ${x + dx * 0.7} ${dipY}, ${x + dx} ${endY}`;
    x += dx;
  }
  // Big trailing flourish (signature tail)
  path += ` Q ${Math.min(x + 35, W - 20)} ${baselineY - 50}, ${Math.min(x + 60, W - 10)} ${baselineY - 5}`;
  // Dot accent
  const dotX = 30 + Math.floor(rand() * (W - 60));
  const dotY = baselineY - 35 - Math.floor(rand() * 10);

  // Initial cap stroke (looks like a leading capital letter swoosh)
  const capStart = `M 30 ${baselineY + 10} C 25 ${baselineY - 30}, 50 ${baselineY - 40}, 60 ${baselineY - 5} L 35 ${baselineY + 8}`;

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="${inkColor}" stroke-linecap="round" stroke-linejoin="round">
      <path d="${capStart}" stroke-width="2.6"/>
      <path d="${path}" stroke-width="2.2"/>
    </g>
    <circle cx="${dotX}" cy="${dotY}" r="1.6" fill="${inkColor}"/>
  </svg>`;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(filePath);

  return localUrl;
}

async function downloadDiceBearAvatar(employeeId: string, firstName: string, lastName: string, role: string): Promise<string> {
  const seed = encodeURIComponent(`${firstName} ${lastName}`);
  const url = `https://api.dicebear.com/9.x/avataaars/png?seed=${seed}&size=128&radius=50&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

  const filename = `${employeeId.toLowerCase()}.png`;
  const filePath = join(USER_PHOTOS_DIR, filename);
  const localUrl = `/uploads/user-photos/${filename}`;

  if (fs.existsSync(filePath)) return localUrl;

  return new Promise((resolve, reject) => {
    const https = require('https');
    const file = fs.createWriteStream(filePath);
    https.get(url, (res: any) => {
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(localUrl); });
    }).on('error', (err: Error) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

function pickProductTheme(description: string): { bg: string; accent: string; badge: string; icon: string; specs: string[] } {
  const d = description.toLowerCase();

  if (d.includes('camera') || d.includes('cctv') || d.includes('dome') || d.includes('ptz') || d.includes('hikvision') || d.includes('dahua')) {
    return {
      bg: '#0f172a', accent: '#3b82f6', badge: 'SURVEILLANCE', icon: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
      specs: ['2MP / 4MP / 8MP options', 'IP66 weatherproof', 'H.265+ compression', 'IR night vision 30m'],
    };
  }
  if (d.includes('cable') || d.includes('fiber') || d.includes('conduit') || d.includes('utp') || d.includes('sfp')) {
    return {
      bg: '#1c1917', accent: '#f59e0b', badge: 'CABLING', icon: 'M6.5 10h-2v5h2v-5zm6 0h-2v5h2v-5zm8.5 7H2v2h19v-2zm-2.5-7h-2v5h2v-5zM11.5 1L2 6v2h19V6l-9.5-5z',
      specs: ['Cat6A / Cat7 / OM3', 'Pure copper conductor', 'LSZH rated jacket', 'Tested to 500MHz'],
    };
  }
  if (d.includes('server') || d.includes('nvr') || d.includes('nas') || d.includes('storage') || d.includes('rack')) {
    return {
      bg: '#0c0a09', accent: '#10b981', badge: 'SERVER / NVR', icon: 'M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z',
      specs: ['Xeon / EPYC processor', 'ECC DDR5 RAM', 'RAID 5/6 support', 'Dual PSU redundancy'],
    };
  }
  if (d.includes('switch') || d.includes('router') || d.includes('firewall') || d.includes('access point') || d.includes('wifi')) {
    return {
      bg: '#0f1729', accent: '#6366f1', badge: 'NETWORKING', icon: 'M15.9 5c-.17-.25-.44-.5-.9-.5s-.73.25-.9.5L7.08 17.5c-.17.25-.17.5 0 .75.17.25.44.5.9.5h8.04c.46 0 .73-.25.9-.5.17-.25.17-.5 0-.75L15.9 5zM12 5a7 7 0 110 14A7 7 0 0112 5z',
      specs: ['PoE+ 802.3at/bt', '10GbE uplink', 'VLAN / QoS support', 'Managed / Layer 3'],
    };
  }
  if (d.includes('ups') || d.includes('power') || d.includes('pdu') || d.includes('battery')) {
    return {
      bg: '#1a1000', accent: '#eab308', badge: 'POWER', icon: 'M7 2v11h3v9l7-12h-4l4-8z',
      specs: ['Online double conversion', '10min runtime at full load', 'Pure sine wave output', 'SNMP card slot'],
    };
  }
  if (d.includes('ppe') || d.includes('helmet') || d.includes('harness') || d.includes('safety') || d.includes('vest') || d.includes('glove')) {
    return {
      bg: '#1a0a00', accent: '#f97316', badge: 'SAFETY / PPE', icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z',
      specs: ['ANSI / OSHA certified', 'High-visibility class 2', 'Impact resistant shell', 'Adjustable fit system'],
    };
  }
  if (d.includes('laptop') || d.includes('workstation') || d.includes('desktop') || d.includes('monitor') || d.includes('computer')) {
    return {
      bg: '#0a0a14', accent: '#8b5cf6', badge: 'COMPUTING', icon: 'M20 18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z',
      specs: ['Intel Core i7 / i9', '32GB DDR5 RAM', '1TB NVMe SSD', 'Windows 11 Pro'],
    };
  }
  if (d.includes('pole') || d.includes('bracket') || d.includes('mount') || d.includes('enclosure') || d.includes('housing')) {
    return {
      bg: '#111827', accent: '#64748b', badge: 'MOUNTING / CIVIL', icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
      specs: ['Galvanized steel', 'Hot-dip zinc coated', 'Rated for 60kg load', 'Pre-drilled mounting holes'],
    };
  }

  return {
    bg: '#0f172a', accent: '#0ea5e9', badge: 'EQUIPMENT', icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z',
    specs: ['Industrial grade', 'CE / UL certified', '2-year warranty', 'Local support available'],
  };
}

async function generateReferencePhoto(filename: string, itemDescription?: string): Promise<{ storagePath: string; originalName: string }> {
  const pngFilename = filename.replace(/\.[^.]+$/, '.png');
  const filepath = join(ITEM_PHOTOS_DIR, pngFilename);
  const desc = itemDescription ?? filename;
  const theme = pickProductTheme(desc);

  const labelLines = desc.length > 32
    ? [desc.slice(0, 32), desc.slice(32, 60) + (desc.length > 60 ? '…' : '')]
    : [desc];

  const specsRows = theme.specs.map((s, i) =>
    `<text x="32" y="${228 + i * 22}" font-size="13" fill="#94a3b8">${s}</text>`,
  ).join('\n    ');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
  <!-- background -->
  <rect width="640" height="400" fill="${theme.bg}"/>

  <!-- top accent bar -->
  <rect width="640" height="6" fill="${theme.accent}"/>

  <!-- product icon area -->
  <rect x="24" y="28" width="120" height="120" rx="12" fill="${theme.accent}22"/>
  <g transform="translate(60, 64) scale(2)" fill="${theme.accent}">
    <path d="${theme.icon}"/>
  </g>

  <!-- badge -->
  <rect x="156" y="28" width="${theme.badge.length * 9 + 20}" height="26" rx="5" fill="${theme.accent}33"/>
  <text x="166" y="46" font-size="12" font-weight="700" fill="${theme.accent}" font-family="monospace" letter-spacing="1">${theme.badge}</text>

  <!-- product name -->
  ${labelLines.map((line, i) => `<text x="156" y="${78 + i * 28}" font-size="${i === 0 ? '20' : '17'}" font-weight="${i === 0 ? '700' : '400'}" fill="#f1f5f9" font-family="sans-serif">${line}</text>`).join('\n  ')}

  <!-- divider -->
  <line x1="24" y1="170" x2="616" y2="170" stroke="${theme.accent}44" stroke-width="1"/>

  <!-- specs header -->
  <text x="32" y="205" font-size="11" font-weight="600" fill="${theme.accent}99" font-family="monospace" letter-spacing="1">TECHNICAL SPECIFICATIONS</text>

  <!-- specs rows -->
  ${specsRows}

  <!-- bottom note -->
  <rect x="0" y="370" width="640" height="30" fill="${theme.accent}11"/>
  <text x="32" y="389" font-size="11" fill="#475569" font-family="sans-serif">Reference image for procurement sourcing — actual product may vary</text>

  <!-- border -->
  <rect x="1" y="1" width="638" height="398" rx="4" fill="none" stroke="${theme.accent}33" stroke-width="1.5"/>
</svg>`;

  await sharp(Buffer.from(svg)).png().toFile(filepath);

  return {
    storagePath: `${REL_ITEM_PHOTOS}/${pngFilename}`,
    originalName: pngFilename,
  };
}

async function generateQuotationPdf(opts: {
  filename: string;
  supplierName: string;
  supplierAddress: string;
  supplierContact: string;
  supplierTin: string;
  prTitle: string;
  projectName: string | null;
  items: Array<{ description: string; quantity: number; unit: string; estimatedPrice: number; totalPrice: number }>;
  totalAmount: number;
  date: Date;
}): Promise<{ storagePath: string; originalName: string; mimeType: string; size: number }> {
  return new Promise((resolve, reject) => {
    const filepath = join(UPLOADS_DIR, opts.filename);
    const doc = new (PDFDocument as any)({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    const fmt = (n: number) =>
      'PHP ' + new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
    const dateStr = opts.date.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    const quotationRef = `QTN-${opts.date.getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

    // ── Supplier Header ──
    doc.fontSize(18).font('Helvetica-Bold').text(opts.supplierName, { align: 'left' });
    doc.fontSize(9).font('Helvetica').fillColor('#555555').text(opts.supplierAddress);
    doc.text(`Contact: ${opts.supplierContact}  |  TIN: ${opts.supplierTin}`);
    doc.fillColor('#000000').moveDown(0.8);

    // Divider
    doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1.5).stroke('#333333');
    doc.moveDown(0.6);

    // ── Document Title ──
    doc.fontSize(14).font('Helvetica-Bold').text('PRICE QUOTATION', { align: 'center' });
    doc.moveDown(0.4);

    // Meta block
    doc.fontSize(9).font('Helvetica');
    doc.text(`Quotation No.: ${quotationRef}`, { align: 'right' });
    doc.text(`Date: ${dateStr}`, { align: 'right' });
    if (opts.projectName) {
      doc.text(`Project: ${opts.projectName}`, { align: 'right' });
    }
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').text('Attention:');
    doc.font('Helvetica').text('Procurement Department');
    doc.text(`Re: ${opts.prTitle}`);
    doc.moveDown(1);

    // ── Items Table Header ──
    doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(0.5).stroke('#aaaaaa');
    const tableTop = doc.y + 4;
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
    doc.rect(50, tableTop - 4, 495, 16).fill('#333333');
    doc.text('ITEM DESCRIPTION', 54, tableTop, { width: 230 });
    doc.text('QTY', 284, tableTop, { width: 40, align: 'center' });
    doc.text('UNIT', 324, tableTop, { width: 50 });
    doc.text('UNIT PRICE', 374, tableTop, { width: 80, align: 'right' });
    doc.text('AMOUNT', 454, tableTop, { width: 87, align: 'right' });
    doc.fillColor('#000000').moveDown(0.2);
    doc.y = tableTop + 16;

    // ── Items ──
    doc.font('Helvetica').fontSize(8);
    let rowBg = false;
    for (const item of opts.items) {
      const rowY = doc.y;
      if (rowBg) {
        doc.rect(50, rowY - 2, 495, 18).fill('#f5f5f5');
        doc.fillColor('#000000');
      }
      doc.text(item.description, 54, rowY, { width: 228 });
      doc.text(item.quantity.toString(), 284, rowY, { width: 40, align: 'center' });
      doc.text(item.unit, 324, rowY, { width: 50 });
      doc.text(fmt(item.estimatedPrice).replace('PHP ', ''), 374, rowY, { width: 80, align: 'right' });
      doc.text(fmt(item.totalPrice).replace('PHP ', ''), 454, rowY, { width: 87, align: 'right' });
      doc.moveDown(0.9);
      rowBg = !rowBg;
    }

    // ── Total ──
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(0.5).stroke('#aaaaaa');
    doc.moveDown(0.4);
    doc.font('Helvetica-Bold').fontSize(10);
    const totalY = doc.y;
    doc.text('TOTAL QUOTED AMOUNT:', 300, totalY, { width: 154 });
    doc.text(fmt(opts.totalAmount), 454, totalY, { width: 87, align: 'right' });
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(8).fillColor('#555555');
    doc.text('(VAT-inclusive)', 454, doc.y, { width: 87, align: 'right' });

    // ── Terms ──
    doc.fillColor('#000000').moveDown(1.5);
    doc.font('Helvetica-Bold').fontSize(9).text('Terms and Conditions:');
    doc.font('Helvetica').fontSize(8).fillColor('#444444');
    doc.text('1. This quotation is valid for thirty (30) days from date of issuance.');
    doc.text('2. All prices are VAT-inclusive unless otherwise stated.');
    doc.text('3. Delivery lead time: 2-4 weeks upon receipt of Purchase Order.');
    doc.text('4. Payment Terms: Net 30 days upon delivery and acceptance.');
    doc.text('5. Warranty: 1 year parts and labor unless otherwise specified.');

    // ── Signature ──
    doc.fillColor('#000000').moveDown(2);
    doc.font('Helvetica').fontSize(9);
    doc.text('Prepared by:', 50, doc.y);
    doc.moveDown(2.5);
    doc.moveTo(50, doc.y).lineTo(220, doc.y).stroke('#333333');
    doc.moveDown(0.2);
    doc.text('Authorized Representative', 50, doc.y);
    doc.text(opts.supplierName, 50, doc.y);

    doc.end();

    stream.on('finish', () => {
      const stats = fs.statSync(filepath);
      resolve({
        storagePath: join(UPLOADS_DIR, opts.filename),
        originalName: opts.filename,
        mimeType: 'application/pdf',
        size: stats.size,
      });
    });
    stream.on('error', reject);
  });
}

// Supplier pools by PR category
const CAMERA_SUPPLIERS: SupplierQuoteConfig[] = [
  { supplierName: 'TechVision Philippines Inc.', address: '12F Cybergate Tower, EDSA, Mandaluyong City', contact: '+63 917 123 4567 | sales@techvision.ph', tin: '123-456-789-000', multiplier: 1.00, remarks: 'Authorized Hikvision distributor, includes 2-year warranty' },
  { supplierName: 'HiSec Distribution Corp.', address: '3F Avida Tower, Alabang, Muntinlupa City', contact: '+63 918 234 5678 | quotes@hisec.ph', tin: '234-567-890-000', multiplier: 1.06, remarks: 'Dahua Technology partner, faster delivery' },
  { supplierName: 'CamWorld Philippines', address: '2F SM Cyberzone, SM Mall of Asia, Pasay City', contact: '+63 919 345 6789 | info@camworld.ph', tin: '345-678-901-000', multiplier: 1.12, remarks: 'Mixed brands available, longer lead time' },
];

const CABLE_SUPPLIERS: SupplierQuoteConfig[] = [
  { supplierName: 'Cabletech Solutions Corp.', address: '789 Shaw Blvd, Mandaluyong City', contact: '+63 920 456 7890 | orders@cabletech.ph', tin: '456-789-012-000', multiplier: 1.00, remarks: 'ISO-certified cables, bulk discount applied' },
  { supplierName: 'NetInfra Philippines', address: '45 Ortigas Ave, Pasig City', contact: '+63 921 567 8901 | sales@netinfra.ph', tin: '567-890-123-000', multiplier: 1.04, remarks: 'Includes free delivery for orders above PHP 50,000' },
  { supplierName: 'WireMax Supply Inc.', address: '100 Quezon Ave, Quezon City', contact: '+63 922 678 9012 | wiring@wiremax.ph', tin: '678-901-234-000', multiplier: 1.09, remarks: 'Smaller company, limited stock for large orders' },
];

const SERVER_SUPPLIERS: SupplierQuoteConfig[] = [
  { supplierName: 'ServerPro Technologies Inc.', address: '8F Rockwell Business Center, Makati City', contact: '+63 923 789 0123 | enterprise@serverpro.ph', tin: '789-012-345-000', multiplier: 1.00, remarks: 'HPE and Dell authorized partner, 3-year support contract' },
  { supplierName: 'DataCenter Philippines Corp.', address: '22F Ayala Ave, Makati City', contact: '+63 924 890 1234 | dc@datacenter.ph', tin: '890-123-456-000', multiplier: 1.05, remarks: 'Lenovo partner, includes rack installation service' },
  { supplierName: 'TechCore Systems PH', address: '5F Bonifacio High Street, BGC, Taguig', contact: '+63 925 901 2345 | quotes@techcore.ph', tin: '901-234-567-000', multiplier: 1.10, remarks: 'Higher quote but offers 24/7 on-site support' },
];

const AI_SUPPLIERS: SupplierQuoteConfig[] = [
  { supplierName: 'AIVision Systems Philippines', address: '30F Cyber Sigma, Mckinley Hill, Taguig', contact: '+63 926 012 3456 | solutions@aivision.ph', tin: '012-345-678-000', multiplier: 1.00, remarks: 'Exclusive AI analytics partner, includes 6-month optimization support' },
  { supplierName: 'SmartAnalytics PH Inc.', address: '15F GT Tower, Ayala Ave, Makati City', contact: '+63 927 123 4560 | info@smartanalytics.ph', tin: '112-345-678-000', multiplier: 1.08, remarks: 'Alternative AI platform, more modules available' },
  { supplierName: 'VisionAI Corporation', address: '7F Estancia Mall Tower, Pasig City', contact: '+63 928 234 5671 | enterprise@visionai.ph', tin: '223-456-789-000', multiplier: 1.14, remarks: 'Newer company but has strong local support team' },
];

const GENERAL_SUPPLIERS: SupplierQuoteConfig[] = [
  { supplierName: 'Office Depot Manila Corp.', address: '456 Makati Ave, Makati City', contact: '+63 929 345 6782 | orders@officedepot.ph', tin: '334-567-890-000', multiplier: 1.00, remarks: 'Bulk pricing available, same-day delivery' },
  { supplierName: 'NBS Philippines', address: '789 Taft Ave, Manila', contact: '+63 930 456 7893 | corporate@nbs.ph', tin: '445-678-901-000', multiplier: 1.05, remarks: 'Wide selection, loyalty program member' },
  { supplierName: 'Shopwise Business Supplies', address: '100 EDSA Cubao, Quezon City', contact: '+63 931 567 8904 | biz@shopwise.ph', tin: '556-789-012-000', multiplier: 1.08, remarks: 'Good for mixed supplies, higher per-unit cost' },
];

const PPE_SUPPLIERS: SupplierQuoteConfig[] = [
  { supplierName: 'SafetyGear Philippines Corp.', address: '55 Commonwealth Ave, Quezon City', contact: '+63 932 678 9015 | safety@safetygear.ph', tin: '667-890-123-000', multiplier: 1.00, remarks: 'DOLE-certified PPE supplier, bulk pricing' },
  { supplierName: 'WorkSafe Solutions Inc.', address: '77 Mindanao Ave, Quezon City', contact: '+63 933 789 0126 | orders@worksafe.ph', tin: '778-901-234-000', multiplier: 1.07, remarks: 'ISO-certified products, includes safety training' },
  { supplierName: 'ProtectPro Philippines', address: '88 Kamuning Rd, Quezon City', contact: '+63 934 890 1237 | protect@protectpro.ph', tin: '889-012-345-000', multiplier: 1.13, remarks: 'Premium brands only, higher price point' },
];

const SERVICE_SUPPLIERS: SupplierQuoteConfig[] = [
  { supplierName: 'TechInstall Services Corp.', address: '20 Boni Ave, Mandaluyong City', contact: '+63 935 901 2348 | projects@techinstall.ph', tin: '990-123-456-000', multiplier: 1.00, remarks: 'CCTV-specialized contractor, 10 years experience' },
  { supplierName: 'NetworkPlus Philippines', address: '33 Scout Area, Quezon City', contact: '+63 936 012 3459 | service@networkplus.ph', tin: '101-234-567-000', multiplier: 1.05, remarks: 'Certified network engineers, flexible scheduling' },
  { supplierName: 'ProInstall Solutions', address: '44 Ortigas Extension, Pasig City', contact: '+63 937 123 4560 | info@proinstall.ph', tin: '202-345-678-000', multiplier: 1.11, remarks: 'Available for urgent mobilization, higher rate' },
];

function pickSuppliers(prTitle: string): SupplierQuoteConfig[] {
  const t = prTitle.toLowerCase();
  if (t.includes('ai') || t.includes('analytic') || t.includes('smart') || t.includes('intelligent')) return AI_SUPPLIERS;
  if (t.includes('server') || t.includes('nvr') || t.includes('storage') || t.includes('gpu') || t.includes('computing')) return SERVER_SUPPLIERS;
  if (t.includes('cable') || t.includes('fiber') || t.includes('conduit') || t.includes('wiring') || t.includes('cabling') || t.includes('switch') || t.includes('poe') || t.includes('patch panel') || t.includes('network')) return CABLE_SUPPLIERS;
  if (t.includes('ppe') || t.includes('safety') || t.includes('protection') || t.includes('gear')) return PPE_SUPPLIERS;
  if (t.includes('survey') || t.includes('install') || t.includes('commissioning') || t.includes('maintenance')) return SERVICE_SUPPLIERS;
  if (t.includes('camera') || t.includes('cctv') || t.includes('dome') || t.includes('ptz') || t.includes('hikvision') || t.includes('dahua')) return CAMERA_SUPPLIERS;
  return GENERAL_SUPPLIERS;
}

function buildRequestTitle(
  items: Array<{ description: string }>,
  requestType: 'purchase_request' | 'job_request' = 'purchase_request',
): string {
  const normalized = items
    .map((item) => item.description.trim())
    .filter(Boolean);

  if (normalized.length === 0) {
    return requestType === 'job_request' ? 'Job Request' : 'Purchase Request';
  }

  const [first, second] = normalized;
  let title = first;

  if (normalized.length > 2) {
    title += ` +${normalized.length - 1} more items`;
  } else if (second) {
    title += ` + ${second}`;
  }

  return title.slice(0, 200);
}

async function attachQuotations(
  prDoc: any,
  uploaderId: Types.ObjectId,
  projectName: string | null,
): Promise<void> {
  const suppliers = pickSuppliers(prDoc.title);
  const attachments = [];

  const canvassEntries = prDoc.canvassEntries ?? [];
  for (let i = 0; i < suppliers.length; i++) {
    const sup = suppliers[i];
    const filename = `${uuidv4()}.pdf`;
    const seedTotal = prDoc.items.reduce((s: number, item: any) => s + (item._seedPrice ?? item.estimatedPrice) * item.quantity, 0);
    const quotedTotal = Math.round(seedTotal * sup.multiplier);
    const result = await generateQuotationPdf({
      filename,
      supplierName: sup.supplierName,
      supplierAddress: sup.address,
      supplierContact: sup.contact,
      supplierTin: sup.tin,
      prTitle: prDoc.title,
      projectName,
      items: prDoc.items.map((item: any) => {
        const basePrice = item._seedPrice ?? item.estimatedPrice;
        return {
          ...item,
          estimatedPrice: Math.round(basePrice * sup.multiplier),
          totalPrice: Math.round(basePrice * item.quantity * sup.multiplier),
        };
      }),
      totalAmount: quotedTotal,
      date: prDoc.createdAt instanceof Date ? prDoc.createdAt : new Date(prDoc.createdAt),
    });
    attachments.push({
      _id: new Types.ObjectId(),
      ...result,
      category: prDoc.items.some((item: any) => item.sourcingType === 'procurement') ? 'canvass' : 'supporting_doc',
      uploadedBy: uploaderId,
      uploadedAt: prDoc.createdAt,
      canvassEntryId: canvassEntries[i]?._id ?? null,
    });
  }

  prDoc.attachments = attachments;
}

function buildCanvassEntries(
  prDoc: any,
  supplierDocs: mongoose.Document[],
): any[] {
  // Only procurement items go through canvass — online items have seller-direct prices.
  const procItems = prDoc.items.filter((i: any) => i.sourcingType === 'procurement');
  if (procItems.length === 0) return [];

  return pickSuppliers(prDoc.title).map((config, index) => {
    const supplier = supplierDocs.find(
      (doc: any) => doc.companyName === config.supplierName,
    );
    const quotedItems = procItems.map((item: any) => {
      const basePrice = item._seedPrice ?? item.estimatedPrice;
      const unitPrice = Math.round(basePrice * config.multiplier);
      return {
        itemId: item._id,
        description: item.description,
        unitPrice,
        totalPrice: item.quantity * unitPrice,
        remarks: index === 0 ? 'Selected quote baseline' : config.remarks,
      };
    });

    return {
      _id: new Types.ObjectId(),
      supplierId: supplier?._id,
      supplierName: config.supplierName,
      quotedItems,
      totalQuotedAmount: quotedItems.reduce(
        (sum: number, item: { totalPrice: number }) => sum + item.totalPrice,
        0,
      ),
      remarks: config.remarks,
      isSelected: index === 0,
    };
  }).filter((entry) => entry.supplierId);
}

function applyQuotedPricingToPr(
  prDoc: any,
  supplierDocs: mongoose.Document[],
  procurementUserId?: Types.ObjectId,
) {
  const canvassEntries = buildCanvassEntries(prDoc, supplierDocs);
  const selected = canvassEntries.find((entry) => entry.isSelected) ?? canvassEntries[0];
  if (!selected) return;

  const quotedAtBase = prDoc.submittedAt
    ? hoursAfter(new Date(prDoc.submittedAt), 2)
    : new Date(prDoc.createdAt);

  prDoc.items = prDoc.items.map((item: any) => {
    if (item.sourcingType !== 'procurement') return item;
    const quotedItem = selected.quotedItems.find(
      (qi: any) => qi.itemId.toString() === item._id.toString(),
    );
    if (!quotedItem) return item;
    return {
      ...item,
      estimatedPrice: quotedItem.unitPrice,
      totalPrice: quotedItem.totalPrice,
      quotedUnitPrice: quotedItem.unitPrice,
      selectedSupplierId: selected.supplierId,
      quotedAt: quotedAtBase,
    };
  });
  prDoc.totalAmount = prDoc.items.reduce(
    (sum: number, item: { totalPrice: number }) => sum + item.totalPrice,
    0,
  );
  prDoc.canvassEntries = canvassEntries;
  prDoc.canvassJustification = null;

  if (procurementUserId) {
    prDoc.quotationSubmissionHistory = [
      ...(prDoc.quotationSubmissionHistory ?? []),
      {
        _id: new Types.ObjectId(),
        submittedBy: procurementUserId,
        submittedAt: quotedAtBase,
      },
    ];
  }
}

async function attachReferencePhotos(prDoc: any): Promise<void> {
  if (!prDoc.items?.length) return;

  // Attach reference photos to physical/hardware items — skip service-only PRs
  const title = String(prDoc.title || '').toLowerCase();
  const isServiceOnly =
    title.includes('survey') && !title.includes('equipment') && !title.includes('camera');

  if (isServiceOnly) return;

  // Attach to up to 3 items per PR — any item that sounds like a physical product
  const physicalKeywords = [
    'camera', 'cable', 'server', 'nvr', 'switch', 'ups', 'pole', 'tool',
    'enclosure', 'ppe', 'bracket', 'harness', 'conduit', 'fiber', 'patch',
    'rack', 'pdu', 'gpu', 'monitor', 'keyboard', 'workstation', 'laptop',
    'headset', 'printer', 'scanner', 'projector', 'screen', 'desk', 'chair',
  ];

  const targets = prDoc.items.filter((item: any) => {
    const desc = String(item.description || '').toLowerCase();
    return physicalKeywords.some((kw) => desc.includes(kw));
  }).slice(0, 3);

  // Fall back to first 2 items if nothing matched keywords
  const photoTargets = targets.length > 0 ? targets : prDoc.items.slice(0, 2);

  for (const item of photoTargets) {
    const filename = `${uuidv4()}.png`;
    const photo = await generateReferencePhoto(filename, item.description);
    item.referencePhotoPath = photo.storagePath;
    item.referencePhotoOriginalName = `reference-${item.description
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}.png`;
  }
}

// ─── Main Seed ────────────────────────────────────────────

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    ensureUploadsDir();
    console.log(`Upload directory: ${UPLOADS_DIR}`);

    const User = mongoose.model('User', userSchema);
    const Department = mongoose.model('Department', departmentSchema);
    const Project = mongoose.model('Project', projectSchema);
    const PurchaseRequest = mongoose.model('PurchaseRequest', prSchema);
    const Approval = mongoose.model('Approval', approvalSchema);
    const Notification = mongoose.model('Notification', notificationSchema);
    const PrSequence = mongoose.model('PrSequence', prSequenceSchema);
    const Supplier = mongoose.model('Supplier', supplierSchema);
    const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);

    // Clear existing data
    console.log('Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Department.deleteMany({}),
      Project.deleteMany({}),
      PurchaseRequest.deleteMany({}),
      Approval.deleteMany({}),
      Notification.deleteMany({}),
      PrSequence.deleteMany({}),
      Supplier.deleteMany({}),
      PurchaseOrder.deleteMany({}),
    ]);

    // Drop the pr-sequence and pr-number-config collections so any stale
    // indexes (e.g. old departmentCode_1_year_1) and stale config fields
    // (prefix, includeYear, includeDepartmentCode) are removed before
    // reseeding. The API recreates the config with current defaults on first read.
    for (const name of ['prsequences', 'prnumberconfigs']) {
      try {
        await mongoose.connection.collection(name).drop();
      } catch (err: any) {
        if (err?.codeName !== 'NamespaceNotFound') throw err;
      }
    }

    // Clear old uploaded files
    if (fs.existsSync(UPLOADS_DIR)) {
      for (const f of fs.readdirSync(UPLOADS_DIR)) {
        fs.unlinkSync(join(UPLOADS_DIR, f));
      }
    }
    const password = await bcrypt.hash('Password@123', 12);
    console.log('All user passwords: Password@123');

    // ─── Departments ───
    console.log('\nCreating departments...');
    const departments = await Department.insertMany([
      { name: 'Engineering & Technical', code: 'ENG', description: 'CCTV design, installation, and technical operations' },
      { name: 'IT & Systems', code: 'ITS', description: 'Network infrastructure, servers, and software management' },
      { name: 'Operations', code: 'OPS', description: 'Project management, logistics, and field coordination' },
      { name: 'Finance & Accounting', code: 'FIN', description: 'Financial planning, budgeting, and accounting' },
      { name: 'Procurement', code: 'PRO', description: 'Purchasing, supplier management, and canvassing' },
      { name: 'Administration', code: 'ADM', description: 'HR, compliance, and office administration' },
    ]);
    const [eng, its, ops, fin, pro, adm] = departments;
    console.log(`  Created ${departments.length} departments`);

    // ─── Users ───
    console.log('\nCreating users...');
    const userDataRaw = [
      // Admin
      { employeeId: 'EMP-0001', email: 'admin@wilsonworksph.com', passwordHash: password, firstName: 'System', lastName: 'Admin', role: 'admin', isActive: true, departmentId: null },

      // C-level
      { employeeId: 'EMP-0002', email: 'ceo@wilsonworksph.com', passwordHash: password, firstName: 'Roberto', lastName: 'Santos', role: 'ceo', isActive: true, departmentId: null },
      { employeeId: 'EMP-0003', email: 'coo@wilsonworksph.com', passwordHash: password, firstName: 'Maria', lastName: 'Reyes', role: 'coo', isActive: true, departmentId: null },

      // Department Heads
      { employeeId: 'EMP-0010', email: 'eng.head@wilsonworksph.com', passwordHash: password, firstName: 'Carlos', lastName: 'Garcia', role: 'dept_head', departmentId: eng._id, isActive: true },
      { employeeId: 'EMP-0011', email: 'its.head@wilsonworksph.com', passwordHash: password, firstName: 'Jerome', lastName: 'Aquino', role: 'dept_head', departmentId: its._id, isActive: true },
      { employeeId: 'EMP-0012', email: 'ops.head@wilsonworksph.com', passwordHash: password, firstName: 'Ricardo', lastName: 'Mendoza', role: 'dept_head', departmentId: ops._id, isActive: true },
      { employeeId: 'EMP-0013', email: 'fin.head@wilsonworksph.com', passwordHash: password, firstName: 'Jose', lastName: 'Tan', role: 'dept_head', departmentId: fin._id, isActive: true },
      { employeeId: 'EMP-0014', email: 'pro.head@wilsonworksph.com', passwordHash: password, firstName: 'Lucia', lastName: 'Flores', role: 'dept_head', departmentId: pro._id, isActive: true },
      { employeeId: 'EMP-0015', email: 'adm.head@wilsonworksph.com', passwordHash: password, firstName: 'Patricia', lastName: 'Lim', role: 'dept_head', departmentId: adm._id, isActive: true },

      // Engineering staff
      { employeeId: 'EMP-0100', email: 'juan.delacruz@wilsonworksph.com', passwordHash: password, firstName: 'Juan', lastName: 'Dela Cruz', role: 'staff', departmentId: eng._id, isActive: true },
      { employeeId: 'EMP-0101', email: 'mark.ramos@wilsonworksph.com', passwordHash: password, firstName: 'Mark', lastName: 'Ramos', role: 'staff', departmentId: eng._id, isActive: true },
      { employeeId: 'EMP-0102', email: 'sarah.villanueva@wilsonworksph.com', passwordHash: password, firstName: 'Sarah', lastName: 'Villanueva', role: 'staff', departmentId: eng._id, isActive: true },
      { employeeId: 'EMP-0103', email: 'kevin.bautista@wilsonworksph.com', passwordHash: password, firstName: 'Kevin', lastName: 'Bautista', role: 'staff', departmentId: eng._id, isActive: true },

      // IT staff
      { employeeId: 'EMP-0110', email: 'diana.fernandez@wilsonworksph.com', passwordHash: password, firstName: 'Diana', lastName: 'Fernandez', role: 'staff', departmentId: its._id, isActive: true },
      { employeeId: 'EMP-0111', email: 'miguel.aquino@wilsonworksph.com', passwordHash: password, firstName: 'Miguel', lastName: 'Aquino', role: 'staff', departmentId: its._id, isActive: true },

      // Operations staff
      { employeeId: 'EMP-0120', email: 'grace.santos@wilsonworksph.com', passwordHash: password, firstName: 'Grace', lastName: 'Santos', role: 'staff', departmentId: ops._id, isActive: true },
      { employeeId: 'EMP-0121', email: 'ryan.lopez@wilsonworksph.com', passwordHash: password, firstName: 'Ryan', lastName: 'Lopez', role: 'staff', departmentId: ops._id, isActive: true },

      // Finance staff
      { employeeId: 'EMP-0130', email: 'christine.navarro@wilsonworksph.com', passwordHash: password, firstName: 'Christine', lastName: 'Navarro', role: 'staff', departmentId: fin._id, isActive: true },

      // Procurement staff
      { employeeId: 'EMP-0140', email: 'paolo.castro@wilsonworksph.com', passwordHash: password, firstName: 'Paolo', lastName: 'Castro', role: 'staff', departmentId: pro._id, isActive: true },
      { employeeId: 'EMP-0141', email: 'nina.dela.rosa@wilsonworksph.com', passwordHash: password, firstName: 'Nina', lastName: 'Dela Rosa', role: 'staff', departmentId: pro._id, isActive: true },

      // Admin staff
      { employeeId: 'EMP-0150', email: 'ramon.aguilar@wilsonworksph.com', passwordHash: password, firstName: 'Ramon', lastName: 'Aguilar', role: 'staff', departmentId: adm._id, isActive: true },
      { employeeId: 'EMP-0151', email: 'isabella.morales@wilsonworksph.com', passwordHash: password, firstName: 'Isabella', lastName: 'Morales', role: 'staff', departmentId: adm._id, isActive: true },

      // Special roles
      { employeeId: 'EMP-0160', email: 'accounting@wilsonworksph.com', passwordHash: password, firstName: 'Maricel', lastName: 'Dimaculangan', role: 'accounting', departmentId: fin._id, isActive: true },
      { employeeId: 'EMP-0170', email: 'procurement@wilsonworksph.com', passwordHash: password, firstName: 'Eduardo', lastName: 'Villanueva', role: 'procurement', departmentId: pro._id, isActive: true },

      // Inactive
      { employeeId: 'EMP-0199', email: 'former.employee@wilsonworksph.com', passwordHash: password, firstName: 'Former', lastName: 'Employee', role: 'staff', departmentId: eng._id, isActive: false },
    ];

    console.log('  Downloading user avatars from DiceBear...');
    const userDataWithPhotos = await Promise.all(
      userDataRaw.map(async (u) => ({
        ...u,
        photoUrl: await downloadDiceBearAvatar(u.employeeId, u.firstName, u.lastName, u.role),
      }))
    );

    console.log('  Generating user signatures...');
    const userDataWithSignatures = await Promise.all(
      userDataWithPhotos.map(async (u) => ({
        ...u,
        signatureUrl: await generateDummySignature(u.employeeId, u.firstName, u.lastName),
      }))
    );

    const users = await User.insertMany(userDataWithSignatures);

    const userMap: Record<string, typeof users[0]> = {};
    for (const u of users) userMap[u.email as string] = u;
    console.log(`  Created ${users.length} users (1 inactive)`);

    await Department.updateOne({ _id: eng._id }, { headId: userMap['eng.head@wilsonworksph.com']._id });
    await Department.updateOne({ _id: its._id }, { headId: userMap['its.head@wilsonworksph.com']._id });
    await Department.updateOne({ _id: ops._id }, { headId: userMap['ops.head@wilsonworksph.com']._id });
    await Department.updateOne({ _id: fin._id }, { headId: userMap['fin.head@wilsonworksph.com']._id });
    await Department.updateOne({ _id: pro._id }, { headId: userMap['pro.head@wilsonworksph.com']._id });
    await Department.updateOne({ _id: adm._id }, { headId: userMap['adm.head@wilsonworksph.com']._id });
    console.log('  Assigned department heads');

    // ─── Purchase Requests Setup ───
    const admin = userMap['admin@wilsonworksph.com'];
    const ceo = userMap['ceo@wilsonworksph.com'];
    const coo = userMap['coo@wilsonworksph.com'];
    const engHead = userMap['eng.head@wilsonworksph.com'];
    const itsHead = userMap['its.head@wilsonworksph.com'];
    const opsHead = userMap['ops.head@wilsonworksph.com'];
    const finHead = userMap['fin.head@wilsonworksph.com'];
    const proHead = userMap['pro.head@wilsonworksph.com'];
    const admHead = userMap['adm.head@wilsonworksph.com'];
    const juan = userMap['juan.delacruz@wilsonworksph.com'];
    const mark = userMap['mark.ramos@wilsonworksph.com'];
    const sarah = userMap['sarah.villanueva@wilsonworksph.com'];
    const kevin = userMap['kevin.bautista@wilsonworksph.com'];
    const diana = userMap['diana.fernandez@wilsonworksph.com'];
    const miguel = userMap['miguel.aquino@wilsonworksph.com'];
    const grace = userMap['grace.santos@wilsonworksph.com'];
    const ryan = userMap['ryan.lopez@wilsonworksph.com'];
    const christine = userMap['christine.navarro@wilsonworksph.com'];
    const paolo = userMap['paolo.castro@wilsonworksph.com'];
    const nina = userMap['nina.dela.rosa@wilsonworksph.com'];
    const ramon = userMap['ramon.aguilar@wilsonworksph.com'];
    const isabella = userMap['isabella.morales@wilsonworksph.com'];
    const procurementUser = userMap['procurement@wilsonworksph.com'];
    const accountingUser = userMap['accounting@wilsonworksph.com'];

    console.log('\nCreating projects...');
    const projects = await Project.insertMany([
      {
        name: 'CCTV Installation – Busway Line 1',
        code: 'BUSWAY-1',
        description: 'Busway CCTV rollout covering station, platform, and command center infrastructure.',
        status: 'active',
        createdBy: admin._id,
      },
      {
        name: 'AI Camera System – Phase 1',
        code: 'AI-PH1',
        description: 'Phase 1 deployment of AI-enabled cameras, edge compute, and analytics.',
        status: 'active',
        createdBy: admin._id,
      },
    ]);
    const projectMap = Object.fromEntries(projects.map((project: any) => [project.name, project]));
    const getProjectId = (projectName?: string) => projectName ? projectMap[projectName]?._id ?? null : null;
    const getProjectName = (projectId?: Types.ObjectId | null) => {
      if (!projectId) return null;
      return projects.find((project: any) => project._id.equals(projectId))?.name ?? null;
    };
    console.log(`  Created ${projects.length} projects`);

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    let seqCounter = 0;

    function nextPrNumber(_deptCode: string, _type: 'purchase_request' | 'job_request' = 'purchase_request'): string {
      seqCounter++;
      const seq = String(seqCounter).padStart(4, '0');
      return `${year}-${month}-${seq}`;
    }

    const allPrs: any[] = [];
    const allApprovals: mongoose.Document[] = [];
    const allNotifications: mongoose.Document[] = [];

    function createApprovedPr(opts: {
      title: string; desc: string; justification: string; priority: string;
      requester: typeof users[0]; dept: typeof departments[0]; deptCode: string;
      deptHead: typeof users[0]; items: ReturnType<typeof makeItems>;
      createdDaysAgo: number; neededInDays: number;
      requestType?: 'purchase_request' | 'job_request'; projectName?: string;
    }) {
      const items = opts.items;
      const total = totalOf(items);
      const created = daysAgo(opts.createdDaysAgo);
      const submitted = hoursAfter(created, 1);
      const l1Date = hoursAfter(submitted, 4 + Math.random() * 20);
      const l2Date = hoursAfter(l1Date, 6 + Math.random() * 24);
      const l3Date = hoursAfter(l2Date, 8 + Math.random() * 48);
      const reqType = opts.requestType || 'purchase_request';
      const prNumber = nextPrNumber(opts.deptCode, reqType);
      const projectId = getProjectId(opts.projectName);

      const prId = new Types.ObjectId();
      const a1Id = new Types.ObjectId();
      const a2Id = new Types.ObjectId();
      const a3Id = new Types.ObjectId();

      allPrs.push({
        _id: prId, prNumber, requestType: reqType, title: opts.title,
        projectId, description: '',
        requesterId: opts.requester._id, departmentId: opts.dept._id,
        status: 'approved', priority: opts.priority, items, totalAmount: total,
        justification: opts.justification,
        neededByDate: new Date(Date.now() + opts.neededInDays * 86400000),
        currentApprovalLevel: 4, approvalHistory: [a1Id, a2Id, a3Id],
        submittedAt: submitted, completedAt: null,
        createdAt: created, updatedAt: l3Date,
        attachments: [],
      });

      allApprovals.push(
        new Approval({ _id: a1Id, purchaseRequestId: prId, approverId: opts.deptHead._id, approvalLevel: 1, action: 'approved', comments: 'Requirements verified and budget confirmed. Approved.', actionDate: l1Date }),
        new Approval({ _id: a2Id, purchaseRequestId: prId, approverId: coo._id, approvalLevel: 2, action: 'approved', comments: 'Budget allocation confirmed. Proceed to procurement.', actionDate: l2Date }),
        new Approval({ _id: a3Id, purchaseRequestId: prId, approverId: ceo._id, approvalLevel: 3, action: 'approved', comments: 'Final approval granted.', actionDate: l3Date }),
      );

      allNotifications.push(
        new Notification({ recipientId: opts.deptHead._id, title: 'New PR for Review', message: `${opts.requester.firstName} submitted ${prNumber}`, type: 'pr_submitted', purchaseRequestId: prId, isRead: true, readAt: l1Date }),
        new Notification({ recipientId: opts.requester._id, title: 'PR Fully Approved', message: `${prNumber} has been fully approved`, type: 'approval_approved', purchaseRequestId: prId, isRead: false }),
      );

      return prId;
    }

    function createPrAtStage(opts: {
      title: string; desc: string; justification: string; priority: string;
      requester: typeof users[0]; dept: typeof departments[0]; deptCode: string;
      deptHead: typeof users[0]; items: ReturnType<typeof makeItems>;
      stage: 'draft' | 'pending_quotation' | 'quoted' | 'level1_review' | 'level2_review' | 'level3_review' | 'rejected' | 'returned' | 'cancelled';
      createdDaysAgo: number; neededInDays: number;
      rejectReason?: string; returnReason?: string; cancelReason?: string;
      // Which approval level returned the PR (1=Dept Head, 2=COO, 3=CEO).
      // Defaults to 1 for backward compatibility.
      returnedAtLevel?: 1 | 2 | 3;
      requestType?: 'purchase_request' | 'job_request'; projectName?: string;
    }) {
      const items = opts.items;
      const total = totalOf(items);
      const created = daysAgo(opts.createdDaysAgo);
      const prId = new Types.ObjectId();
      const isDraft = opts.stage === 'draft';
      const reqType = opts.requestType || 'purchase_request';
      const prNumber = isDraft ? undefined : nextPrNumber(opts.deptCode, reqType);
      const submitted = isDraft ? null : hoursAfter(created, 1);
      const projectId = getProjectId(opts.projectName);

      let status = opts.stage;
      let currentLevel = 0;
      const approvalIds: Types.ObjectId[] = [];

      if (opts.stage === 'level1_review') {
        currentLevel = 1;
        allNotifications.push(
          new Notification({ recipientId: opts.deptHead._id, title: 'New PR for Review', message: `${prNumber} requires your approval`, type: 'pr_needs_action', purchaseRequestId: prId, isRead: false }),
        );
      }

      if (opts.stage === 'level2_review') {
        currentLevel = 2;
        const a1Id = new Types.ObjectId();
        allApprovals.push(
          new Approval({ _id: a1Id, purchaseRequestId: prId, approverId: opts.deptHead._id, approvalLevel: 1, action: 'approved', comments: 'Dept requirements confirmed.', actionDate: hoursAfter(submitted!, 5) }),
        );
        approvalIds.push(a1Id);
        allNotifications.push(
          new Notification({ recipientId: coo._id, title: 'PR Awaiting COO Approval', message: `${prNumber} requires your approval`, type: 'pr_needs_action', purchaseRequestId: prId, isRead: false }),
        );
      }

      if (opts.stage === 'level3_review') {
        currentLevel = 3;
        const a1Id = new Types.ObjectId();
        const a2Id = new Types.ObjectId();
        allApprovals.push(
          new Approval({ _id: a1Id, purchaseRequestId: prId, approverId: opts.deptHead._id, approvalLevel: 1, action: 'approved', comments: 'Approved.', actionDate: hoursAfter(submitted!, 4) }),
          new Approval({ _id: a2Id, purchaseRequestId: prId, approverId: coo._id, approvalLevel: 2, action: 'approved', comments: 'Approved.', actionDate: hoursAfter(submitted!, 16) }),
        );
        approvalIds.push(a1Id, a2Id);
        allNotifications.push(
          new Notification({ recipientId: ceo._id, title: 'PR Awaiting CEO Approval', message: `${prNumber} requires your final approval`, type: 'pr_needs_action', purchaseRequestId: prId, isRead: false }),
        );
      }

      if (opts.stage === 'quoted') {
        currentLevel = 4;
        const l1Date = hoursAfter(submitted!, 4);
        const l2Date = hoursAfter(l1Date, 12);
        const l3Date = hoursAfter(l2Date, 24);
        const a1Id = new Types.ObjectId();
        const a2Id = new Types.ObjectId();
        const a3Id = new Types.ObjectId();
        allApprovals.push(
          new Approval({ _id: a1Id, purchaseRequestId: prId, approverId: opts.deptHead._id, approvalLevel: 1, action: 'approved', comments: 'Approved.', actionDate: l1Date }),
          new Approval({ _id: a2Id, purchaseRequestId: prId, approverId: coo._id, approvalLevel: 2, action: 'approved', comments: 'Approved.', actionDate: l2Date }),
          new Approval({ _id: a3Id, purchaseRequestId: prId, approverId: ceo._id, approvalLevel: 3, action: 'approved', comments: 'Approved. Proceed to procurement.', actionDate: l3Date }),
        );
        approvalIds.push(a1Id, a2Id, a3Id);
        allNotifications.push(
          new Notification({ recipientId: coo._id, title: 'Quotation Price Review', message: `${prNumber} quotation submitted — review pricing`, type: 'pr_needs_action', purchaseRequestId: prId, isRead: false }),
        );
      }

      if (opts.stage === 'rejected') {
        const a1Id = new Types.ObjectId();
        allApprovals.push(new Approval({ _id: a1Id, purchaseRequestId: prId, approverId: opts.deptHead._id, approvalLevel: 1, action: 'rejected', comments: opts.rejectReason || 'Not approved.', actionDate: hoursAfter(submitted!, 8) }));
        approvalIds.push(a1Id);
        allNotifications.push(
          new Notification({ recipientId: opts.requester._id, title: 'PR Rejected', message: `${prNumber} has been rejected`, type: 'approval_rejected', purchaseRequestId: prId, isRead: false }),
        );
      }

      if (opts.stage === 'returned') {
        const returnLvl = opts.returnedAtLevel ?? 1;
        // Build prior approvals: every level below the return level approved
        // first, then the returner returned it.
        const baseDate = hoursAfter(submitted!, 4);
        if (returnLvl >= 2) {
          const aId = new Types.ObjectId();
          allApprovals.push(new Approval({ _id: aId, purchaseRequestId: prId, approverId: opts.deptHead._id, approvalLevel: 1, action: 'approved', comments: 'Approved.', actionDate: baseDate }));
          approvalIds.push(aId);
        }
        if (returnLvl >= 3) {
          const aId = new Types.ObjectId();
          allApprovals.push(new Approval({ _id: aId, purchaseRequestId: prId, approverId: coo._id, approvalLevel: 2, action: 'approved', comments: 'Approved.', actionDate: hoursAfter(baseDate, 12) }));
          approvalIds.push(aId);
        }
        const returnerId = returnLvl === 1 ? opts.deptHead._id : returnLvl === 2 ? coo._id : ceo._id;
        const returnDate = hoursAfter(submitted!, 10 + (returnLvl - 1) * 12);
        const aRet = new Types.ObjectId();
        allApprovals.push(new Approval({ _id: aRet, purchaseRequestId: prId, approverId: returnerId, approvalLevel: returnLvl, action: 'returned', comments: opts.returnReason || 'Please revise and resubmit.', actionDate: returnDate }));
        approvalIds.push(aRet);
        allNotifications.push(
          new Notification({ recipientId: opts.requester._id, title: 'PR Returned for Revision', message: `${prNumber} was returned, please revise`, type: 'approval_returned', purchaseRequestId: prId, isRead: false }),
        );
      }

      if (opts.stage === 'pending_quotation') {
        currentLevel = 4;
        const l1Date = hoursAfter(submitted!, 4);
        const l2Date = hoursAfter(l1Date, 12);
        const l3Date = hoursAfter(l2Date, 24);
        const a1Id = new Types.ObjectId();
        const a2Id = new Types.ObjectId();
        const a3Id = new Types.ObjectId();
        allApprovals.push(
          new Approval({ _id: a1Id, purchaseRequestId: prId, approverId: opts.deptHead._id, approvalLevel: 1, action: 'approved', comments: 'Approved.', actionDate: l1Date }),
          new Approval({ _id: a2Id, purchaseRequestId: prId, approverId: coo._id, approvalLevel: 2, action: 'approved', comments: 'Approved.', actionDate: l2Date }),
          new Approval({ _id: a3Id, purchaseRequestId: prId, approverId: ceo._id, approvalLevel: 3, action: 'approved', comments: 'Approved. Proceed to procurement.', actionDate: l3Date }),
        );
        approvalIds.push(a1Id, a2Id, a3Id);
        allNotifications.push(
          new Notification({ recipientId: procurementUser._id, title: 'PR Awaiting Quotation', message: `${prNumber} requires procurement quotation`, type: 'pr_needs_action', purchaseRequestId: prId, isRead: false }),
        );
      }

      allPrs.push({
        _id: prId, prNumber, requestType: reqType, title: opts.title,
        projectId, description: '',
        requesterId: opts.requester._id, departmentId: opts.dept._id,
        status, priority: opts.priority, items, totalAmount: total,
        justification: opts.justification,
        neededByDate: new Date(Date.now() + opts.neededInDays * 86400000),
        currentApprovalLevel: currentLevel, approvalHistory: approvalIds,
        returnedAtLevel: opts.stage === 'returned' ? (opts.returnedAtLevel ?? 1) : null,
        submittedAt: submitted,
        cancellationReason: opts.stage === 'cancelled' ? (opts.cancelReason || 'No longer needed') : null,
        quotationNote: null,
        quotationReturnHistory: [],
        recallHistory: [],
        clarificationReplies: [],
        previousSubmissionSnapshot: null,
        resubmissionNote: null,
        createdAt: created, updatedAt: created,
        attachments: [],
      });

      return prId;
    }

    // ─── PROJECT 1: CCTV BUSWAY INSTALLATION ────────────────
    console.log('\nCreating purchase requests — Project 1: CCTV Busway...');

    createApprovedPr({
      title: 'IP Dome Cameras – Busway Stations Batch 1',
      desc: 'Hikvision DS-2CD2143G2-I 4MP AcuSense dome cameras for 8 busway stations, 15 units per station.',
      justification: 'Primary cameras required for the CCTV Busway Line 1 project scope. 120 units cover all indoor and platform areas per approved project plan.',
      priority: 'urgent', requester: juan, dept: eng, deptCode: 'ENG', deptHead: engHead,
      createdDaysAgo: 55, neededInDays: -20,
      projectName: 'CCTV Installation – Busway Line 1',
      items: makeItems([
        { desc: 'Hikvision DS-2CD2143G2-I 4MP AcuSense Dome Camera', qty: 120, unit: 'units', price: 8500, specs: '4MP IP dome camera, AcuSense human/vehicle classification, 40m IR range, H.265+, IP67/IK10, 2.8mm fixed lens, 12V DC / PoE', notes: 'Indoor/outdoor, IR 40m, H.265+' },
        { desc: 'Camera Mounting Bracket (Universal Ceiling/Wall)', qty: 120, unit: 'units', price: 350, specs: 'Aluminum-alloy universal ceiling/wall bracket, 1/2"-NPT thread, compatible with standard dome and bullet cameras' },
        { desc: 'Camera Junction Box (Outdoor-rated, IP67)', qty: 60, unit: 'units', price: 480, specs: 'Outdoor IP67-rated camera junction box, fits behind dome/bullet bodies, weather-sealed gasket and gland', notes: 'For outdoor platform cameras' },
      ]),
    });

    createApprovedPr({
      title: 'Cat6 Cabling and Conduit – Busway Phase 1',
      desc: 'Structured cabling installation for camera network backbone across 8 busway stations.',
      justification: 'Network cabling is critical path for camera installation. Approved BOQ from site survey.',
      priority: 'urgent', requester: mark, dept: eng, deptCode: 'ENG', deptHead: engHead,
      createdDaysAgo: 50, neededInDays: -25,
      projectName: 'CCTV Installation – Busway Line 1',
      items: makeItems([
        { desc: 'Cat6 UTP Cable (305m/box, Outdoor-rated)', qty: 40, unit: 'boxes', price: 4800, specs: 'Cat6 UTP, 23AWG solid copper, 4-pair, UV-resistant outdoor jacket, 305m per box, ETL verified' },
        { desc: 'UPVC Conduit Pipe (1", 3m length)', qty: 500, unit: 'pcs', price: 85, specs: 'UPVC electrical conduit, 1" diameter, 3m length, gray, threaded ends, fire-retardant' },
        { desc: 'Metal Conduit (1.5", 3m length, server room)', qty: 80, unit: 'pcs', price: 320, specs: 'Galvanized steel EMT conduit, 1.5" diameter, 3m length, threaded ends — for server room' },
        { desc: 'Cable Tray (100mm x 50mm, 3m)', qty: 60, unit: 'pcs', price: 650, specs: 'Perforated steel cable tray, 100mm x 50mm cross-section, 3m length, hot-dip galvanized' },
        { desc: 'Junction Box Assorted (IP55)', qty: 200, unit: 'pcs', price: 120, specs: 'PVC junction boxes, IP55 rated, assorted sizes (75/100/150mm), screw-on lids with rubber gasket' },
      ]),
    });

    createApprovedPr({
      title: 'NVR Server and Storage – Busway Command Center',
      desc: '64-channel NVR server with RAID storage for centralized recording at the command center.',
      justification: '120 cameras require minimum 64-channel NVR with 30-day retention at 4MP/15fps per project specs.',
      priority: 'urgent', requester: diana, dept: its, deptCode: 'ITS', deptHead: itsHead,
      createdDaysAgo: 48, neededInDays: -18,
      projectName: 'CCTV Installation – Busway Line 1',
      items: makeItems([
        { desc: 'Hikvision DS-96064NI-I16 64-Channel NVR', qty: 2, unit: 'units', price: 185000, specs: '64-channel NVR, 4K (8MP) recording, H.265+, 16 SATA bays, 320 Mbps incoming bandwidth, dual NIC, redundant PSU', notes: '4K resolution, H.265+' },
        { desc: 'Seagate SkyHawk 8TB Surveillance HDD', qty: 16, unit: 'units', price: 14500, specs: 'Seagate SkyHawk 8TB 7200rpm SATA III, 256MB cache, surveillance-rated 24/7 workload, 3-year warranty', notes: 'RAID-6 configuration, 8 drives per NVR' },
        { desc: 'UPS (3kVA, 6-hour backup) for NVR Room', qty: 2, unit: 'units', price: 45000, specs: '3kVA online double-conversion UPS, 6-hour battery backup at 50% load, rack-mount, LCD display, with AVR' },
        { desc: '2U Rack Shelf and Cable Management', qty: 2, unit: 'sets', price: 8500, specs: '2U cantilever rack shelf, vented steel, 19" standard, paired with horizontal cable manager' },
      ]),
    });

    createApprovedPr({
      title: 'PoE Network Switches – Busway Station Infrastructure',
      desc: '24-port PoE+ managed switches for each station to power IP cameras via Cat6.',
      justification: 'Each busway station requires 1 managed PoE switch for 15 cameras. 8 stations + 2 spares.',
      priority: 'high', requester: miguel, dept: its, deptCode: 'ITS', deptHead: itsHead,
      createdDaysAgo: 45, neededInDays: -15,
      projectName: 'CCTV Installation – Busway Line 1',
      items: makeItems([
        { desc: 'Hikvision DS-3E2528P 24-Port PoE+ Managed Switch (370W)', qty: 10, unit: 'units', price: 32000, specs: '24× PoE+ ports (370W budget), 4× SFP uplinks, Layer 2 managed, IEEE 802.3at, web GUI', notes: '8 stations + 2 spares' },
        { desc: 'SFP Fiber Module (1G, Single-mode, LC)', qty: 20, unit: 'units', price: 2800, specs: '1Gbps SFP transceiver, single-mode, LC duplex, 10km reach, 1310nm wavelength', notes: '2 per switch for uplink' },
        { desc: 'Wall-mount Network Enclosure (12U)', qty: 10, unit: 'units', price: 7500, specs: '12U wall-mount network rack, lockable glass front door, 600mm depth, with cooling fans and shelf' },
        { desc: 'Patch Panel 24-Port Cat6 (1U)', qty: 10, unit: 'units', price: 2200, specs: '24-port Cat6 punch-down patch panel, 1U, T568A/B compatible, with cable management bar' },
      ]),
    });

    createApprovedPr({
      title: 'Video Management Software – Busway CCTV',
      desc: 'Hikvision iVMS-5200 Pro VMS license for centralized monitoring of all busway cameras.',
      justification: 'VMS required for 24/7 command center operations. License supports up to 256 cameras with analytics.',
      priority: 'high', requester: sarah, dept: its, deptCode: 'ITS', deptHead: itsHead,
      createdDaysAgo: 40, neededInDays: -10,
      projectName: 'CCTV Installation – Busway Line 1',
      items: makeItems([
        { desc: 'Hikvision iVMS-5200 Pro Base License (64-ch)', qty: 2, unit: 'licenses', price: 95000, specs: 'iVMS-5200 Pro server base license, 64 channels, perpetual, includes recording and live view modules' },
        { desc: 'VMS Additional Channel License (32-ch expansion)', qty: 1, unit: 'license', price: 45000, specs: 'iVMS-5200 Pro 32-channel expansion pack, stacks on top of base license' },
        { desc: 'VMS Client Workstation License (5 concurrent)', qty: 3, unit: 'licenses', price: 18000, specs: 'iVMS-5200 Pro client workstation license, 5 concurrent operator sessions per pack' },
        { desc: 'Annual Software Maintenance & Support', qty: 1, unit: 'year', price: 35000, specs: 'Hikvision software assurance: free updates, hotfixes, 24/7 phone support, 1-year term' },
      ]),
    });

    createApprovedPr({
      title: 'PPE and Safety Equipment – Busway Installation Team',
      desc: 'Personal protective equipment for field installation team working at busway stations.',
      justification: 'DOLE and OSHS compliance requirement. Installation involves working at height and confined spaces.',
      priority: 'high', requester: grace, dept: ops, deptCode: 'OPS', deptHead: opsHead,
      createdDaysAgo: 52, neededInDays: -30,
      projectName: 'CCTV Installation – Busway Line 1',
      items: makeItems([
        { desc: 'Safety Helmet (Class B, ANSI Z89.1)', qty: 15, unit: 'pcs', price: 850, specs: 'Hard hat, Class B (200V dielectric), ANSI Z89.1-2014, 4-point ratchet suspension, white' },
        { desc: 'Full-Body Safety Harness (ANSI Z359)', qty: 10, unit: 'sets', price: 4500, specs: 'Full-body fall-arrest harness, ANSI Z359.11, dorsal D-ring, 2× side D-rings, 5-point adjustment', notes: 'For elevated work on platforms' },
        { desc: 'Safety Boots (Steel Toe, Size 7-11)', qty: 15, unit: 'pairs', price: 2800, specs: 'Leather work boots, ASTM F2413 steel toe, oil/slip-resistant outsole, 6" height, sizes 7-11' },
        { desc: 'Hi-Visibility Safety Vest (ANSI Class 2)', qty: 20, unit: 'pcs', price: 450, specs: 'Reflective safety vest, ANSI/ISEA 107 Class 2, fluorescent yellow, breakaway design, sizes M-XL' },
        { desc: 'Insulated Electrical Gloves (Class 00)', qty: 10, unit: 'pairs', price: 1800, specs: 'Rubber insulating gloves, ASTM D120 Class 00 (500V AC), 11" length, with leather over-protectors' },
        { desc: 'First Aid Kit (Industrial, 50-person)', qty: 3, unit: 'kits', price: 3500, specs: 'ANSI Z308.1-2015 Type III industrial first aid kit, 50-person capacity, wall-mountable metal case' },
      ]),
    });

    createApprovedPr({
      title: 'Service Vehicles – Field Installation Crew',
      desc: 'Two service vans equipped with ladder racks for transporting installation team and equipment to busway sites.',
      justification: 'Current vehicles are insufficient for the busway project scope. Two dedicated service vans needed for daily site mobilization.',
      priority: 'high', requester: ryan, dept: ops, deptCode: 'OPS', deptHead: opsHead,
      createdDaysAgo: 60, neededInDays: -35,
      projectName: 'CCTV Installation – Busway Line 1',
      items: makeItems([
        { desc: 'Toyota Hi-Ace Cargo Van (Manual, White)', qty: 2, unit: 'units', price: 1450000, specs: 'Toyota Hi-Ace Commuter Deluxe 2.8L diesel, 5-speed manual, modified to cargo configuration, white' },
        { desc: 'Vehicle Ladder Rack System', qty: 2, unit: 'sets', price: 18500, specs: 'Galvanized steel roof ladder rack, 3-bar configuration, 200kg load capacity, side-loading rollers' },
        { desc: 'Vehicle Lettering / Vinyl Wrap (Company Branding)', qty: 2, unit: 'units', price: 12000, specs: 'Custom vinyl wrap with company logo and contact info on both sides and rear, 5-year UV-resistant film' },
        { desc: 'Vehicle Insurance (Comprehensive, 1 year)', qty: 2, unit: 'units', price: 28000, specs: 'Comprehensive insurance, 1-year coverage: CTPL, own damage, theft, third-party liability up to PHP 1M' },
      ]),
    });

    // ─── PROJECT 2: AI CAMERA SYSTEM ────────────────────────
    console.log('Creating purchase requests — Project 2: AI Cameras...');

    createApprovedPr({
      title: 'AI Smart Cameras – Phase 1 Batch 1',
      desc: 'Hikvision DS-2CD2T47G2P-LSU/SL 4MP ColorVu AI cameras with deep learning analytics for Phase 1 deployment.',
      justification: 'AI camera deployment Phase 1 covers 40 priority zones. Cameras support people counting, intrusion detection, and behavior analysis.',
      priority: 'urgent', requester: kevin, dept: eng, deptCode: 'ENG', deptHead: engHead,
      createdDaysAgo: 42, neededInDays: -12,
      projectName: 'AI Camera System – Phase 1',
      items: makeItems([
        { desc: 'Hikvision DS-2CD2T47G2P 4MP AI Bullet Camera (ColorVu)', qty: 40, unit: 'units', price: 14500, specs: '4MP ColorVu AI bullet camera, 24/7 full-color, 120m IR + white-light + strobe, deep-learning, IP67/IK10, 4mm fixed lens', notes: 'Deep learning, 120m IR, strobe alarm' },
        { desc: 'Hikvision DS-2DE4425IWG-E 4MP PTZ AI Camera', qty: 8, unit: 'units', price: 52000, specs: '4MP IR network PTZ, 25× optical zoom (4.8-120mm), AI auto-tracking, 100m IR, IP66/IK10, ONVIF', notes: 'For wide-area surveillance zones' },
        { desc: 'Camera Outdoor Housing (SS316, IP68)', qty: 40, unit: 'units', price: 2200, specs: 'SS316 marine-grade stainless outdoor housing, IP68, integrated sun shield and cable gland' },
        { desc: 'Anti-vibration Camera Mount', qty: 48, unit: 'units', price: 1500, specs: 'Spring-damped anti-vibration camera mount, 5kg load capacity, reduces image jitter on outdoor poles' },
      ]),
    });

    createApprovedPr({
      title: 'Edge AI Server with GPU – AI Processing Node',
      desc: 'NVIDIA-powered edge computing server for real-time AI inference at the control center.',
      justification: 'AI video analytics require dedicated GPU processing. On-premise edge server reduces latency vs. cloud processing.',
      priority: 'urgent', requester: diana, dept: its, deptCode: 'ITS', deptHead: itsHead,
      createdDaysAgo: 38, neededInDays: -8,
      projectName: 'AI Camera System – Phase 1',
      items: makeItems([
        { desc: 'Dell PowerEdge R750xa Server (2x Xeon Gold 6326)', qty: 2, unit: 'units', price: 485000, specs: '2U rackmount, 2× Intel Xeon Gold 6326 (16C/32T each), 4× double-wide GPU bays, redundant 2400W PSU, iDRAC9' },
        { desc: 'NVIDIA RTX A4000 16GB GPU', qty: 4, unit: 'units', price: 145000, specs: 'NVIDIA RTX A4000 16GB GDDR6 ECC, 6144 CUDA cores, 140W TDP, single-slot blower design', notes: '2 per server for AI inference' },
        { desc: '64GB DDR4 ECC RAM (per server)', qty: 2, unit: 'sets', price: 48000, specs: '64GB (4×16GB) DDR4-3200 ECC RDIMM kit, registered, dual-rank, server-validated' },
        { desc: '4TB NVMe SSD (OS + AI models)', qty: 4, unit: 'units', price: 28000, specs: '4TB U.2 NVMe SSD, PCIe 4.0, enterprise-grade DWPD ≥ 1, sequential read up to 7000 MB/s' },
      ]),
    });

    createApprovedPr({
      title: 'AI Video Analytics Platform License – 3-Year',
      desc: 'Milestone XProtect Corporate VMS with AI analytics modules for 3-year term license.',
      justification: 'AI Platform required for unified management of 48 AI cameras. Includes People Counting, LPR, Behavior Analytics modules.',
      priority: 'urgent', requester: miguel, dept: its, deptCode: 'ITS', deptHead: itsHead,
      createdDaysAgo: 35, neededInDays: -5,
      projectName: 'AI Camera System – Phase 1',
      items: makeItems([
        { desc: 'Milestone XProtect Corporate Base License (3-year)', qty: 1, unit: 'license', price: 350000, specs: 'Milestone XProtect Corporate, 3-year SLC term, includes failover servers and edge storage support' },
        { desc: 'Milestone AI Module – People Counting (per camera, 3yr)', qty: 48, unit: 'channels', price: 12000, specs: 'Milestone people-counting analytics, per-channel, 3-year SLC, GPU-accelerated' },
        { desc: 'Milestone AI Module – Behavior Analytics (3yr)', qty: 48, unit: 'channels', price: 15000, specs: 'Milestone behavior analytics: intrusion / loitering / crowd, per-channel, 3-year SLC' },
        { desc: 'Milestone LPR Module – License Plate Recognition (3yr)', qty: 8, unit: 'channels', price: 25000, specs: 'Milestone XProtect LPR, ANPR for 50+ countries including PH plates, per-channel, 3-year SLC' },
        { desc: 'Premier Support & Maintenance (3-year)', qty: 1, unit: 'contract', price: 185000, specs: 'Milestone Premier Care: 24/7 support, free version upgrades, on-site response within 4 hours, 3-year term' },
      ]),
    });

    createApprovedPr({
      title: 'Fiber Optic Backbone – AI Camera Network',
      desc: 'Single-mode fiber optic cable and termination for AI camera network backbone.',
      justification: 'AI cameras generate 4K-8MP streams requiring high-bandwidth backbone. Fiber ensures low-latency data transfer to edge servers.',
      priority: 'high', requester: sarah, dept: eng, deptCode: 'ENG', deptHead: engHead,
      createdDaysAgo: 32, neededInDays: -2,
      projectName: 'AI Camera System – Phase 1',
      items: makeItems([
        { desc: 'Corning OS2 Single-Mode Fiber (6-core, 1km/reel)', qty: 8, unit: 'reels', price: 18500, specs: 'Corning OS2 single-mode 9/125µm, 6-core armored loose-tube, 1km per reel, OFNR rated' },
        { desc: 'Fiber Optic Patch Panel 24-Port SC/APC (1U)', qty: 4, unit: 'units', price: 8500, specs: '1U fiber patch panel, 24× SC/APC ports, sliding tray, with splice tray and cable management' },
        { desc: 'SC/APC Fiber Connector (field-terminated)', qty: 200, unit: 'pcs', price: 185, specs: 'SC/APC field-terminable connector, single-mode, ≤0.3 dB insertion loss, anaerobic-cure type' },
        { desc: 'Fiber Fusion Splicing Service (per splice)', qty: 96, unit: 'splices', price: 350, specs: 'Per-splice fusion-splicing service, max loss 0.05 dB, includes signed OTDR test report' },
        { desc: 'OTDR Testing and Fiber Certification', qty: 1, unit: 'lot', price: 35000, specs: 'End-to-end OTDR characterization both directions and wavelengths, signed certification report deliverable' },
      ]),
    });

    // ─── GENERAL OPERATIONS PRs ──────────────────────────────

    createApprovedPr({
      title: 'Office Supplies – Quarterly Procurement Q2',
      desc: 'Quarterly bulk purchase of consumables, printing materials, and stationery for all departments.',
      justification: 'Standard quarterly procurement per approved annual budget allocation.',
      priority: 'low', requester: paolo, dept: pro, deptCode: 'PRO', deptHead: proHead,
      createdDaysAgo: 28, neededInDays: -5,
      items: makeItems([
        { desc: 'A4 Bond Paper (80gsm, 500 sheets/ream)', qty: 80, unit: 'reams', price: 280, specs: 'A4 sub-20 bond paper, 80gsm, white, 500 sheets per ream, sulphate-free pulp' },
        { desc: 'Ballpoint Pens Assorted (box of 50)', qty: 8, unit: 'boxes', price: 450, specs: 'Medium-tip ballpoint pens, 1.0mm, mix of blue/black/red ink, smooth-flow, 50 pens per box' },
        { desc: 'Printer Ink Cartridges (HP 664 Black+Color set)', qty: 10, unit: 'sets', price: 1200, specs: 'HP 664 OEM ink cartridges, set = 1× black + 1× tri-color, for HP DeskJet/Ink Advantage 1115/2135/3835' },
        { desc: 'Filing Folders, Binders, and Labels (assorted)', qty: 1, unit: 'lot', price: 6800, specs: 'A4 manila folders (50), 2-ring binders (20), and adhesive labels (10 sheets) — assorted colors and sizes' },
        { desc: 'Sticky Notes, Markers, and Whiteboard Supplies', qty: 1, unit: 'lot', price: 3500, specs: 'Post-it pads (3×3 and 4×6), whiteboard markers (12 assorted), erasers, and cleaning solution' },
      ]),
    });

    createApprovedPr({
      title: 'Laptops – Engineering Field Team',
      desc: 'Rugged laptops for field engineers to access VMS, run camera configuration tools, and manage site documentation on-site.',
      justification: 'Field engineers currently share office laptops, causing delays in site configuration and testing.',
      priority: 'high', requester: juan, dept: eng, deptCode: 'ENG', deptHead: engHead,
      createdDaysAgo: 22, neededInDays: 5,
      items: makeItems([
        { desc: 'Lenovo ThinkPad X1 Carbon (i7, 32GB RAM, 512GB SSD)', qty: 5, unit: 'units', price: 92000, specs: 'ThinkPad X1 Carbon Gen 11, Intel i7-1365U vPro, 32GB LPDDR5, 512GB NVMe SSD, 14" 2.8K OLED, Win 11 Pro' },
        { desc: 'USB-C Multiport Hub (HDMI, LAN, USB 3.0)', qty: 5, unit: 'units', price: 2800, specs: 'USB-C 8-in-1 hub: HDMI 4K, RJ45 GbE, 3× USB 3.0, SD/microSD reader, 100W PD pass-through' },
        { desc: 'Laptop Bag (Anti-shock, 15")', qty: 5, unit: 'units', price: 1800, specs: '15.6" laptop messenger bag, padded shock-absorbing main compartment, water-resistant nylon, multiple pockets' },
        { desc: 'Microsoft 365 Business Standard License (1yr)', qty: 5, unit: 'licenses', price: 6500, specs: 'M365 Business Standard, 1-year per-user license — Outlook, Word, Excel, PPT, Teams, OneDrive 1TB' },
      ]),
    });

    // Software subscriptions (online-sourced)
    createApprovedPr({
      title: 'Microsoft 365 Business Standard – Annual Renewal',
      desc: 'Annual renewal of Microsoft 365 Business Standard licenses for all company employees.',
      justification: 'Mission-critical productivity suite — covers email, Teams, SharePoint, and Office apps for 30 employees. Renewal avoids service interruption.',
      priority: 'high', requester: diana, dept: its, deptCode: 'ITS', deptHead: itsHead,
      createdDaysAgo: 18, neededInDays: -3,
      items: makeItems([
        { desc: 'Microsoft 365 Business Standard License (annual, per user)', qty: 30, unit: 'licenses', price: 7200, sourcingType: 'online', specs: 'M365 Business Standard, annual per-user — Office desktop apps, Exchange Online, Teams, OneDrive 1TB', notes: 'Purchased via Microsoft Admin Portal' },
        { desc: 'Microsoft 365 Business Premium License – IT Admins (annual)', qty: 3, unit: 'licenses', price: 12600, sourcingType: 'online', specs: 'M365 Business Premium, annual per-user — adds Intune device management, Azure AD P1, Defender for Business', notes: 'Includes Intune and Azure AD P1' },
      ]),
    });

    createApprovedPr({
      title: 'Adobe Creative Cloud Team – Annual Subscription',
      desc: 'Adobe Creative Cloud team licenses for the marketing and documentation teams.',
      justification: 'Required for producing project proposals, client presentations, site documentation photography editing, and marketing materials.',
      priority: 'medium', requester: ramon, dept: adm, deptCode: 'ADM', deptHead: admHead,
      createdDaysAgo: 20, neededInDays: -8,
      items: makeItems([
        { desc: 'Adobe Creative Cloud All Apps – Team License (annual)', qty: 5, unit: 'licenses', price: 32000, sourcingType: 'online', specs: 'Adobe CC All Apps Team, annual per-seat — 20+ apps including Photoshop, Illustrator, Premiere Pro, 100GB cloud storage', notes: 'Direct from Adobe, includes Photoshop, Illustrator, Premiere Pro' },
      ]),
    });

    createApprovedPr({
      title: 'Kaspersky Endpoint Security – 30 Seats Annual',
      desc: 'Enterprise antivirus and endpoint protection for all company workstations and laptops.',
      justification: 'Cybersecurity compliance requirement. Current license expires next month. Covers all 30 endpoints with centralized management console.',
      priority: 'high', requester: miguel, dept: its, deptCode: 'ITS', deptHead: itsHead,
      createdDaysAgo: 15, neededInDays: 2,
      items: makeItems([
        { desc: 'Kaspersky Endpoint Security for Business Select – 30 nodes (1 year)', qty: 1, unit: 'license', price: 48000, sourcingType: 'online', specs: 'Kaspersky Endpoint Security Select, 30 endpoints, 1-year subscription — anti-malware, firewall, application/device control' },
        { desc: 'Kaspersky Security Center Cloud Console', qty: 1, unit: 'license', price: 12000, sourcingType: 'online', specs: 'Kaspersky Security Center Cloud Console, 1-year subscription, browser-based central management' },
      ]),
    });

    // Office and operational items
    createApprovedPr({
      title: 'Office Pantry Supplies – Monthly Q2',
      desc: 'Monthly pantry and breakroom supplies for all office staff.',
      justification: 'Standard monthly pantry allocation per employee welfare policy. Covers coffee, water, and basic snacks for 30 employees.',
      priority: 'low', requester: isabella, dept: adm, deptCode: 'ADM', deptHead: admHead,
      createdDaysAgo: 10, neededInDays: -2,
      items: makeItems([
        { desc: 'Coffee Beans – Arabica Blend (1kg bags)', qty: 8, unit: 'bags', price: 850, sourcingType: 'online', specs: '100% Arabica medium-roast coffee beans, 1kg vacuum-sealed bag, recently roasted' },
        { desc: 'Bottled Water – 5-gallon refill', qty: 20, unit: 'gallons', price: 55, sourcingType: 'online', specs: '5-gallon (18.9L) refill of purified drinking water, sealed cap, fits standard office dispensers' },
        { desc: 'Assorted Snacks and Biscuits (weekly packs)', qty: 4, unit: 'packs', price: 2500, sourcingType: 'online', specs: 'Weekly snack pack: cookies, crackers, chips, chocolates — single-serving sachets, ~30 pieces per pack' },
        { desc: 'Disposable Cups, Stirrers, Sugar, Creamer', qty: 1, unit: 'lot', price: 1800, sourcingType: 'online', specs: 'Mixed pack: 6oz paper cups (200), wooden stirrers (200), sachets of refined sugar (200) and non-dairy creamer (200)' },
      ]),
    });

    createApprovedPr({
      title: 'Internet Leased Line – Annual Service Fee',
      desc: 'Annual dedicated internet leased line service fee for the main office.',
      justification: 'Dedicated 100Mbps symmetric leased line is the primary internet backbone for VMS remote access, cloud backups, and daily operations.',
      priority: 'high', requester: diana, dept: its, deptCode: 'ITS', deptHead: itsHead,
      createdDaysAgo: 25, neededInDays: -10,
      items: makeItems([
        { desc: 'PLDT Enterprise Leased Line 100Mbps Symmetric (annual)', qty: 1, unit: 'year', price: 360000, sourcingType: 'online', specs: 'PLDT Enterprise Dedicated Internet Access, 100 Mbps symmetric, SLA 99.7%, 24/7 NOC, 1 static IP included', notes: 'Direct billing from PLDT Enterprise' },
        { desc: 'Static IP Block (/29, 5 usable IPs)', qty: 1, unit: 'year', price: 24000, sourcingType: 'online', specs: 'IPv4 /29 block (8 addresses, 5 usable), routed via PLDT leased line, BGP not included' },
      ]),
    });

    // ─── IN-PROGRESS PRs ─────────────────────────────────────

    // Pending quotation – procurement needs to source pricing first
    createPrAtStage({
      title: 'PTZ Speed Dome Cameras – Busway Intersections',
      desc: 'Hikvision DS-2DE4425IWG-E 4MP PTZ cameras for monitoring major busway intersection points.',
      justification: 'Site survey identified 6 critical intersection points requiring PTZ coverage. Included in Phase 2 scope.',
      priority: 'high', requester: mark, dept: eng, deptCode: 'ENG', deptHead: engHead,
      createdDaysAgo: 3, neededInDays: 25,
      stage: 'pending_quotation',
      projectName: 'CCTV Installation – Busway Line 1',
      items: makeItems([
        { desc: 'Hikvision DS-2DE4425IWG-E 4MP PTZ Camera (25x zoom)', qty: 6, unit: 'units', price: 48000, specs: '4MP IR network PTZ, 25× optical zoom (4.8-120mm), AcuSense human/vehicle detection, 100m IR, IP66/IK10' },
        { desc: 'Heavy-Duty PTZ Wall Mount (Stainless Steel)', qty: 6, unit: 'units', price: 8500, specs: 'SS304 stainless wall bracket for PTZ camera, 30kg load capacity, integrated cable management' },
        { desc: 'RS-485 Control Cable (300m, shielded)', qty: 2, unit: 'rolls', price: 5500, specs: 'RS-485 multicore control cable, 2-pair 22AWG, foil-shielded, PVC outer jacket, 300m roll' },
      ]),
    });

    // Pending quotation – procurement needs to source pricing first
    createPrAtStage({
      title: 'Camera Mounting Poles and Hardware – Busway Phase 2',
      desc: 'Galvanized steel mounting poles and hardware for external camera installations on Phase 2 busway stations.',
      justification: 'Phase 2 stations require outdoor pole mounting for perimeter cameras. Approved scope from project engineer.',
      priority: 'medium', requester: grace, dept: ops, deptCode: 'OPS', deptHead: opsHead,
      createdDaysAgo: 2, neededInDays: 20,
      stage: 'pending_quotation',
      projectName: 'CCTV Installation – Busway Line 1',
      items: makeItems([
        { desc: 'Galvanized Pole (4-meter, 3" diameter, with base plate)', qty: 24, unit: 'units', price: 4500, specs: '4m hot-dip galvanized steel pole, 3" diameter, 3mm wall, with welded 300×300mm base plate' },
        { desc: 'Camera Arm Bracket (2-meter extension)', qty: 24, unit: 'units', price: 1800, specs: '2-meter cantilever arm bracket, galvanized steel, mounts to pole top, end-cap for camera bracket' },
        { desc: 'Anchor Bolts Set (M16, per pole)', qty: 24, unit: 'sets', price: 380, specs: 'M16×300mm anchor bolt set with washers and nuts, hot-dip galvanized, for fastening base plates to concrete pads' },
        { desc: 'Galvanizing Paint Touch-up (spray)', qty: 10, unit: 'cans', price: 250, specs: 'Cold-galvanizing zinc-rich aerosol spray, 400ml can, for repairing scratches and weld points on poles' },
      ]),
    });

    // Pending quotation – procurement needs to source pricing first
    createPrAtStage({
      title: 'Network Video Recorder – AI Backup Recording',
      desc: 'Redundant NVR for backup recording of AI camera system to ensure 30-day retention compliance.',
      justification: 'Project specs require redundant recording. Primary edge servers do not provide sufficient storage redundancy.',
      priority: 'high', requester: diana, dept: its, deptCode: 'ITS', deptHead: itsHead,
      createdDaysAgo: 4, neededInDays: 18,
      stage: 'pending_quotation',
      projectName: 'AI Camera System – Phase 1',
      items: makeItems([
        { desc: 'Hikvision DS-96128NI-I24 128-Channel NVR', qty: 1, unit: 'unit', price: 345000, specs: '128-channel NVR, 4K (8MP), H.265+, 24 SATA bays, RAID 0/1/5/6/10, dual 10G NIC, redundant PSU' },
        { desc: 'Seagate SkyHawk AI 10TB HDD (Surveillance)', qty: 12, unit: 'units', price: 18500, specs: 'Seagate SkyHawk AI 10TB 7200rpm SATA III, dedicated to AI surveillance workloads, MTBF 2M hours' },
        { desc: '2U Rackmount Server Case with Rails', qty: 1, unit: 'unit', price: 12000, specs: '2U rackmount chassis, 19" standard, with sliding rails kit and 24-bay backplane' },
      ]),
    });

    // At department head review (Level 1) — freshly submitted
    createPrAtStage({
      title: 'Ergonomic Office Chairs – Engineering Team',
      desc: 'Ergonomic mesh office chairs to replace aging chairs for the engineering department.',
      justification: 'Current chairs are 5+ years old with broken armrests and no lumbar support. Engineers spend 8+ hours at their desks daily. Replacement needed for productivity and employee health.',
      priority: 'medium', requester: sarah, dept: eng, deptCode: 'ENG', deptHead: engHead,
      createdDaysAgo: 1, neededInDays: 21,
      stage: 'level1_review',
      items: makeItems([
        { desc: 'Sihoo M57 Ergonomic Mesh Office Chair (with headrest)', qty: 8, unit: 'units', price: 12500, specs: 'Sihoo M57, full mesh back, adjustable lumbar + headrest, 4D armrests, BIFMA-rated 150kg, black' },
        { desc: 'Chair Floor Mat (120cm x 90cm, for tiled floor)', qty: 8, unit: 'pcs', price: 1200, specs: 'Polycarbonate office chair mat, 120×90 cm, smooth-bottom profile for tiled / hard floors, transparent' },
      ]),
    });

    // At department head review (Level 1) — subscription PR
    createPrAtStage({
      title: 'Canva Teams – Annual Subscription',
      desc: 'Canva Teams subscription for creating professional presentations and social media content.',
      justification: 'Admin and Operations teams frequently create client-facing materials. Canva Teams provides brand kit, templates, and collaboration features.',
      priority: 'low', requester: isabella, dept: adm, deptCode: 'ADM', deptHead: admHead,
      createdDaysAgo: 0, neededInDays: 30,
      stage: 'level1_review',
      items: makeItems([
        { desc: 'Canva Teams Plan – 10 seats (annual)', qty: 1, unit: 'subscription', price: 45000, sourcingType: 'online', specs: 'Canva Teams Annual, 10 seats — brand kit, premium templates, one-click resize, 1TB cloud storage', notes: 'Billed annually via canva.com' },
      ]),
    });

    // At COO review (Level 2)
    createPrAtStage({
      title: 'AI Camera Outdoor Enclosures – Phase 1',
      desc: 'Stainless steel outdoor enclosures with thermostat and blower for AI cameras in harsh environments.',
      justification: 'Outdoor AI cameras require climate-controlled enclosures to operate within thermal limits in direct sunlight.',
      priority: 'medium', requester: kevin, dept: eng, deptCode: 'ENG', deptHead: engHead,
      createdDaysAgo: 6, neededInDays: 22,
      stage: 'level2_review',
      projectName: 'AI Camera System – Phase 1',
      items: makeItems([
        { desc: 'Stainless Outdoor Camera Enclosure (SS316, IP66, with heater/blower)', qty: 24, unit: 'units', price: 8500, specs: 'SS316 outdoor camera enclosure, IP66, integrated 50W heater + 12V blower, sun shield, cable gland, lockable' },
        { desc: 'Pole Side Mount Adapter Kit', qty: 24, unit: 'sets', price: 1200, specs: 'Side-mount adapter for pole-mounting camera enclosures, fits 60-120mm OD poles, with stainless U-bolts' },
        { desc: 'Security Padlock (Weather-resistant, Keyed Alike)', qty: 24, unit: 'units', price: 480, specs: 'Master Lock 6121, weather-resistant body, keyed-alike for fleet management, 51mm hardened steel shackle' },
      ]),
    });

    // At CEO review (Level 3) — high value
    createPrAtStage({
      title: 'AI Control Room Workstations and Video Wall',
      desc: '4K multi-display command workstations and video wall controller for the AI Camera System control room.',
      justification: 'Control room operators need to monitor 48 AI camera feeds simultaneously. Video wall and dedicated workstations are mandatory deliverable per contract.',
      priority: 'urgent', requester: miguel, dept: its, deptCode: 'ITS', deptHead: itsHead,
      createdDaysAgo: 9, neededInDays: 15,
      stage: 'level3_review',
      projectName: 'AI Camera System – Phase 1',
      items: makeItems([
        { desc: 'Dell OptiPlex 7010 Workstation (i9, 64GB, 1TB NVMe)', qty: 3, unit: 'units', price: 95000, specs: 'Dell OptiPlex 7010 SFF, i9-13900, 64GB DDR5, 1TB Gen4 NVMe SSD, RTX A2000 6GB, Win 11 Pro', notes: 'VMS operator workstations' },
        { desc: 'Samsung 55" 4K Commercial Display (UD55F-B)', qty: 6, unit: 'units', price: 85000, specs: 'Samsung UD55F-B, 55" 4K UHD, 700cd/m² brightness, 24/7 operation rated, 1.7mm bezel-to-bezel', notes: 'For 2x3 video wall' },
        { desc: 'Datapath FX4 Video Wall Controller', qty: 1, unit: 'unit', price: 320000, specs: 'Datapath FX4 4K video wall controller, 1× HDMI/DP input, 4× HDMI outputs, supports 2×2 to 4×1 layouts' },
        { desc: 'Video Wall Mounting Structure (2x3 bezel-free)', qty: 1, unit: 'set', price: 145000, specs: '2×3 video wall floor-standing mount, micro-adjustable per panel, integrated cable management and service access' },
        { desc: 'Control Room Console Desk (curved, 3 positions)', qty: 1, unit: 'unit', price: 185000, specs: 'Curved control room console, 3 operator positions, electric sit-stand height, integrated cable trays + monitor arms' },
      ]),
    });

    // Quoted — procurement finished canvassing, COO reviewing price
    createPrAtStage({
      title: 'PoE Switches and Patch Panels – Busway Phase 2',
      desc: 'Network switches and patch panels for 6 additional Phase 2 busway stations.',
      justification: 'Phase 2 expansion requires dedicated network infrastructure at 6 new stations. Equipment specs match Phase 1 standards for compatibility.',
      priority: 'high', requester: mark, dept: eng, deptCode: 'ENG', deptHead: engHead,
      createdDaysAgo: 14, neededInDays: 10,
      stage: 'quoted',
      projectName: 'CCTV Installation – Busway Line 1',
      items: makeItems([
        { desc: 'Hikvision DS-3E2528P 24-Port PoE+ Managed Switch (370W)', qty: 6, unit: 'units', price: 32000, specs: '24× PoE+ ports (370W budget), 4× SFP uplinks, Layer 2 managed, IEEE 802.3at, web GUI' },
        { desc: 'Patch Panel 24-Port Cat6 (1U)', qty: 6, unit: 'units', price: 2200, specs: '24-port Cat6 punch-down patch panel, 1U, with cable management bar' },
        { desc: 'Network Enclosure 12U Wall-mount', qty: 6, unit: 'units', price: 7500, specs: '12U wall-mount network enclosure, lockable glass door, 600mm depth, integrated cooling fans' },
        { desc: 'Fiber SFP Module 1G Single-mode', qty: 12, unit: 'units', price: 2800, specs: '1Gbps SFP transceiver, single-mode LC duplex, 10km reach, 1310nm wavelength' },
      ]),
    });

    // Quoted — AI project, COO reviewing supplier selection
    createPrAtStage({
      title: 'AI Analytics Training and Certification – Team of 4',
      desc: 'Professional certification training for AI video analytics configuration and optimization.',
      justification: 'AI camera system Phase 1 deployment requires certified engineers for system tuning. Manufacturer requires certified operators for warranty compliance.',
      priority: 'medium', requester: kevin, dept: eng, deptCode: 'ENG', deptHead: engHead,
      createdDaysAgo: 10, neededInDays: 20,
      stage: 'quoted',
      projectName: 'AI Camera System – Phase 1',
      items: makeItems([
        { desc: 'Hikvision HCP Certification Training (4 participants)', qty: 4, unit: 'persons', price: 18000, specs: 'Hikvision Certified Professional (HCP) classroom training, 5 days, conducted by an authorized HK trainer' },
        { desc: 'Training Materials and Lab Access (per person)', qty: 4, unit: 'sets', price: 5000, specs: 'HCP training book, USB lab kit, online lab portal access for 90 days post-class' },
        { desc: 'Certification Exam Fee (per person)', qty: 4, unit: 'persons', price: 6500, specs: 'HCP proctored certification exam, 90 minutes, online or onsite, includes one re-take voucher' },
        { desc: 'Travel and Accommodation (Manila, 3 days per person)', qty: 4, unit: 'persons', price: 8500, specs: 'Manila travel allowance: domestic flights, 3 nights hotel, per diem, ground transport, per person' },
      ]),
    });

    // Mixed sourcing — some items online, some need procurement canvassing
    createPrAtStage({
      title: 'IT Equipment Refresh – Finance Department',
      desc: 'Replacement monitors and peripherals for the Finance team workstations.',
      justification: 'Finance team monitors are 7 years old with degraded color accuracy affecting report readability. Peripherals (keyboards/mice) are failing. Standard 5-year replacement cycle overdue.',
      priority: 'medium', requester: christine, dept: fin, deptCode: 'FIN', deptHead: finHead,
      createdDaysAgo: 2, neededInDays: 14,
      stage: 'level1_review',
      items: makeItems([
        { desc: 'Dell P2723QE 27" 4K USB-C Monitor', qty: 5, unit: 'units', price: 24500, specs: 'Dell P2723QE 27" IPS 4K UHD, USB-C 90W power delivery, 4-side InfinityEdge, height-adjust stand, 3-year warranty' },
        { desc: 'Logitech MX Keys S Keyboard', qty: 5, unit: 'units', price: 5800, sourcingType: 'online', specs: 'Logitech MX Keys S full-size wireless keyboard, smart backlit keys, USB-C, multi-device pairing, Mac/Win', notes: 'Available on Lazada Official Store' },
        { desc: 'Logitech MX Master 3S Mouse', qty: 5, unit: 'units', price: 5200, sourcingType: 'online', specs: 'Logitech MX Master 3S wireless mouse, 8000 DPI, MagSpeed scroll, USB-C charging, multi-device', notes: 'Available on Lazada Official Store' },
        { desc: 'Monitor Arm (dual-compatible, clamp mount)', qty: 5, unit: 'units', price: 3800, specs: 'Single-monitor gas-spring arm, supports up to 32" / 9kg, clamp + grommet mount, USB pass-through' },
      ]),
    });

    // ─── REJECTED PR ───

    createPrAtStage({
      title: 'Drone for Site Survey and Inspection',
      desc: 'DJI Matrice 350 RTK drone for aerial site surveys and camera placement planning.',
      justification: 'Aerial survey would improve camera placement accuracy and reduce multiple site visits.',
      priority: 'medium', requester: juan, dept: eng, deptCode: 'ENG', deptHead: engHead,
      createdDaysAgo: 12, neededInDays: 30,
      stage: 'rejected',
      rejectReason: 'Drone procurement requires CAB (Civil Aviation Board) operator certification which the team does not currently hold. Please coordinate with the Engineering head on alternative survey methods. Resubmit when certification requirements are met.',
      items: makeItems([
        { desc: 'DJI Matrice 350 RTK Enterprise Drone', qty: 1, unit: 'unit', price: 485000, specs: 'DJI Matrice 350 RTK, 55-min flight time, IP55, dual-control, RTK accuracy ±1cm + 1ppm, 3-prop redundancy' },
        { desc: 'DJI Zenmuse H20T Camera (Thermal+Optical)', qty: 1, unit: 'unit', price: 285000, specs: 'Zenmuse H20T quad-sensor: 20MP zoom, 12MP wide, 640×512 thermal, laser rangefinder up to 1200m' },
        { desc: 'Extra Battery Set and Charging Hub', qty: 2, unit: 'sets', price: 45000, specs: 'TB65 battery 4-pack with BS65 charging hub, 100W per channel, multi-charge support' },
        { desc: 'CAB Drone Operator Training (online, per person)', qty: 3, unit: 'persons', price: 12000, specs: 'CAAP-accredited drone pilot certification course, online theory + practical assessment, ~40 hours' },
      ]),
    });

    // ─── RETURNED PRs ───

    createPrAtStage({
      title: 'CCTV Installation Certification Training',
      desc: 'Certified CCTV Installer (CPSTI) training for 5 field engineers via ASIS International.',
      justification: 'Certification will improve installation quality and is increasingly required by government project bids.',
      priority: 'medium', requester: sarah, dept: eng, deptCode: 'ENG', deptHead: engHead,
      createdDaysAgo: 5, neededInDays: 28,
      stage: 'returned',
      returnReason: 'Please provide: (1) training provider accreditation certificate, (2) detailed training schedule and modules, and (3) at least 3 price quotations from different training providers. Resubmit with complete supporting documents.',
      items: makeItems([
        { desc: 'CPSTI Certification Training (5 participants)', qty: 5, unit: 'persons', price: 25000, specs: 'ASIS CPSTI 5-day training, 40-hour curriculum, classroom + practical, certified instructor' },
        { desc: 'Training Materials and Module Kit', qty: 5, unit: 'sets', price: 3500, specs: 'Official CPSTI study guide, sample-equipment kit, slide handouts, online portal access' },
        { desc: 'Certification Exam Fee (per candidate)', qty: 5, unit: 'persons', price: 8500, specs: 'CPSTI proctored exam fee, 3-hour duration, ASIS International, online or onsite' },
      ]),
    });

    createPrAtStage({
      title: 'Cable Pulling and Termination Tools',
      desc: 'Professional cable installation tools for the field engineering team.',
      justification: 'Current tools are outdated and insufficient for the scale of Busway Phase 2 installation.',
      priority: 'medium', requester: kevin, dept: eng, deptCode: 'ENG', deptHead: engHead,
      createdDaysAgo: 3, neededInDays: 20,
      stage: 'returned',
      returnedAtLevel: 2,
      returnReason: 'Please provide at least 3 canvass sheets from hardware suppliers. Also clarify if these tools are for purchase or rental — rental may be more cost-effective for a single project.',
      items: makeItems([
        { desc: 'Cable Puller (600m, 800kg pull force)', qty: 1, unit: 'unit', price: 45000, specs: 'Heavy-duty cable puller, 800kg pull force, 600m capacity, gasoline-powered with safety brake' },
        { desc: 'Fiber Optic Fusion Splicer (Sumitomo TYPE-82)', qty: 1, unit: 'unit', price: 185000, specs: 'Sumitomo TYPE-82 fusion splicer, core alignment, 7-second splice / 14-second heat, color touchscreen' },
        { desc: 'OTDR (Optical Time Domain Reflectometer)', qty: 1, unit: 'unit', price: 125000, specs: 'Handheld OTDR, dual-wavelength 1310/1550nm, 36/35 dB dynamic range, 5ns event dead-zone' },
        { desc: 'Network Cable Tester (Fluke Networks)', qty: 2, unit: 'units', price: 28000, specs: 'Fluke Networks MicroScanner2, Cat3-Cat6A continuity + length, distance-to-fault, PoE detection' },
        { desc: 'Cable Crimping and Stripping Tool Set', qty: 5, unit: 'sets', price: 4500, specs: 'Pro tool set: RJ45/RJ11 crimper, coax crimper, cable stripper, spare blades, in molded case' },
      ]),
    });

    // ─── CANCELLED PR ───

    createPrAtStage({
      title: 'Analog CCTV Cameras – Temporary Monitoring',
      desc: 'Temporary analog CCTV cameras for site security during Busway installation period.',
      justification: 'Temporary security monitoring for construction materials at busway sites.',
      priority: 'low', requester: ryan, dept: ops, deptCode: 'OPS', deptHead: opsHead,
      createdDaysAgo: 8, neededInDays: 5,
      stage: 'cancelled',
      cancelReason: 'Client has provided their own temporary security cameras for site monitoring. Purchase no longer needed.',
      items: makeItems([
        { desc: 'Analog Dome Camera (AHD 2MP)', qty: 20, unit: 'units', price: 1800, specs: '2MP AHD analog dome camera, 1080p, 30m IR, varifocal 2.8-12mm lens, IP66' },
        { desc: '16-Channel DVR (2MP, 2TB HDD included)', qty: 2, unit: 'units', price: 15000, specs: '16-channel AHD DVR, 1080p recording, 2TB HDD pre-installed, H.265+, hybrid analog/IP support' },
        { desc: 'RG59 Coaxial Cable (100m/roll)', qty: 10, unit: 'rolls', price: 2200, specs: 'RG59 coaxial cable, 75 ohm, copper-clad steel center, with 18AWG paired power conductor, 100m roll' },
      ]),
    });

    // ─── DRAFT PRs ───

    createPrAtStage({
      title: 'UPS Systems – Busway Station NVR Rooms',
      desc: 'Rackmount UPS units for each busway station equipment room to ensure continuous recording during power outages.',
      justification: 'Station power is unreliable during peak hours. UPS provides minimum 4-hour backup per project specs.',
      priority: 'high', requester: mark, dept: eng, deptCode: 'ENG', deptHead: engHead,
      createdDaysAgo: 1, neededInDays: 30,
      stage: 'draft',
      projectName: 'CCTV Installation – Busway Line 1',
      items: makeItems([
        { desc: 'APC Smart-UPS 2200VA LCD RM 2U (SUA2200RMXL5U)', qty: 8, unit: 'units', price: 38500, specs: 'APC Smart-UPS 2200VA / 1980W, line-interactive, rack-mount 2U, LCD, with network management slot' },
        { desc: 'UPS Battery Replacement Kit (per unit)', qty: 8, unit: 'sets', price: 8500, specs: 'OEM battery replacement cartridge, hot-swappable, 12V SLA pack matched to APC SUA2200RMXL5U' },
        { desc: 'PDU Rackmount (8-outlet, 20A)', qty: 8, unit: 'units', price: 5500, specs: '1U horizontal PDU, 8× IEC C13 outlets, 20A NEMA 5-20P input, 10-ft cord, with surge protection' },
      ]),
    });

    createPrAtStage({
      title: 'AI Camera Phase 2 – Additional Zones',
      desc: 'Expansion of AI camera coverage to 20 additional zones identified in Phase 1 evaluation.',
      justification: 'Phase 1 revealed additional blind spots requiring coverage. Phase 2 scope approved by project stakeholders.',
      priority: 'medium', requester: diana, dept: its, deptCode: 'ITS', deptHead: itsHead,
      createdDaysAgo: 0, neededInDays: 45,
      stage: 'draft',
      projectName: 'AI Camera System – Phase 1',
      items: makeItems([
        { desc: 'Hikvision DS-2CD2T47G2P 4MP AI Camera (additional zones)', qty: 20, unit: 'units', price: 14500, specs: '4MP ColorVu bullet camera with deep-learning AI, 120m IR + strobe, 4mm lens, IP67/IK10' },
        { desc: 'Milestone Additional Channel License (per camera, 3yr)', qty: 20, unit: 'channels', price: 12000, specs: 'Milestone XProtect Corporate channel license, 3-year SLC, includes recording and analytics support' },
        { desc: 'Mounting Hardware and Accessories (per camera)', qty: 20, unit: 'sets', price: 2500, specs: 'Per-camera mounting kit: bracket, junction box, anti-tamper screws, weather sealant' },
      ]),
    });

    // ─── JOB REQUESTS ─────────────────────────────────────────
    console.log('Creating job requests...');

    createApprovedPr({
      title: 'Site Survey – Busway Phase 2 Stations',
      desc: 'Professional site survey of 6 additional busway stations for Phase 2 camera placement planning.',
      justification: 'Phase 2 scope requires detailed site survey to finalize camera types, quantities, and cabling routes.',
      priority: 'high', requester: juan, dept: eng, deptCode: 'ENG', deptHead: engHead,
      createdDaysAgo: 25, neededInDays: -5,
      requestType: 'job_request', projectName: 'CCTV Installation – Busway Line 1',
      items: makeItems([
        { desc: 'Site Survey and Assessment (per station)', qty: 6, unit: 'stations', price: 8500, specs: 'Full station walkthrough, line-of-sight study, photo documentation, blind-spot analysis — 1 day per station' },
        { desc: 'Camera Placement Drawing and BOQ Preparation', qty: 6, unit: 'stations', price: 5000, specs: 'Camera placement plan in AutoCAD, BOQ in Excel with quantities and specs, per station' },
        { desc: 'Site Survey Report and Recommendations', qty: 1, unit: 'lot', price: 15000, specs: 'Consolidated PDF survey report covering all stations: recommendations, risk register, summary BOQ' },
      ]),
    });

    const jrId = createApprovedPr({
      title: 'AI Camera System Commissioning and Testing',
      desc: 'Professional commissioning, configuration, and acceptance testing of the AI camera system.',
      justification: 'Commissioning by certified engineers required per project contract. Includes camera calibration, AI analytics tuning, and client acceptance.',
      priority: 'urgent', requester: miguel, dept: its, deptCode: 'ITS', deptHead: itsHead,
      createdDaysAgo: 15, neededInDays: 3,
      requestType: 'job_request', projectName: 'AI Camera System – Phase 1',
      items: makeItems([
        { desc: 'AI Camera Commissioning (per camera)', qty: 48, unit: 'cameras', price: 1500, specs: 'Per-camera commissioning: physical install verify, focus / zoom calibration, network onboarding, firmware update' },
        { desc: 'AI Analytics Configuration and Tuning', qty: 48, unit: 'channels', price: 800, specs: 'AI rule setup per channel: zones, sensitivity, schedules, alarm rules, with 1-week soak tuning' },
        { desc: 'VMS Integration and Testing', qty: 1, unit: 'lot', price: 35000, specs: 'Integration of cameras + analytics into Milestone VMS, recording verification, redundancy/failover test' },
        { desc: 'Client Acceptance Testing and Documentation', qty: 1, unit: 'lot', price: 25000, specs: 'UAT walkthrough with client, signed acceptance form, as-built drawings, operations manual' },
      ]),
    });

    createPrAtStage({
      title: 'CCTV Preventive Maintenance – Busway Phase 1 Systems',
      desc: 'Quarterly preventive maintenance of all installed CCTV cameras and recording equipment in Phase 1 busway stations.',
      justification: 'Post-warranty PM contract ensures system reliability and 99% uptime SLA compliance.',
      priority: 'medium', requester: grace, dept: ops, deptCode: 'OPS', deptHead: opsHead,
      createdDaysAgo: 1, neededInDays: 30,
      stage: 'draft',
      requestType: 'job_request', projectName: 'CCTV Installation – Busway Line 1',
      items: makeItems([
        { desc: 'Quarterly PM Service (per station, 8 stations)', qty: 8, unit: 'stations', price: 6500, specs: 'Per-station PM: physical inspection, cleaning, alignment, firmware check, written on-site report — quarterly' },
        { desc: 'Camera Lens Cleaning and Focus Check (per camera)', qty: 120, unit: 'cameras', price: 150, specs: 'Microfiber + lens-safe cleaner, focus + zoom check, dome cover cleaning, gasket inspection' },
        { desc: 'NVR Health Check and Storage Verification', qty: 2, unit: 'units', price: 8000, specs: 'Storage integrity scan (SMART + RAID status), video retention audit, replace failing drives if found' },
        { desc: 'PM Report and Certification per Station', qty: 8, unit: 'reports', price: 1500, specs: 'Signed PM completion report per station, including before/after photos and findings checklist' },
      ]),
    });

    // ─── SUPPLIERS ───────────────────────────────────────────
    console.log('\nCreating suppliers...');
    const suppliers = await Supplier.insertMany([
      {
        companyName: 'TechVision Philippines Inc.',
        address: '12F Cybergate Tower, EDSA, Mandaluyong City',
        taxType: 'vat', tin: '123-456-789-000',
        contactPerson: 'Michael Tan', contactNumber: '+63 917 123 4567', email: 'sales@techvision.ph',
        paymentTerms: 'Net 30', bankAccountName: 'TechVision Philippines Inc.', bankAccountNumber: '1234567890', bankName: 'BDO Unibank',
        status: 'active', notes: 'Authorized Hikvision distributor — preferred supplier for cameras', createdBy: procurementUser._id,
      },
      {
        companyName: 'Cabletech Solutions Corp.',
        address: '789 Shaw Blvd, Mandaluyong City',
        taxType: 'vat', tin: '456-789-012-000',
        contactPerson: 'Anna Reyes', contactNumber: '+63 920 456 7890', email: 'orders@cabletech.ph',
        paymentTerms: 'Net 15', bankAccountName: 'Cabletech Solutions Corp.', bankAccountNumber: '0987654321', bankName: 'BPI',
        status: 'active', notes: 'ISO-certified cables, bulk discount for 30+ boxes', createdBy: procurementUser._id,
      },
      {
        companyName: 'ServerPro Technologies Inc.',
        address: '8F Rockwell Business Center, Makati City',
        taxType: 'vat', tin: '789-012-345-000',
        contactPerson: 'David Cruz', contactNumber: '+63 923 789 0123', email: 'enterprise@serverpro.ph',
        paymentTerms: 'Net 30', bankAccountName: 'ServerPro Technologies Inc.', bankAccountNumber: '5678901234', bankName: 'Metrobank',
        status: 'active', notes: 'HPE and Dell partner. Handles GPU servers and NVR equipment', createdBy: accountingUser._id,
      },
      {
        companyName: 'AIVision Systems Philippines',
        address: '30F Cyber Sigma, Mckinley Hill, Taguig City',
        taxType: 'vat', tin: '012-345-678-000',
        contactPerson: 'Rosa Santos', contactNumber: '+63 926 012 3456', email: 'solutions@aivision.ph',
        paymentTerms: 'Net 45', bankAccountName: 'AIVision Systems Philippines', bankAccountNumber: '3216549870', bankName: 'Landbank',
        status: 'active', notes: 'Exclusive AI analytics partner. Includes implementation support', createdBy: procurementUser._id,
      },
      {
        companyName: 'SafetyGear Philippines Corp.',
        address: '55 Commonwealth Ave, Quezon City',
        taxType: 'non_vat', tin: '667-890-123-000',
        contactPerson: 'Leo Bautista', contactNumber: '+63 932 678 9015', email: 'safety@safetygear.ph',
        paymentTerms: 'COD', bankAccountName: 'SafetyGear Philippines Corp.', bankAccountNumber: '5551112220', bankName: 'PNB',
        status: 'active', notes: 'DOLE-certified PPE supplier. Quick delivery for urgent orders', createdBy: procurementUser._id,
      },
      {
        companyName: 'TechInstall Services Corp.',
        address: '20 Boni Ave, Mandaluyong City',
        taxType: 'non_vat', tin: '990-123-456-000',
        contactPerson: 'Pedro Gomez', contactNumber: '+63 935 901 2348', email: 'projects@techinstall.ph',
        paymentTerms: 'Net 15', bankAccountName: 'TechInstall Services Corp.',
        status: 'active', notes: 'CCTV-specialized contractor. 10 years experience, DICT-accredited', createdBy: procurementUser._id,
      },
      {
        companyName: 'HiSec Distribution Corp.',
        address: '3F Avida Tower, Alabang, Muntinlupa City',
        taxType: 'vat', tin: '234-567-890-000',
        contactPerson: 'Grace Lim', contactNumber: '+63 918 234 5678', email: 'quotes@hisec.ph',
        paymentTerms: 'Net 30',
        status: 'inactive', notes: 'Slow delivery on last 2 orders. On watch status', createdBy: accountingUser._id,
      },
      {
        companyName: 'NetInfra Philippines',
        address: '45 Ortigas Ave, Pasig City',
        taxType: 'vat', tin: '567-890-123-000',
        contactPerson: 'Rico Mendoza', contactNumber: '+63 921 567 8901', email: 'sales@netinfra.ph',
        paymentTerms: 'Net 30', bankAccountName: 'NetInfra Philippines', bankAccountNumber: '6789012345', bankName: 'BPI',
        status: 'active', notes: 'Free delivery for orders above PHP 50,000. Reliable lead times', createdBy: procurementUser._id,
      },
      {
        companyName: 'WireMax Supply Inc.',
        address: '100 Quezon Ave, Quezon City',
        taxType: 'non_vat', tin: '678-901-234-000',
        contactPerson: 'Tony Villanueva', contactNumber: '+63 922 678 9012', email: 'wiring@wiremax.ph',
        paymentTerms: 'COD', bankAccountName: 'WireMax Supply Inc.', bankAccountNumber: '7890123456', bankName: 'PNB',
        status: 'active', notes: 'Smaller company, limited stock for large orders. Good for urgent small batches', createdBy: procurementUser._id,
      },
      {
        companyName: 'CamWorld Philippines',
        address: '2F SM Cyberzone, SM Mall of Asia, Pasay City',
        taxType: 'vat', tin: '345-678-901-000',
        contactPerson: 'Jenny Ong', contactNumber: '+63 919 345 6789', email: 'info@camworld.ph',
        paymentTerms: 'Net 15', bankAccountName: 'CamWorld Philippines', bankAccountNumber: '8901234567', bankName: 'Security Bank',
        status: 'active', notes: 'Mixed brands available, longer lead time. Good for non-urgent orders', createdBy: procurementUser._id,
      },
      {
        companyName: 'DataCenter Philippines Corp.',
        address: '22F Ayala Ave, Makati City',
        taxType: 'vat', tin: '890-123-456-000',
        contactPerson: 'Carlo Aquino', contactNumber: '+63 924 890 1234', email: 'dc@datacenter.ph',
        paymentTerms: 'Net 45', bankAccountName: 'DataCenter Philippines Corp.', bankAccountNumber: '9012345678', bankName: 'BDO Unibank',
        status: 'active', notes: 'Lenovo partner. Includes rack installation service', createdBy: procurementUser._id,
      },
      {
        companyName: 'TechCore Systems PH',
        address: '5F Bonifacio High Street, BGC, Taguig',
        taxType: 'vat', tin: '901-234-567-000',
        contactPerson: 'Mark Dela Cruz', contactNumber: '+63 925 901 2345', email: 'quotes@techcore.ph',
        paymentTerms: 'Net 30', bankAccountName: 'TechCore Systems PH', bankAccountNumber: '0123456789', bankName: 'Metrobank',
        status: 'active', notes: 'Higher quote but offers 24/7 on-site support', createdBy: procurementUser._id,
      },
      {
        companyName: 'SmartAnalytics PH Inc.',
        address: '15F GT Tower, Ayala Ave, Makati City',
        taxType: 'vat', tin: '112-345-678-000',
        contactPerson: 'Lisa Tan', contactNumber: '+63 927 123 4560', email: 'info@smartanalytics.ph',
        paymentTerms: 'Net 30', bankAccountName: 'SmartAnalytics PH Inc.', bankAccountNumber: '1122334455', bankName: 'BPI',
        status: 'active', notes: 'Alternative AI platform, more modules available', createdBy: procurementUser._id,
      },
      {
        companyName: 'VisionAI Corporation',
        address: '7F Estancia Mall Tower, Pasig City',
        taxType: 'vat', tin: '223-456-789-000',
        contactPerson: 'Ramon Santos', contactNumber: '+63 928 234 5671', email: 'enterprise@visionai.ph',
        paymentTerms: 'Net 30', bankAccountName: 'VisionAI Corporation', bankAccountNumber: '2233445566', bankName: 'Landbank',
        status: 'active', notes: 'Newer company but has strong local support team', createdBy: procurementUser._id,
      },
      {
        companyName: 'WorkSafe Solutions Inc.',
        address: '77 Mindanao Ave, Quezon City',
        taxType: 'vat', tin: '778-901-234-000',
        contactPerson: 'Ben Garcia', contactNumber: '+63 933 789 0126', email: 'orders@worksafe.ph',
        paymentTerms: 'Net 15', bankAccountName: 'WorkSafe Solutions Inc.', bankAccountNumber: '3344556677', bankName: 'Metrobank',
        status: 'active', notes: 'ISO-certified products, includes safety training', createdBy: procurementUser._id,
      },
      {
        companyName: 'ProtectPro Philippines',
        address: '88 Kamuning Rd, Quezon City',
        taxType: 'non_vat', tin: '889-012-345-000',
        contactPerson: 'Aileen Cruz', contactNumber: '+63 934 890 1237', email: 'protect@protectpro.ph',
        paymentTerms: 'COD', bankAccountName: 'ProtectPro Philippines', bankAccountNumber: '4455667788', bankName: 'PNB',
        status: 'active', notes: 'Premium brands only, higher price point', createdBy: procurementUser._id,
      },
      {
        companyName: 'NetworkPlus Philippines',
        address: '33 Scout Area, Quezon City',
        taxType: 'vat', tin: '101-234-567-000',
        contactPerson: 'Carlos Reyes', contactNumber: '+63 936 012 3459', email: 'service@networkplus.ph',
        paymentTerms: 'Net 30', bankAccountName: 'NetworkPlus Philippines', bankAccountNumber: '5566778899', bankName: 'BDO Unibank',
        status: 'active', notes: 'Certified network engineers, flexible scheduling', createdBy: procurementUser._id,
      },
      {
        companyName: 'ProInstall Solutions',
        address: '44 Ortigas Extension, Pasig City',
        taxType: 'non_vat', tin: '202-345-678-000',
        contactPerson: 'Mario Lopez', contactNumber: '+63 937 123 4560', email: 'info@proinstall.ph',
        paymentTerms: 'Net 15', bankAccountName: 'ProInstall Solutions', bankAccountNumber: '6677889900', bankName: 'Security Bank',
        status: 'active', notes: 'Available for urgent mobilization, higher rate', createdBy: procurementUser._id,
      },
      {
        companyName: 'Office Depot Manila Corp.',
        address: '456 Makati Ave, Makati City',
        taxType: 'vat', tin: '334-567-890-000',
        contactPerson: 'Susan Lim', contactNumber: '+63 929 345 6782', email: 'orders@officedepot.ph',
        paymentTerms: 'Net 15', bankAccountName: 'Office Depot Manila Corp.', bankAccountNumber: '7788990011', bankName: 'BPI',
        status: 'active', notes: 'Bulk pricing available, same-day delivery', createdBy: procurementUser._id,
      },
      {
        companyName: 'NBS Philippines',
        address: '789 Taft Ave, Manila',
        taxType: 'vat', tin: '445-678-901-000',
        contactPerson: 'Angela Ramos', contactNumber: '+63 930 456 7893', email: 'corporate@nbs.ph',
        paymentTerms: 'COD', bankAccountName: 'NBS Philippines', bankAccountNumber: '8899001122', bankName: 'Metrobank',
        status: 'active', notes: 'Wide selection, loyalty program member', createdBy: accountingUser._id,
      },
      {
        companyName: 'Shopwise Business Supplies',
        address: '100 EDSA Cubao, Quezon City',
        taxType: 'non_vat', tin: '556-789-012-000',
        contactPerson: 'Roberto Tan', contactNumber: '+63 931 567 8904', email: 'biz@shopwise.ph',
        paymentTerms: 'COD', bankAccountName: 'Shopwise Business Supplies', bankAccountNumber: '9900112233', bankName: 'PNB',
        status: 'active', notes: 'Good for mixed supplies, higher per-unit cost', createdBy: accountingUser._id,
      },
    ]);
    console.log(`  Created ${suppliers.length} suppliers`);

    for (const prDoc of allPrs) {
      if (['approved', 'completed', 'quoted'].includes(prDoc.status)) {
        applyQuotedPricingToPr(prDoc, suppliers, procurementUser._id as Types.ObjectId);
      }
      await attachReferencePhotos(prDoc);
    }

    // ─── Generate Attachments for Quoted-or-Later PRs ──────────
    // Quotations are produced by Procurement during canvassing, which happens
    // AFTER approval. PRs in draft / level1-3_review / pending_quotation have
    // not yet had supplier quotations sourced, so they must not carry any
    // quotation attachments. Same for rejected/returned/cancelled PRs that
    // never made it past approval in this seed.
    const QUOTATION_STAGES = new Set(['quoted', 'approved', 'completed']);
    console.log('\nGenerating supplier quotation PDFs as attachments...');
    let attachmentCount = 0;
    let attachedPrCount = 0;
    for (const prDoc of allPrs) {
      if (!QUOTATION_STAGES.has(prDoc.status)) continue;
      await attachQuotations(prDoc, prDoc.requesterId, getProjectName(prDoc.projectId));
      attachmentCount += prDoc.attachments.length;
      attachedPrCount += 1;
      process.stdout.write('.');
    }
    console.log(`\n  Generated ${attachmentCount} PDF attachments for ${attachedPrCount} PRs`);

    // ─── Insert PRs ───────────────────────────────────────────
    console.log(`  Inserting ${allPrs.length} purchase/job requests...`);
    // Enforce single-mode PRs and strip _seedPrice helper field before persisting
    let coerced = 0;
    for (const pr of allPrs) {
      const beforeSourcing = pr.items?.map((i: any) => i.sourcingType).join(',');
      normalizeSourcingMode(pr);
      const afterSourcing = pr.items?.map((i: any) => i.sourcingType).join(',');
      if (beforeSourcing !== afterSourcing) coerced += 1;
      pr.items = pr.items.map(({ _seedPrice, ...rest }: any) => rest);
    }
    if (coerced > 0) {
      console.log(`  Coerced ${coerced} mixed-sourcing PR(s) to single mode`);
    }
    await PurchaseRequest.insertMany(allPrs);

    // ─── PURCHASE ORDERS ──────────────────────────────────────
    console.log('\nCreating purchase orders...');
    const poYear = new Date().getFullYear();
    let poSeq = 0;
    const nextPoNumber = () => `PO-${poYear}-${String(++poSeq).padStart(5, '0')}`;

    const completedPrDocs = allPrs.filter(p => p.status === 'completed' || p.status === 'approved');
    const allPos: mongoose.Document[] = [];

    // Helper to build a PO from a PR
    const buildPoFromPr = (pr: any, overrides: Record<string, any> = {}) => {
      const canvassEntries = buildCanvassEntries(pr, suppliers);
      const selectedEntry = canvassEntries.find((entry: any) => entry.isSelected) ?? canvassEntries[0];
      return new PurchaseOrder({
        poNumber: nextPoNumber(),
        purchaseRequestId: pr._id,
        sourceRequestNumber: pr.prNumber,
        sourceRequestType: pr.requestType,
        supplierId: selectedEntry?.supplierId ?? null,
        supplierName: selectedEntry?.supplierName ?? null,
        projectName: getProjectName(pr.projectId),
        items: pr.items.map((item: any) => ({
          _id: new Types.ObjectId(),
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.quotedUnitPrice ?? item.estimatedPrice,
          totalPrice: item.totalPrice,
        })),
        totalAmount: pr.totalAmount,
        canvassEntries,
        createdBy: pr.requesterId,
        ...overrides,
      });
    };

    // PO 1: Received – IP Dome Cameras Batch 1
    if (completedPrDocs[0]) {
      const pr = completedPrDocs[0];
      const receivedAt = daysAgo(38);
      pr.status = 'completed';
      pr.completedAt = receivedAt;
      const po = buildPoFromPr(pr, {
        status: 'received',
        orderedAt: daysAgo(48),
        orderedBy: procurementUser._id,
        estimatedArrivalDate: daysAgo(40),
        receivedAt,
        receivedBy: procurementUser._id,
        receivingNotes: 'All 120 cameras received and inspected. No damage.',
      });
      pr.purchaseOrderId = po._id;
      allPos.push(po);
    }

    // PO 2: Received – Cat6 Cabling
    if (completedPrDocs[1]) {
      const pr = completedPrDocs[1];
      const receivedAt = daysAgo(35);
      pr.status = 'completed';
      pr.completedAt = receivedAt;
      const po = buildPoFromPr(pr, {
        status: 'received',
        orderedAt: daysAgo(43),
        orderedBy: procurementUser._id,
        estimatedArrivalDate: daysAgo(36),
        receivedAt,
        receivedBy: procurementUser._id,
        receivingNotes: 'All cabling materials delivered to site warehouse.',
      });
      pr.purchaseOrderId = po._id;
      allPos.push(po);
    }

    // PO 3: Ordered – Edge AI Server (awaiting delivery). PR stays APPROVED.
    if (completedPrDocs[7]) {
      const pr = completedPrDocs[7];
      const po = buildPoFromPr(pr, {
        status: 'ordered',
        orderedAt: daysAgo(14),
        orderedBy: procurementUser._id,
        estimatedArrivalDate: daysFromNow(7),
        remarks: 'Supplier confirmed shipment. ETA next week.',
      });
      pr.purchaseOrderId = po._id;
      allPos.push(po);
    }

    // PO 4: Pending – AI Analytics License (just auto-created). PR stays APPROVED.
    if (completedPrDocs[8]) {
      const pr = completedPrDocs[8];
      const po = buildPoFromPr(pr, {
        status: 'pending',
      });
      pr.purchaseOrderId = po._id;
      allPos.push(po);
    }

    // Auto-create pending POs for every other approved PR. PR stays APPROVED
    // until the PO is received.
    for (const pr of completedPrDocs) {
      if ((pr as any).purchaseOrderId) continue;
      const po = buildPoFromPr(pr, { status: 'pending' });
      (pr as any).purchaseOrderId = po._id;
      allPos.push(po);
    }

    console.log(`  Inserting ${allPos.length} purchase orders...`);
    await PurchaseOrder.insertMany(allPos);

    // Link POs back to PRs. Only flip PR to COMPLETED when the PO is received.
    const prPoUpdates = allPos.map((po: any) => ({
      updateOne: {
        filter: { _id: po.purchaseRequestId },
        update: po.status === 'received'
          ? { $set: { status: 'completed', completedAt: po.receivedAt, purchaseOrderId: po._id } }
          : { $set: { purchaseOrderId: po._id } },
      },
    }));
    if (prPoUpdates.length > 0) {
      await PurchaseRequest.bulkWrite(prPoUpdates);
      console.log(`  Linked ${prPoUpdates.length} PRs to POs`);
    }

    console.log(`  Inserting ${allApprovals.length} approval records...`);
    await Approval.insertMany(allApprovals);

    console.log(`  Inserting ${allNotifications.length} notifications...`);
    await Notification.insertMany(allNotifications);

    await PrSequence.create({ year, lastNumber: seqCounter });
    console.log(`  Created PR sequence for ${year}: lastNumber=${seqCounter}`);

    // ─── Summary ─────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════');
    console.log('  SEED COMPLETE');
    console.log('═══════════════════════════════════════════');
    console.log(`\n  Departments:         ${departments.length}`);
    console.log(`  Users:               ${users.length} (1 inactive)`);
    console.log(`  Suppliers:           ${suppliers.length}`);
    console.log(`  Purchase Requests:   ${allPrs.filter(p => p.requestType !== 'job_request').length}`);
    console.log(`  Job Requests:        ${allPrs.filter(p => p.requestType === 'job_request').length}`);
    console.log(`  Purchase Orders:     ${allPos.length}`);
    console.log(`  Approval Records:    ${allApprovals.length}`);
    console.log(`  Notifications:       ${allNotifications.length}`);
    console.log(`  PDF Attachments:     ${attachmentCount} files → ${UPLOADS_DIR}`);
    console.log('\n  All passwords: Password@123');
    console.log('\n  ┌────────────────────────────────────────────────────────────────┐');
    console.log('  │ Test Accounts                                                  │');
    console.log('  ├────────────────────────────────────────────────────────────────┤');
    console.log('  │ admin@wilsonworksph.com               → Admin                  │');
    console.log('  │ ceo@wilsonworksph.com                 → CEO                    │');
    console.log('  │ coo@wilsonworksph.com                 → COO                    │');
    console.log('  │ accounting@wilsonworksph.com           → Accounting Officer     │');
    console.log('  │ procurement@wilsonworksph.com          → Procurement Officer    │');
    console.log('  │ eng.head@wilsonworksph.com             → Dept Head (ENG)        │');
    console.log('  │ its.head@wilsonworksph.com             → Dept Head (ITS)        │');
    console.log('  │ ops.head@wilsonworksph.com             → Dept Head (OPS)        │');
    console.log('  │ fin.head@wilsonworksph.com             → Dept Head (FIN)        │');
    console.log('  │ pro.head@wilsonworksph.com             → Dept Head (PRO)        │');
    console.log('  │ adm.head@wilsonworksph.com             → Dept Head (ADM)        │');
    console.log('  │ juan.delacruz@wilsonworksph.com        → Staff (ENG)            │');
    console.log('  │ diana.fernandez@wilsonworksph.com      → Staff (ITS)            │');
    console.log('  │ grace.santos@wilsonworksph.com         → Staff (OPS)            │');
    console.log('  │ christine.navarro@wilsonworksph.com    → Staff (FIN)            │');
    console.log('  │ paolo.castro@wilsonworksph.com         → Staff (PRO)            │');
    console.log('  └────────────────────────────────────────────────────────────────┘');
    console.log('\n  PR Status Distribution:');
    console.log(`    Approved:   ${allPrs.filter(p => p.status === 'approved').length}`);
    console.log(`    Completed:  ${allPrs.filter(p => p.status === 'completed').length}`);
    console.log(`    Quoted:     ${allPrs.filter(p => p.status === 'quoted').length}`);
    console.log(`    Pending Quotation: ${allPrs.filter(p => p.status === 'pending_quotation').length}`);
    console.log(`    In Review:  ${allPrs.filter(p => ['level1_review', 'level2_review', 'level3_review'].includes(p.status)).length}`);
    console.log(`    Rejected:   ${allPrs.filter(p => p.status === 'rejected').length}`);
    console.log(`    Returned:   ${allPrs.filter(p => p.status === 'returned').length}`);
    console.log(`    Cancelled:  ${allPrs.filter(p => p.status === 'cancelled').length}`);
    console.log(`    Draft:      ${allPrs.filter(p => p.status === 'draft').length}`);
    console.log('\n  Projects:');
    console.log('    Project 1: CCTV Installation – Busway Line 1');
    console.log('    Project 2: AI Camera System – Phase 1');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
