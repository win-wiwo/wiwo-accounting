import mongoose, { Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prams';

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
}, { timestamps: true });

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  headId: { type: mongoose.Schema.Types.ObjectId, default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const lineItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  estimatedPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  notes: { type: String, default: null },
});

const prSchema = new mongoose.Schema({
  prNumber: { type: String, unique: true, sparse: true },
  requestType: { type: String, enum: ['purchase_request', 'job_request'], default: 'purchase_request' },
  title: { type: String, required: true },
  projectName: { type: String, default: null },
  description: { type: String, required: true },
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  status: { type: String, required: true, default: 'draft' },
  priority: { type: String, required: true, default: 'medium' },
  items: [lineItemSchema],
  totalAmount: { type: Number, default: 0 },
  currency: { type: String, default: 'PHP' },
  justification: { type: String, required: true },
  neededByDate: { type: Date, default: null },
  attachments: { type: [mongoose.Schema.Types.Mixed], default: [] },
  currentApprovalLevel: { type: Number, default: 0 },
  approvalHistory: [{ type: mongoose.Schema.Types.ObjectId }],
  submittedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  cancellationReason: { type: String, default: null },
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
  quotedItems: [{ description: String, unitPrice: Number, totalPrice: Number, remarks: String }],
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
  projectName: { type: String, default: null },
  items: [poLineItemSchema],
  totalAmount: { type: Number, default: 0 },
  currency: { type: String, default: 'PHP' },
  canvassEntries: [canvassEntrySchema],
  status: { type: String, enum: ['draft', 'submitted', 'approved', 'issued', 'cancelled'], default: 'draft' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date, default: null },
  issuedAt: { type: Date, default: null },
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
  departmentCode: { type: String, required: true },
  year: { type: Number, required: true },
  lastNumber: { type: Number, default: 0 },
}, { timestamps: true });

// ─── Helpers ──────────────────────────────────────────────

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(8 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60), 0, 0);
  return d;
}

function hoursAfter(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function makeItems(items: Array<{ desc: string; qty: number; unit: string; price: number; notes?: string }>) {
  return items.map(i => ({
    _id: new Types.ObjectId(),
    description: i.desc,
    quantity: i.qty,
    unit: i.unit,
    estimatedPrice: i.price,
    totalPrice: i.qty * i.price,
    notes: i.notes || null,
  }));
}

function totalOf(items: ReturnType<typeof makeItems>) {
  return items.reduce((sum, i) => sum + i.totalPrice, 0);
}

// ─── Main Seed ────────────────────────────────────────────

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const User = mongoose.model('User', userSchema);
    const Department = mongoose.model('Department', departmentSchema);
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
      PurchaseRequest.deleteMany({}),
      Approval.deleteMany({}),
      Notification.deleteMany({}),
      PrSequence.deleteMany({}),
      Supplier.deleteMany({}),
      PurchaseOrder.deleteMany({}),
    ]);

    // ─── Password ───
    const password = await bcrypt.hash('Password@123', 12);
    console.log('All user passwords: Password@123');

    // ─── Departments ───
    console.log('\nCreating departments...');
    const departments = await Department.insertMany([
      { name: 'Engineering', code: 'ENG', description: 'Software development and infrastructure' },
      { name: 'Marketing', code: 'MKT', description: 'Marketing campaigns and brand management' },
      { name: 'Human Resources', code: 'HR', description: 'People operations and recruitment' },
      { name: 'Finance', code: 'FIN', description: 'Financial planning and accounting' },
      { name: 'Operations', code: 'OPS', description: 'Facility management and logistics' },
      { name: 'Sales', code: 'SAL', description: 'Business development and client relations' },
    ]);
    const [eng, mkt, hr, fin, ops, sal] = departments;
    console.log(`  Created ${departments.length} departments`);

    // ─── Users ───
    console.log('\nCreating users...');
    const users = await User.insertMany([
      // Admin
      { employeeId: 'EMP-0001', email: 'admin@prams.com', passwordHash: password, firstName: 'System', lastName: 'Admin', role: 'admin', isActive: true },

      // C-level
      { employeeId: 'EMP-0002', email: 'ceo@prams.com', passwordHash: password, firstName: 'Roberto', lastName: 'Santos', role: 'ceo', isActive: true },
      { employeeId: 'EMP-0003', email: 'coo@prams.com', passwordHash: password, firstName: 'Maria', lastName: 'Reyes', role: 'coo', isActive: true },

      // Department Heads
      { employeeId: 'EMP-0010', email: 'eng.head@prams.com', passwordHash: password, firstName: 'Carlos', lastName: 'Garcia', role: 'dept_head', departmentId: eng._id, isActive: true },
      { employeeId: 'EMP-0011', email: 'mkt.head@prams.com', passwordHash: password, firstName: 'Ana', lastName: 'Cruz', role: 'dept_head', departmentId: mkt._id, isActive: true },
      { employeeId: 'EMP-0012', email: 'hr.head@prams.com', passwordHash: password, firstName: 'Patricia', lastName: 'Lim', role: 'dept_head', departmentId: hr._id, isActive: true },
      { employeeId: 'EMP-0013', email: 'fin.head@prams.com', passwordHash: password, firstName: 'Jose', lastName: 'Tan', role: 'dept_head', departmentId: fin._id, isActive: true },
      { employeeId: 'EMP-0014', email: 'ops.head@prams.com', passwordHash: password, firstName: 'Ricardo', lastName: 'Mendoza', role: 'dept_head', departmentId: ops._id, isActive: true },
      { employeeId: 'EMP-0015', email: 'sal.head@prams.com', passwordHash: password, firstName: 'Lucia', lastName: 'Flores', role: 'dept_head', departmentId: sal._id, isActive: true },

      // Engineering staff
      { employeeId: 'EMP-0100', email: 'juan.delacruz@prams.com', passwordHash: password, firstName: 'Juan', lastName: 'Dela Cruz', role: 'staff', departmentId: eng._id, isActive: true },
      { employeeId: 'EMP-0101', email: 'mark.ramos@prams.com', passwordHash: password, firstName: 'Mark', lastName: 'Ramos', role: 'staff', departmentId: eng._id, isActive: true },
      { employeeId: 'EMP-0102', email: 'sarah.villanueva@prams.com', passwordHash: password, firstName: 'Sarah', lastName: 'Villanueva', role: 'staff', departmentId: eng._id, isActive: true },
      { employeeId: 'EMP-0103', email: 'kevin.bautista@prams.com', passwordHash: password, firstName: 'Kevin', lastName: 'Bautista', role: 'staff', departmentId: eng._id, isActive: true },

      // Marketing staff
      { employeeId: 'EMP-0110', email: 'diana.fernandez@prams.com', passwordHash: password, firstName: 'Diana', lastName: 'Fernandez', role: 'staff', departmentId: mkt._id, isActive: true },
      { employeeId: 'EMP-0111', email: 'miguel.aquino@prams.com', passwordHash: password, firstName: 'Miguel', lastName: 'Aquino', role: 'staff', departmentId: mkt._id, isActive: true },

      // HR staff
      { employeeId: 'EMP-0120', email: 'grace.santos@prams.com', passwordHash: password, firstName: 'Grace', lastName: 'Santos', role: 'staff', departmentId: hr._id, isActive: true },
      { employeeId: 'EMP-0121', email: 'ryan.lopez@prams.com', passwordHash: password, firstName: 'Ryan', lastName: 'Lopez', role: 'staff', departmentId: hr._id, isActive: true },

      // Finance staff
      { employeeId: 'EMP-0130', email: 'christine.navarro@prams.com', passwordHash: password, firstName: 'Christine', lastName: 'Navarro', role: 'staff', departmentId: fin._id, isActive: true },

      // Operations staff
      { employeeId: 'EMP-0140', email: 'paolo.castro@prams.com', passwordHash: password, firstName: 'Paolo', lastName: 'Castro', role: 'staff', departmentId: ops._id, isActive: true },
      { employeeId: 'EMP-0141', email: 'nina.dela.rosa@prams.com', passwordHash: password, firstName: 'Nina', lastName: 'Dela Rosa', role: 'staff', departmentId: ops._id, isActive: true },

      // Sales staff
      { employeeId: 'EMP-0150', email: 'ramon.aguilar@prams.com', passwordHash: password, firstName: 'Ramon', lastName: 'Aguilar', role: 'staff', departmentId: sal._id, isActive: true },
      { employeeId: 'EMP-0151', email: 'isabella.morales@prams.com', passwordHash: password, firstName: 'Isabella', lastName: 'Morales', role: 'staff', departmentId: sal._id, isActive: true },

      // Accounting
      { employeeId: 'EMP-0160', email: 'accounting@prams.com', passwordHash: password, firstName: 'Maricel', lastName: 'Dimaculangan', role: 'accounting', departmentId: fin._id, isActive: true },

      // Procurement
      { employeeId: 'EMP-0170', email: 'procurement@prams.com', passwordHash: password, firstName: 'Eduardo', lastName: 'Villanueva', role: 'procurement', departmentId: ops._id, isActive: true },

      // Inactive user
      { employeeId: 'EMP-0199', email: 'former.employee@prams.com', passwordHash: password, firstName: 'Former', lastName: 'Employee', role: 'staff', departmentId: eng._id, isActive: false },
    ]);

    const userMap: Record<string, typeof users[0]> = {};
    for (const u of users) userMap[u.email as string] = u;

    console.log(`  Created ${users.length} users (1 inactive)`);

    // Set department heads
    await Department.updateOne({ _id: eng._id }, { headId: userMap['eng.head@prams.com']._id });
    await Department.updateOne({ _id: mkt._id }, { headId: userMap['mkt.head@prams.com']._id });
    await Department.updateOne({ _id: hr._id }, { headId: userMap['hr.head@prams.com']._id });
    await Department.updateOne({ _id: fin._id }, { headId: userMap['fin.head@prams.com']._id });
    await Department.updateOne({ _id: ops._id }, { headId: userMap['ops.head@prams.com']._id });
    await Department.updateOne({ _id: sal._id }, { headId: userMap['sal.head@prams.com']._id });
    console.log('  Assigned department heads');

    // ─── Purchase Requests ───
    console.log('\nCreating purchase requests...');
    const ceo = userMap['ceo@prams.com'];
    const coo = userMap['coo@prams.com'];
    const engHead = userMap['eng.head@prams.com'];
    const mktHead = userMap['mkt.head@prams.com'];
    const hrHead = userMap['hr.head@prams.com'];
    const finHead = userMap['fin.head@prams.com'];
    const opsHead = userMap['ops.head@prams.com'];
    const salHead = userMap['sal.head@prams.com'];
    const juan = userMap['juan.delacruz@prams.com'];
    const mark = userMap['mark.ramos@prams.com'];
    const sarah = userMap['sarah.villanueva@prams.com'];
    const kevin = userMap['kevin.bautista@prams.com'];
    const diana = userMap['diana.fernandez@prams.com'];
    const miguel = userMap['miguel.aquino@prams.com'];
    const grace = userMap['grace.santos@prams.com'];
    const ryan = userMap['ryan.lopez@prams.com'];
    const christine = userMap['christine.navarro@prams.com'];
    const paolo = userMap['paolo.castro@prams.com'];
    const nina = userMap['nina.dela.rosa@prams.com'];
    const ramon = userMap['ramon.aguilar@prams.com'];
    const isabella = userMap['isabella.morales@prams.com'];

    const procurementUser = userMap['procurement@prams.com'];
    const accountingUser = userMap['accounting@prams.com'];

    const year = new Date().getFullYear();
    const seqCounters: Record<string, number> = {};

    function nextPrNumber(deptCode: string, type: 'purchase_request' | 'job_request' = 'purchase_request'): string {
      const prefix = type === 'job_request' ? 'JR' : 'PR';
      const key = `${prefix}-${deptCode}`;
      if (!seqCounters[key]) seqCounters[key] = 0;
      seqCounters[key]++;
      return `${prefix}-${deptCode}-${year}-${String(seqCounters[key]).padStart(5, '0')}`;
    }

    const allPrs: mongoose.Document[] = [];
    const allApprovals: mongoose.Document[] = [];
    const allNotifications: mongoose.Document[] = [];

    // Helper to create a fully-approved PR
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

      const prId = new Types.ObjectId();
      const a1Id = new Types.ObjectId();
      const a2Id = new Types.ObjectId();
      const a3Id = new Types.ObjectId();

      allPrs.push(new PurchaseRequest({
        _id: prId, prNumber, requestType: reqType, title: opts.title,
        projectName: opts.projectName || null, description: opts.desc,
        requesterId: opts.requester._id, departmentId: opts.dept._id,
        status: 'approved', priority: opts.priority, items, totalAmount: total,
        justification: opts.justification,
        neededByDate: new Date(Date.now() + opts.neededInDays * 86400000),
        currentApprovalLevel: 3, approvalHistory: [a1Id, a2Id, a3Id],
        submittedAt: submitted, completedAt: l3Date,
        createdAt: created, updatedAt: l3Date,
      }));

      allApprovals.push(
        new Approval({ _id: a1Id, purchaseRequestId: prId, approverId: opts.deptHead._id, approvalLevel: 1, action: 'approved', comments: 'Looks good, approved.', actionDate: l1Date }),
        new Approval({ _id: a2Id, purchaseRequestId: prId, approverId: coo._id, approvalLevel: 2, action: 'approved', comments: 'Budget verified, proceed.', actionDate: l2Date }),
        new Approval({ _id: a3Id, purchaseRequestId: prId, approverId: ceo._id, approvalLevel: 3, action: 'approved', comments: 'Final approval granted.', actionDate: l3Date }),
      );

      // Notifications
      allNotifications.push(
        new Notification({ recipientId: opts.deptHead._id, title: 'New PR for review', message: `${opts.requester.firstName} submitted ${prNumber}`, type: 'pr_submitted', purchaseRequestId: prId, isRead: true, readAt: l1Date }),
        new Notification({ recipientId: opts.requester._id, title: 'PR Approved', message: `${prNumber} has been fully approved`, type: 'approval_approved', purchaseRequestId: prId, isRead: false }),
      );

      return prId;
    }

    // Helper for PR at a specific stage
    function createPrAtStage(opts: {
      title: string; desc: string; justification: string; priority: string;
      requester: typeof users[0]; dept: typeof departments[0]; deptCode: string;
      deptHead: typeof users[0]; items: ReturnType<typeof makeItems>;
      stage: 'draft' | 'submitted' | 'level1_review' | 'level2_review' | 'level3_review' | 'rejected' | 'returned' | 'cancelled';
      createdDaysAgo: number; neededInDays: number;
      rejectReason?: string; returnReason?: string; cancelReason?: string;
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

      let status = opts.stage;
      let currentLevel = 0;
      const approvalIds: Types.ObjectId[] = [];

      if (opts.stage === 'level1_review') {
        status = 'level1_review';
        currentLevel = 1;
        // L1 approved
        const a1Id = new Types.ObjectId();
        allApprovals.push(new Approval({ _id: a1Id, purchaseRequestId: prId, approverId: opts.deptHead._id, approvalLevel: 1, action: 'approved', comments: 'Approved at dept level.', actionDate: hoursAfter(submitted!, 6) }));
        approvalIds.push(a1Id);
      }

      if (opts.stage === 'level2_review') {
        status = 'level2_review';
        currentLevel = 2;
        const a1Id = new Types.ObjectId();
        const a2Id = new Types.ObjectId();
        allApprovals.push(
          new Approval({ _id: a1Id, purchaseRequestId: prId, approverId: opts.deptHead._id, approvalLevel: 1, action: 'approved', comments: 'Approved.', actionDate: hoursAfter(submitted!, 5) }),
          new Approval({ _id: a2Id, purchaseRequestId: prId, approverId: coo._id, approvalLevel: 2, action: 'approved', comments: 'COO approved.', actionDate: hoursAfter(submitted!, 18) }),
        );
        approvalIds.push(a1Id, a2Id);
      }

      if (opts.stage === 'level3_review') {
        status = 'level3_review';
        currentLevel = 3;
        const a1Id = new Types.ObjectId();
        const a2Id = new Types.ObjectId();
        allApprovals.push(
          new Approval({ _id: a1Id, purchaseRequestId: prId, approverId: opts.deptHead._id, approvalLevel: 1, action: 'approved', comments: 'Approved.', actionDate: hoursAfter(submitted!, 4) }),
          new Approval({ _id: a2Id, purchaseRequestId: prId, approverId: coo._id, approvalLevel: 2, action: 'approved', comments: 'Approved.', actionDate: hoursAfter(submitted!, 16) }),
        );
        approvalIds.push(a1Id, a2Id);
        allNotifications.push(
          new Notification({ recipientId: ceo._id, title: 'PR awaiting CEO approval', message: `${prNumber} needs your final approval`, type: 'pr_needs_action', purchaseRequestId: prId, isRead: false }),
        );
      }

      if (opts.stage === 'rejected') {
        status = 'rejected';
        const a1Id = new Types.ObjectId();
        allApprovals.push(new Approval({ _id: a1Id, purchaseRequestId: prId, approverId: opts.deptHead._id, approvalLevel: 1, action: 'rejected', comments: opts.rejectReason || 'Budget constraints, not approved.', actionDate: hoursAfter(submitted!, 8) }));
        approvalIds.push(a1Id);
        allNotifications.push(
          new Notification({ recipientId: opts.requester._id, title: 'PR Rejected', message: `${prNumber} has been rejected`, type: 'approval_rejected', purchaseRequestId: prId, isRead: false }),
        );
      }

      if (opts.stage === 'returned') {
        status = 'returned';
        const a1Id = new Types.ObjectId();
        allApprovals.push(new Approval({ _id: a1Id, purchaseRequestId: prId, approverId: opts.deptHead._id, approvalLevel: 1, action: 'returned', comments: opts.returnReason || 'Please provide more details and 3 quotations.', actionDate: hoursAfter(submitted!, 10) }));
        approvalIds.push(a1Id);
        allNotifications.push(
          new Notification({ recipientId: opts.requester._id, title: 'PR Returned', message: `${prNumber} was returned for revision`, type: 'approval_returned', purchaseRequestId: prId, isRead: false }),
        );
      }

      if (opts.stage === 'submitted') {
        allNotifications.push(
          new Notification({ recipientId: opts.deptHead._id, title: 'New PR for review', message: `${opts.requester.firstName} submitted ${prNumber}`, type: 'pr_submitted', purchaseRequestId: prId, isRead: false }),
        );
      }

      allPrs.push(new PurchaseRequest({
        _id: prId, prNumber, requestType: reqType, title: opts.title,
        projectName: opts.projectName || null, description: opts.desc,
        requesterId: opts.requester._id, departmentId: opts.dept._id,
        status, priority: opts.priority, items, totalAmount: total,
        justification: opts.justification,
        neededByDate: new Date(Date.now() + opts.neededInDays * 86400000),
        currentApprovalLevel: currentLevel, approvalHistory: approvalIds,
        submittedAt: submitted,
        cancellationReason: opts.stage === 'cancelled' ? (opts.cancelReason || 'No longer needed') : null,
        createdAt: created, updatedAt: created,
      }));

      return prId;
    }

    // ─── APPROVED PRs (various departments, past dates) ───

    // Engineering
    createApprovedPr({
      title: 'Development Laptops for New Hires',
      desc: 'MacBook Pro M3 laptops for 3 new software engineers joining the team.',
      justification: 'New hires starting next month need development workstations.',
      priority: 'high', requester: juan, dept: eng, deptCode: 'ENG', deptHead: engHead,
      createdDaysAgo: 45, neededInDays: -15,
      items: makeItems([
        { desc: 'MacBook Pro 16" M3 Pro, 36GB RAM, 512GB SSD', qty: 3, unit: 'units', price: 145000 },
        { desc: 'USB-C Docking Station', qty: 3, unit: 'units', price: 5500 },
        { desc: 'Ergonomic Keyboard (Keychron K8 Pro)', qty: 3, unit: 'units', price: 6500 },
      ]),
    });

    createApprovedPr({
      title: 'Cloud Infrastructure Annual License',
      desc: 'AWS Reserved Instances and Managed Services annual commitment.',
      justification: 'Current pay-as-you-go costs are 30% higher than reserved pricing.',
      priority: 'urgent', requester: mark, dept: eng, deptCode: 'ENG', deptHead: engHead,
      createdDaysAgo: 60, neededInDays: -30,
      items: makeItems([
        { desc: 'AWS EC2 Reserved Instances (3x m5.xlarge, 1yr)', qty: 1, unit: 'lot', price: 520000 },
        { desc: 'AWS RDS PostgreSQL Reserved (1yr)', qty: 1, unit: 'lot', price: 180000 },
        { desc: 'CloudFlare Enterprise Plan (annual)', qty: 1, unit: 'license', price: 95000 },
      ]),
    });

    createApprovedPr({
      title: 'Software Testing Tools',
      desc: 'Annual licenses for Cypress Cloud, BrowserStack, and Postman.',
      justification: 'QA team needs dedicated testing tools to meet sprint commitments.',
      priority: 'medium', requester: sarah, dept: eng, deptCode: 'ENG', deptHead: engHead,
      createdDaysAgo: 30, neededInDays: 5,
      items: makeItems([
        { desc: 'Cypress Cloud Team Plan (annual, 5 seats)', qty: 1, unit: 'license', price: 42000 },
        { desc: 'BrowserStack Automate Pro (annual)', qty: 1, unit: 'license', price: 65000 },
        { desc: 'Postman Professional (annual, 5 seats)', qty: 1, unit: 'license', price: 38000 },
      ]),
    });

    // Marketing
    createApprovedPr({
      title: 'Annual Brand Refresh Campaign',
      desc: 'Complete brand refresh including new collateral, website update, and launch event.',
      justification: 'Current branding is 4 years old and needs modernization per board directive.',
      priority: 'high', requester: diana, dept: mkt, deptCode: 'MKT', deptHead: mktHead,
      createdDaysAgo: 50, neededInDays: -10,
      items: makeItems([
        { desc: 'Brand Identity Design Package (Agency)', qty: 1, unit: 'project', price: 250000 },
        { desc: 'Print Collateral (brochures, business cards, letterheads)', qty: 1, unit: 'lot', price: 85000 },
        { desc: 'Website Redesign and Development', qty: 1, unit: 'project', price: 180000 },
        { desc: 'Launch Event & Media Coverage', qty: 1, unit: 'event', price: 120000 },
      ]),
    });

    createApprovedPr({
      title: 'Trade Show Booth & Materials',
      desc: 'Exhibition booth for TechCon 2026 including setup, materials, and giveaways.',
      justification: 'TechCon is our biggest lead gen event, expecting 500+ qualified leads.',
      priority: 'high', requester: miguel, dept: mkt, deptCode: 'MKT', deptHead: mktHead,
      createdDaysAgo: 35, neededInDays: 10,
      items: makeItems([
        { desc: 'Booth Space Rental (3x3m Premium)', qty: 1, unit: 'slot', price: 150000 },
        { desc: 'Booth Design & Fabrication', qty: 1, unit: 'project', price: 95000 },
        { desc: 'Promotional Merchandise (500 sets)', qty: 500, unit: 'sets', price: 350 },
        { desc: 'Roll-up Banners (set of 4)', qty: 4, unit: 'pcs', price: 8500 },
      ]),
    });

    // HR
    createApprovedPr({
      title: 'Employee Wellness Program Q2',
      desc: 'Quarterly wellness activities including health screenings and fitness subsidies.',
      justification: 'Part of the annual employee wellness initiative approved by the board.',
      priority: 'medium', requester: grace, dept: hr, deptCode: 'HR', deptHead: hrHead,
      createdDaysAgo: 25, neededInDays: 15,
      items: makeItems([
        { desc: 'Annual Physical Exam Package (50 employees)', qty: 50, unit: 'persons', price: 3500 },
        { desc: 'Gym Membership Subsidy (quarterly)', qty: 30, unit: 'persons', price: 2500 },
        { desc: 'Mental Health Webinar Series (3 sessions)', qty: 3, unit: 'sessions', price: 15000 },
      ]),
    });

    // Finance
    createApprovedPr({
      title: 'Accounting Software Upgrade',
      desc: 'Upgrade from QuickBooks to SAP Business One for growing operations.',
      justification: 'Current system cannot handle multi-entity consolidation required by expansion.',
      priority: 'urgent', requester: christine, dept: fin, deptCode: 'FIN', deptHead: finHead,
      createdDaysAgo: 40, neededInDays: -5,
      items: makeItems([
        { desc: 'SAP Business One Professional License (10 users)', qty: 10, unit: 'licenses', price: 45000 },
        { desc: 'Implementation & Data Migration Services', qty: 1, unit: 'project', price: 350000 },
        { desc: 'Training Program (5 days on-site)', qty: 1, unit: 'project', price: 85000 },
      ]),
    });

    // Operations
    createApprovedPr({
      title: 'Office Furniture Replacement',
      desc: 'Replace aging office furniture in the main floor with ergonomic alternatives.',
      justification: 'Current desks and chairs are 8+ years old, multiple employees reporting back pain.',
      priority: 'medium', requester: paolo, dept: ops, deptCode: 'OPS', deptHead: opsHead,
      createdDaysAgo: 20, neededInDays: 20,
      items: makeItems([
        { desc: 'Height-Adjustable Standing Desk', qty: 20, unit: 'units', price: 18500 },
        { desc: 'Ergonomic Office Chair (Herman Miller Aeron)', qty: 20, unit: 'units', price: 52000 },
        { desc: 'Monitor Arms (dual)', qty: 20, unit: 'units', price: 4500 },
        { desc: 'Delivery & Assembly', qty: 1, unit: 'lot', price: 25000 },
      ]),
    });

    // Sales
    createApprovedPr({
      title: 'CRM System Annual Subscription',
      desc: 'Salesforce Enterprise license renewal for the entire sales team.',
      justification: 'Current contract expires next month. Salesforce is critical for pipeline management.',
      priority: 'urgent', requester: ramon, dept: sal, deptCode: 'SAL', deptHead: salHead,
      createdDaysAgo: 15, neededInDays: 2,
      items: makeItems([
        { desc: 'Salesforce Enterprise (annual, 15 seats)', qty: 15, unit: 'licenses', price: 28000 },
        { desc: 'Salesforce CPQ Add-on (annual)', qty: 1, unit: 'license', price: 120000 },
      ]),
    });

    // ─── IN-PROGRESS PRs (various stages) ───

    // Submitted - waiting for dept head
    createPrAtStage({
      title: 'Development Conference Sponsorship',
      desc: 'Sponsor and attend DevOps Days Manila 2026.',
      justification: 'Great recruitment opportunity and team learning experience.',
      priority: 'medium', requester: kevin, dept: eng, deptCode: 'ENG', deptHead: engHead,
      createdDaysAgo: 3, neededInDays: 30,
      stage: 'submitted',
      items: makeItems([
        { desc: 'Gold Sponsorship Package', qty: 1, unit: 'package', price: 75000 },
        { desc: 'Team Tickets (5 persons)', qty: 5, unit: 'tickets', price: 8000 },
        { desc: 'Travel & Accommodation', qty: 5, unit: 'persons', price: 12000 },
      ]),
    });

    // Submitted - waiting for dept head
    createPrAtStage({
      title: 'Office Cleaning Service Contract',
      desc: 'Monthly professional deep cleaning service for all office floors.',
      justification: 'Building management recommended professional cleaning after recent audit.',
      priority: 'low', requester: nina, dept: ops, deptCode: 'OPS', deptHead: opsHead,
      createdDaysAgo: 2, neededInDays: 14,
      stage: 'submitted',
      items: makeItems([
        { desc: 'Monthly Deep Cleaning (6 months contract)', qty: 6, unit: 'months', price: 35000 },
        { desc: 'Carpet Shampooing (quarterly)', qty: 2, unit: 'sessions', price: 18000 },
      ]),
    });

    // At COO review (Level 2)
    createPrAtStage({
      title: 'Social Media Marketing Tools',
      desc: 'Annual subscription for Hootsuite Enterprise and Canva Pro for the marketing team.',
      justification: 'Current free-tier tools are limiting campaign output and analytics.',
      priority: 'medium', requester: diana, dept: mkt, deptCode: 'MKT', deptHead: mktHead,
      createdDaysAgo: 5, neededInDays: 20,
      stage: 'level2_review',
      items: makeItems([
        { desc: 'Hootsuite Enterprise (annual, 5 seats)', qty: 1, unit: 'license', price: 95000 },
        { desc: 'Canva Pro for Teams (annual, 5 seats)', qty: 1, unit: 'license', price: 32000 },
        { desc: 'Shutterstock Enterprise (annual, 750 images)', qty: 1, unit: 'license', price: 55000 },
      ]),
    });

    // At CEO review (Level 3)
    createPrAtStage({
      title: 'Data Center Network Upgrade',
      desc: 'Upgrade core network switches and add redundant fiber links.',
      justification: 'Current infrastructure is at 85% capacity, risking outages during peak.',
      priority: 'urgent', requester: mark, dept: eng, deptCode: 'ENG', deptHead: engHead,
      createdDaysAgo: 8, neededInDays: 15,
      stage: 'level3_review',
      items: makeItems([
        { desc: 'Cisco Catalyst 9300 Series Switches (2x)', qty: 2, unit: 'units', price: 285000 },
        { desc: 'Fiber Optic Cabling (redundant path)', qty: 1, unit: 'lot', price: 120000 },
        { desc: 'Installation & Configuration Services', qty: 1, unit: 'project', price: 85000 },
        { desc: 'UPS Battery Replacement', qty: 4, unit: 'units', price: 35000 },
      ]),
    });

    // ─── REJECTED PR ───
    createPrAtStage({
      title: 'Premium Coffee Machine for Pantry',
      desc: 'Commercial-grade espresso machine for the office pantry.',
      justification: 'Team morale and retention — employees have been requesting better coffee.',
      priority: 'low', requester: ryan, dept: hr, deptCode: 'HR', deptHead: hrHead,
      createdDaysAgo: 10, neededInDays: 30,
      stage: 'rejected',
      rejectReason: 'While appreciated, this expense is not justified in the current budget cycle. Please resubmit in Q4 when discretionary budgets are reviewed.',
      items: makeItems([
        { desc: 'La Marzocco Linea Mini Espresso Machine', qty: 1, unit: 'unit', price: 185000 },
        { desc: 'Eureka Mignon Specialita Grinder', qty: 1, unit: 'unit', price: 28000 },
        { desc: 'Coffee Bean Monthly Subscription (12 months)', qty: 12, unit: 'months', price: 4500 },
      ]),
    });

    // ─── RETURNED PRs ───
    createPrAtStage({
      title: 'Team Building Event Q2',
      desc: 'Off-site team building activity for the Sales department.',
      justification: 'Quarterly team building to improve collaboration and morale.',
      priority: 'medium', requester: isabella, dept: sal, deptCode: 'SAL', deptHead: salHead,
      createdDaysAgo: 4, neededInDays: 25,
      stage: 'returned',
      returnReason: 'Please provide at least 3 venue quotations and a detailed itinerary before resubmission.',
      items: makeItems([
        { desc: 'Resort Venue Rental (2 days, 1 night)', qty: 1, unit: 'event', price: 85000 },
        { desc: 'Team Activities & Facilitator', qty: 1, unit: 'package', price: 45000 },
        { desc: 'Transportation (bus rental)', qty: 1, unit: 'trip', price: 25000 },
        { desc: 'Meals & Refreshments', qty: 22, unit: 'persons', price: 2500 },
      ]),
    });

    // ─── CANCELLED PR ───
    createPrAtStage({
      title: 'Printer Toner Cartridges',
      desc: 'Bulk purchase of toner cartridges for floor printers.',
      justification: 'Running low on toner for the HP LaserJet printers.',
      priority: 'low', requester: paolo, dept: ops, deptCode: 'OPS', deptHead: opsHead,
      createdDaysAgo: 7, neededInDays: 10,
      stage: 'cancelled',
      cancelReason: 'Duplicate request — already covered by the quarterly office supplies order.',
      items: makeItems([
        { desc: 'HP 26A Black Toner Cartridge', qty: 10, unit: 'pcs', price: 4200 },
        { desc: 'HP 26A Color Toner Set (C/M/Y)', qty: 5, unit: 'sets', price: 12500 },
      ]),
    });

    // ─── DRAFT PRs ───
    createPrAtStage({
      title: 'Security Camera System Upgrade',
      desc: 'Replace aging CCTV system with modern IP cameras and NVR.',
      justification: 'Current analog cameras have poor image quality and no remote viewing.',
      priority: 'high', requester: nina, dept: ops, deptCode: 'OPS', deptHead: opsHead,
      createdDaysAgo: 1, neededInDays: 45,
      stage: 'draft',
      items: makeItems([
        { desc: 'Hikvision 4MP IP Camera', qty: 16, unit: 'units', price: 8500 },
        { desc: '32-Channel NVR with 8TB Storage', qty: 1, unit: 'unit', price: 45000 },
        { desc: 'Cat6 Cabling & Installation', qty: 1, unit: 'lot', price: 65000 },
      ]),
    });

    createPrAtStage({
      title: 'Recruitment Job Fair Materials',
      desc: 'Booth and materials for university job fair roadshow.',
      justification: 'Targeting 3 universities for engineering intern recruitment.',
      priority: 'medium', requester: grace, dept: hr, deptCode: 'HR', deptHead: hrHead,
      createdDaysAgo: 0, neededInDays: 30,
      stage: 'draft',
      items: makeItems([
        { desc: 'Pop-up Booth Display Stand', qty: 2, unit: 'units', price: 12000 },
        { desc: 'Company Brochures (500 copies)', qty: 500, unit: 'pcs', price: 45 },
        { desc: 'Branded Tote Bags (200 pcs)', qty: 200, unit: 'pcs', price: 180 },
        { desc: 'Portable Banner (2 designs)', qty: 2, unit: 'pcs', price: 5500 },
      ]),
    });

    // ─── More approved PRs for historical data spread ───
    createApprovedPr({
      title: 'Annual Office Supplies',
      desc: 'Quarterly bulk purchase of office supplies for all departments.',
      justification: 'Standard quarterly procurement per approved budget allocation.',
      priority: 'low', requester: paolo, dept: ops, deptCode: 'OPS', deptHead: opsHead,
      createdDaysAgo: 55, neededInDays: -25,
      items: makeItems([
        { desc: 'A4 Bond Paper (100 reams)', qty: 100, unit: 'reams', price: 280 },
        { desc: 'Ballpoint Pens (box of 50)', qty: 10, unit: 'boxes', price: 450 },
        { desc: 'Sticky Notes & Markers Assorted', qty: 1, unit: 'lot', price: 5500 },
        { desc: 'Folders, Binders & Filing Supplies', qty: 1, unit: 'lot', price: 8200 },
      ]),
    });

    createApprovedPr({
      title: 'Sales Team Tablets',
      desc: 'iPad Pro tablets for the field sales team for client presentations.',
      justification: 'Field team needs portable devices for live demos and contract signing.',
      priority: 'high', requester: ramon, dept: sal, deptCode: 'SAL', deptHead: salHead,
      createdDaysAgo: 28, neededInDays: 0,
      items: makeItems([
        { desc: 'iPad Pro 12.9" M2 256GB WiFi+Cellular', qty: 8, unit: 'units', price: 72000 },
        { desc: 'Apple Pencil (2nd Gen)', qty: 8, unit: 'units', price: 8500 },
        { desc: 'Logitech Combo Touch Keyboard Case', qty: 8, unit: 'units', price: 12000 },
      ]),
    });

    createApprovedPr({
      title: 'Recruitment Agency Retainer',
      desc: 'Monthly retainer for executive search firm for senior engineering hires.',
      justification: 'Internal recruitment cannot fill senior positions; agency has 85% success rate.',
      priority: 'high', requester: grace, dept: hr, deptCode: 'HR', deptHead: hrHead,
      createdDaysAgo: 38, neededInDays: -8,
      items: makeItems([
        { desc: 'Executive Search Retainer (6 months)', qty: 6, unit: 'months', price: 65000 },
        { desc: 'Background Check Services (per candidate)', qty: 20, unit: 'checks', price: 3500 },
      ]),
    });

    // ─── JOB REQUESTS ───
    console.log('\nCreating job requests...');

    const jrApprovedId = createApprovedPr({
      title: 'Office HVAC Maintenance and Repair',
      desc: 'Annual preventive maintenance and repair of all HVAC units in the building.',
      justification: 'Several units are underperforming. PM contract prevents costly breakdowns.',
      priority: 'high', requester: paolo, dept: ops, deptCode: 'OPS', deptHead: opsHead,
      createdDaysAgo: 20, neededInDays: 5,
      requestType: 'job_request', projectName: 'Building Maintenance 2026',
      items: makeItems([
        { desc: 'HVAC Preventive Maintenance (12 units)', qty: 12, unit: 'units', price: 5500 },
        { desc: 'Compressor Repair (2 units)', qty: 2, unit: 'units', price: 18000 },
        { desc: 'Refrigerant Recharge', qty: 4, unit: 'units', price: 3500 },
      ]),
    });

    createPrAtStage({
      title: 'Electrical Wiring Inspection and Repair',
      desc: 'Professional inspection and repair of electrical wiring in the server room.',
      justification: 'Building inspector flagged potential hazards during last audit.',
      priority: 'urgent', requester: nina, dept: ops, deptCode: 'OPS', deptHead: opsHead,
      createdDaysAgo: 3, neededInDays: 7,
      stage: 'submitted',
      requestType: 'job_request', projectName: 'Server Room Safety Upgrade',
      items: makeItems([
        { desc: 'Electrical Inspection & Testing', qty: 1, unit: 'lot', price: 25000 },
        { desc: 'Wiring Replacement (server room)', qty: 1, unit: 'lot', price: 85000 },
        { desc: 'Circuit Breaker Upgrade', qty: 4, unit: 'units', price: 12000 },
      ]),
    });

    createPrAtStage({
      title: 'Pest Control Service Contract',
      desc: 'Monthly pest control treatment for all office floors.',
      justification: 'Recent sightings reported by multiple employees.',
      priority: 'medium', requester: paolo, dept: ops, deptCode: 'OPS', deptHead: opsHead,
      createdDaysAgo: 1, neededInDays: 14,
      stage: 'draft',
      requestType: 'job_request',
      items: makeItems([
        { desc: 'Monthly Pest Control (6 months contract)', qty: 6, unit: 'months', price: 8000 },
        { desc: 'Initial Deep Treatment', qty: 1, unit: 'session', price: 15000 },
      ]),
    });

    // Add projectName to some existing PRs
    // (The 'Development Laptops' and 'Cloud Infrastructure' PRs)

    // ─── SUPPLIERS ───
    console.log('\nCreating suppliers...');
    const suppliers = await Supplier.insertMany([
      {
        companyName: 'TechHub Philippines Inc.',
        address: '123 IT Park, Cebu City, Philippines',
        taxType: 'vat', tin: '123-456-789-000',
        contactPerson: 'Michael Tan', contactNumber: '+63 917 123 4567', email: 'sales@techhub.ph',
        paymentTerms: 'Net 30', bankAccountName: 'TechHub Philippines Inc.', bankAccountNumber: '1234567890', bankName: 'BDO Unibank',
        status: 'active', createdBy: procurementUser._id,
      },
      {
        companyName: 'Office Depot Manila Corp.',
        address: '456 Makati Ave, Makati City, Philippines',
        taxType: 'vat', tin: '987-654-321-000',
        contactPerson: 'Anna Reyes', contactNumber: '+63 918 987 6543', email: 'orders@officedepot.ph',
        paymentTerms: 'Net 15', bankAccountName: 'Office Depot Manila Corp.', bankAccountNumber: '0987654321', bankName: 'BPI',
        status: 'active', createdBy: procurementUser._id,
      },
      {
        companyName: 'CloudServe Solutions',
        address: '789 BGC, Taguig City, Philippines',
        taxType: 'vat', tin: '456-789-123-000',
        contactPerson: 'David Cruz', contactNumber: '+63 920 456 7890', email: 'enterprise@cloudserve.ph',
        paymentTerms: 'Net 60', bankAccountName: 'CloudServe Solutions', bankAccountNumber: '5678901234', bankName: 'Metrobank',
        status: 'active', createdBy: accountingUser._id,
      },
      {
        companyName: 'FurnishPro Trading',
        address: '321 Ortigas Center, Pasig City, Philippines',
        taxType: 'vat', tin: '321-654-987-000',
        contactPerson: 'Rosa Santos', contactNumber: '+63 916 321 6549', email: 'sales@furnishpro.ph',
        paymentTerms: 'Net 30', bankAccountName: 'FurnishPro Trading', bankAccountNumber: '3216549870', bankName: 'Landbank',
        status: 'active', createdBy: procurementUser._id,
      },
      {
        companyName: 'PrintWorks Inc.',
        address: '555 Quezon Ave, Quezon City, Philippines',
        taxType: 'non_vat', tin: '555-111-222-000',
        contactPerson: 'Leo Bautista', contactNumber: '+63 919 555 1112', email: 'info@printworks.ph',
        paymentTerms: 'COD', bankAccountName: 'PrintWorks Inc.', bankAccountNumber: '5551112220', bankName: 'PNB',
        status: 'active', createdBy: procurementUser._id,
      },
      {
        companyName: 'Reliable HVAC Services',
        address: '888 Shaw Blvd, Mandaluyong City, Philippines',
        taxType: 'non_vat', tin: '888-222-333-000',
        contactPerson: 'Pedro Gomez', contactNumber: '+63 921 888 2223',
        paymentTerms: 'Net 15',
        status: 'active', notes: 'Preferred contractor for building maintenance', createdBy: procurementUser._id,
      },
      {
        companyName: 'Manila Electric Supply Co.',
        address: '100 EDSA, Mandaluyong City, Philippines',
        taxType: 'vat', tin: '100-200-300-000',
        contactPerson: 'Grace Lim', contactNumber: '+63 922 100 2003', email: 'sales@mesco.ph',
        paymentTerms: 'Net 30',
        status: 'inactive', notes: 'Previously reliable but slow delivery recently', createdBy: accountingUser._id,
      },
    ]);
    console.log(`  Created ${suppliers.length} suppliers`);

    // ─── PURCHASE ORDERS ───
    console.log('\nCreating purchase orders...');
    const poYear = new Date().getFullYear();
    let poSeq = 0;
    function nextPoNumber(): string {
      poSeq++;
      return `PO-${poYear}-${String(poSeq).padStart(5, '0')}`;
    }

    // Find the approved PRs to link POs to (use the first few)
    const approvedPrDocs = allPrs.filter(p => (p as any).status === 'approved');

    const allPos: mongoose.Document[] = [];

    // PO 1: Issued PO for Development Laptops
    if (approvedPrDocs[0]) {
      const pr = approvedPrDocs[0] as any;
      allPos.push(new PurchaseOrder({
        poNumber: nextPoNumber(),
        purchaseRequestId: pr._id,
        sourceRequestNumber: pr.prNumber,
        sourceRequestType: pr.requestType || 'purchase_request',
        supplierId: suppliers[0]._id,
        items: pr.items.map((item: any) => ({
          _id: new Types.ObjectId(),
          description: item.description, quantity: item.quantity, unit: item.unit,
          unitPrice: item.estimatedPrice, totalPrice: item.totalPrice,
        })),
        totalAmount: pr.totalAmount,
        canvassEntries: [
          { _id: new Types.ObjectId(), supplierId: suppliers[0]._id, supplierName: 'TechHub Philippines Inc.', quotedItems: [], totalQuotedAmount: pr.totalAmount, remarks: 'Best price, local warranty', isSelected: true },
          { _id: new Types.ObjectId(), supplierId: suppliers[2]._id, supplierName: 'CloudServe Solutions', quotedItems: [], totalQuotedAmount: pr.totalAmount * 1.08, remarks: 'Higher price but faster delivery', isSelected: false },
          { _id: new Types.ObjectId(), supplierId: suppliers[3]._id, supplierName: 'FurnishPro Trading', quotedItems: [], totalQuotedAmount: pr.totalAmount * 1.15, remarks: 'No tech specialization', isSelected: false },
        ],
        status: 'issued',
        createdBy: procurementUser._id,
        approvedBy: coo._id,
        approvedAt: daysAgo(40),
        issuedAt: daysAgo(38),
        remarks: 'Delivery expected within 2 weeks.',
      }));
    }

    // PO 2: Approved PO for Office Furniture
    if (approvedPrDocs[7]) {
      const pr = approvedPrDocs[7] as any;
      allPos.push(new PurchaseOrder({
        poNumber: nextPoNumber(),
        purchaseRequestId: pr._id,
        sourceRequestNumber: pr.prNumber,
        sourceRequestType: pr.requestType || 'purchase_request',
        supplierId: suppliers[3]._id,
        items: pr.items.map((item: any) => ({
          _id: new Types.ObjectId(),
          description: item.description, quantity: item.quantity, unit: item.unit,
          unitPrice: item.estimatedPrice, totalPrice: item.totalPrice,
        })),
        totalAmount: pr.totalAmount,
        canvassEntries: [
          { _id: new Types.ObjectId(), supplierId: suppliers[3]._id, supplierName: 'FurnishPro Trading', quotedItems: [], totalQuotedAmount: pr.totalAmount, remarks: 'Specializes in office furniture', isSelected: true },
          { _id: new Types.ObjectId(), supplierId: suppliers[1]._id, supplierName: 'Office Depot Manila Corp.', quotedItems: [], totalQuotedAmount: pr.totalAmount * 1.05, remarks: 'Slightly higher, longer lead time', isSelected: false },
        ],
        status: 'approved',
        createdBy: procurementUser._id,
        approvedBy: coo._id,
        approvedAt: daysAgo(15),
      }));
    }

    // PO 3: Submitted PO for Office Supplies
    if (approvedPrDocs[9]) {
      const pr = approvedPrDocs[9] as any;
      allPos.push(new PurchaseOrder({
        poNumber: nextPoNumber(),
        purchaseRequestId: pr._id,
        sourceRequestNumber: pr.prNumber,
        sourceRequestType: pr.requestType || 'purchase_request',
        supplierId: suppliers[1]._id,
        items: pr.items.map((item: any) => ({
          _id: new Types.ObjectId(),
          description: item.description, quantity: item.quantity, unit: item.unit,
          unitPrice: item.estimatedPrice, totalPrice: item.totalPrice,
        })),
        totalAmount: pr.totalAmount,
        status: 'submitted',
        createdBy: procurementUser._id,
      }));
    }

    // PO 4: Draft PO for HVAC Job Request
    if (jrApprovedId) {
      const jrPr = allPrs.find(p => (p as any)._id.equals(jrApprovedId)) as any;
      if (jrPr) {
        allPos.push(new PurchaseOrder({
          purchaseRequestId: jrPr._id,
          sourceRequestNumber: jrPr.prNumber,
          sourceRequestType: 'job_request',
          supplierId: suppliers[5]._id,
          projectName: 'Building Maintenance 2026',
          items: jrPr.items.map((item: any) => ({
            _id: new Types.ObjectId(),
            description: item.description, quantity: item.quantity, unit: item.unit,
            unitPrice: item.estimatedPrice, totalPrice: item.totalPrice,
          })),
          totalAmount: jrPr.totalAmount,
          status: 'draft',
          createdBy: procurementUser._id,
          remarks: 'Awaiting final quote confirmation from contractor.',
        }));
      }
    }

    // PO 5: Cancelled PO
    if (approvedPrDocs[2]) {
      const pr = approvedPrDocs[2] as any;
      allPos.push(new PurchaseOrder({
        poNumber: nextPoNumber(),
        purchaseRequestId: pr._id,
        sourceRequestNumber: pr.prNumber,
        sourceRequestType: pr.requestType || 'purchase_request',
        supplierId: suppliers[2]._id,
        items: pr.items.map((item: any) => ({
          _id: new Types.ObjectId(),
          description: item.description, quantity: item.quantity, unit: item.unit,
          unitPrice: item.estimatedPrice, totalPrice: item.totalPrice,
        })),
        totalAmount: pr.totalAmount,
        status: 'cancelled',
        createdBy: procurementUser._id,
        cancellationReason: 'Vendor unable to deliver within required timeframe. Re-procuring with alternative supplier.',
      }));
    }

    // ─── Insert all data ───
    console.log(`  Inserting ${allPrs.length} purchase requests (incl. job requests)...`);
    await PurchaseRequest.insertMany(allPrs);

    console.log(`  Inserting ${allPos.length} purchase orders...`);
    await PurchaseOrder.insertMany(allPos);

    console.log(`  Inserting ${allApprovals.length} approval records...`);
    await Approval.insertMany(allApprovals);

    console.log(`  Inserting ${allNotifications.length} notifications...`);
    await Notification.insertMany(allNotifications);

    // Update PR sequences
    for (const [code, count] of Object.entries(seqCounters)) {
      await PrSequence.create({ departmentCode: code, year, lastNumber: count });
    }
    console.log(`  Created PR sequences for ${Object.keys(seqCounters).length} departments`);

    // ─── Summary ───
    console.log('\n═══════════════════════════════════════════');
    console.log('  SEED COMPLETE');
    console.log('═══════════════════════════════════════════');
    console.log(`\n  Departments:         ${departments.length}`);
    console.log(`  Users:               ${users.length} (1 inactive)`);
    console.log(`  Suppliers:           ${suppliers.length}`);
    console.log(`  Purchase Requests:   ${allPrs.filter(p => (p as any).requestType !== 'job_request').length}`);
    console.log(`  Job Requests:        ${allPrs.filter(p => (p as any).requestType === 'job_request').length}`);
    console.log(`  Purchase Orders:     ${allPos.length}`);
    console.log(`  Approval Records:    ${allApprovals.length}`);
    console.log(`  Notifications:       ${allNotifications.length}`);
    console.log('\n  All passwords: Password@123');
    console.log('\n  ┌───────────────────────────────────────────────────────┐');
    console.log('  │ Test Accounts                                         │');
    console.log('  ├───────────────────────────────────────────────────────┤');
    console.log('  │ admin@prams.com              → Admin                  │');
    console.log('  │ ceo@prams.com                → CEO                    │');
    console.log('  │ coo@prams.com                → COO                    │');
    console.log('  │ accounting@prams.com          → Accounting Officer     │');
    console.log('  │ procurement@prams.com         → Procurement Officer    │');
    console.log('  │ eng.head@prams.com            → Dept Head (ENG)        │');
    console.log('  │ mkt.head@prams.com            → Dept Head (MKT)        │');
    console.log('  │ hr.head@prams.com             → Dept Head (HR)         │');
    console.log('  │ fin.head@prams.com            → Dept Head (FIN)        │');
    console.log('  │ ops.head@prams.com            → Dept Head (OPS)        │');
    console.log('  │ sal.head@prams.com            → Dept Head (SAL)        │');
    console.log('  │ juan.delacruz@prams.com       → Staff (ENG)            │');
    console.log('  │ diana.fernandez@prams.com     → Staff (MKT)            │');
    console.log('  │ grace.santos@prams.com        → Staff (HR)             │');
    console.log('  │ christine.navarro@prams.com   → Staff (FIN)            │');
    console.log('  │ paolo.castro@prams.com        → Staff (OPS)            │');
    console.log('  │ ramon.aguilar@prams.com       → Staff (SAL)            │');
    console.log('  └───────────────────────────────────────────────────────┘');
    console.log('\n  PR/JR Status Distribution:');
    console.log(`    Approved:   ${allPrs.filter(p => (p as any).status === 'approved').length}`);
    console.log(`    Submitted:  ${allPrs.filter(p => (p as any).status === 'submitted').length}`);
    console.log(`    In Review:  ${allPrs.filter(p => ['level1_review', 'level2_review', 'level3_review'].includes((p as any).status)).length}`);
    console.log(`    Rejected:   ${allPrs.filter(p => (p as any).status === 'rejected').length}`);
    console.log(`    Returned:   ${allPrs.filter(p => (p as any).status === 'returned').length}`);
    console.log(`    Cancelled:  ${allPrs.filter(p => (p as any).status === 'cancelled').length}`);
    console.log(`    Draft:      ${allPrs.filter(p => (p as any).status === 'draft').length}`);
    console.log('\n  PO Status Distribution:');
    console.log(`    Issued:     ${allPos.filter(p => (p as any).status === 'issued').length}`);
    console.log(`    Approved:   ${allPos.filter(p => (p as any).status === 'approved').length}`);
    console.log(`    Submitted:  ${allPos.filter(p => (p as any).status === 'submitted').length}`);
    console.log(`    Draft:      ${allPos.filter(p => (p as any).status === 'draft').length}`);
    console.log(`    Cancelled:  ${allPos.filter(p => (p as any).status === 'cancelled').length}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
