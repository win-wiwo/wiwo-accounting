export const UserRole = {
  ACCOUNTING: 'accounting',
  ADMIN: 'admin',
  CEO: 'ceo',
  COO: 'coo',
  DEPT_HEAD: 'dept_head',
  PROCUREMENT: 'procurement',
  STAFF: 'staff',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const USER_ROLES = Object.values(UserRole);

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ACCOUNTING]: 'Accounting Officer',
  [UserRole.ADMIN]: 'Admin',
  [UserRole.CEO]: 'CEO',
  [UserRole.COO]: 'COO',
  [UserRole.DEPT_HEAD]: 'Department Head',
  [UserRole.PROCUREMENT]: 'Procurement Officer',
  [UserRole.STAFF]: 'Staff',
};

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.STAFF]: 1,
  [UserRole.PROCUREMENT]: 2,
  [UserRole.DEPT_HEAD]: 3,
  [UserRole.ACCOUNTING]: 4,
  [UserRole.COO]: 5,
  [UserRole.CEO]: 6,
  [UserRole.ADMIN]: 7,
};
