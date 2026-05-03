/**
 * Visual screenshot capture for every page/viewport in the PRAMS app.
 *
 * Usage:
 *   npx playwright test audit/capture.ts --config audit/playwright.config.ts
 *
 * Prerequisites:
 *   - npm i -D @playwright/test && npx playwright install chromium
 *   - The app (API + web) must be running (docker compose up or npm run dev)
 *   - The database should be seeded (seed-full.ts)
 *
 * Auth strategy:
 *   For each role we log in via the API, then inject the Zustand-persisted
 *   localStorage key so every subsequent page load is authenticated.
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// ── Config ────────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const PASSWORD = 'Password@123';
const EXTRA_DELAY_MS = 800; // extra wait after network idle for animations

const VIEWPORTS = [
  { tag: 'desktop', width: 1440, height: 900 },
  { tag: 'tablet', width: 768, height: 1024 },
  { tag: 'mobile', width: 390, height: 844 },
] as const;

// Credentials per role — email is enough; password is shared
const CREDS: Record<string, string> = {
  admin: 'admin@wilsonworksph.com',
  ceo: 'ceo@wilsonworksph.com',
  coo: 'coo@wilsonworksph.com',
  dept_head: 'eng.head@wilsonworksph.com',
  staff: 'juan.delacruz@wilsonworksph.com',
  procurement: 'procurement@wilsonworksph.com',
  accounting: 'accounting@wilsonworksph.com',
};

// ── Types ─────────────────────────────────────────────────

interface RouteEntry {
  /** Unique screenshot name (used in filename) */
  name: string;
  /** URL path (may contain placeholders like <PR_ID>) */
  url: string;
  /** Which role to use */
  role: string;
  /** Optional: function to run after navigation (e.g. open a modal) */
  setup?: (page: Page) => Promise<void>;
  /** Override viewports for this entry (default: all three) */
  viewports?: typeof VIEWPORTS[number]['tag'][];
}

// ── Route list ────────────────────────────────────────────
// Placeholders like <PR_ID> are resolved at runtime by querying the API.

const ROUTES: RouteEntry[] = [
  // ── Public ──
  { name: 'login', url: '/login', role: '__none__' },
  { name: '403-forbidden', url: '/403', role: '__none__' },
  { name: '404-not-found', url: '/404', role: '__none__' },

  // ── Admin pages ──
  { name: 'dashboard-admin', url: '/dashboard', role: 'admin' },
  { name: 'users', url: '/users', role: 'admin' },
  { name: 'departments', url: '/departments', role: 'admin' },
  { name: 'department-detail', url: '/departments/<DEPT_ID>', role: 'admin' },
  { name: 'suppliers', url: '/suppliers', role: 'admin' },
  { name: 'supplier-new', url: '/suppliers/new', role: 'admin' },
  { name: 'supplier-detail', url: '/suppliers/<SUPPLIER_ID>', role: 'admin' },
  { name: 'supplier-edit', url: '/suppliers/<SUPPLIER_ID>/edit', role: 'admin' },
  { name: 'purchase-orders-admin', url: '/purchase-orders', role: 'admin' },
  { name: 'purchase-order-detail', url: '/purchase-orders/<PO_ID>', role: 'admin' },
  { name: 'purchase-requests-admin', url: '/purchase-requests', role: 'admin' },
  { name: 'purchase-request-detail', url: '/purchase-requests/<PR_ID>', role: 'admin' },
  { name: 'projects', url: '/projects', role: 'admin' },
  { name: 'procurement-queue', url: '/procurement', role: 'admin' },
  { name: 'procurement-workspace', url: '/procurement/<PROCUREMENT_PR_ID>', role: 'admin' },
  { name: 'settings', url: '/settings', role: 'admin' },
  { name: 'reports', url: '/reports', role: 'admin' },
  { name: 'search', url: '/search', role: 'admin' },
  { name: 'profile', url: '/profile', role: 'admin' },

  // ── Role-specific dashboards ──
  { name: 'dashboard-ceo', url: '/dashboard', role: 'ceo' },
  { name: 'dashboard-coo', url: '/dashboard', role: 'coo' },
  { name: 'dashboard-dept-head', url: '/dashboard', role: 'dept_head' },
  { name: 'dashboard-staff', url: '/dashboard', role: 'staff' },
  { name: 'dashboard-procurement', url: '/dashboard', role: 'procurement' },
  { name: 'dashboard-accounting', url: '/dashboard', role: 'accounting' },

  // ── Role-specific pages ──
  { name: 'approvals-ceo', url: '/approvals', role: 'ceo' },
  { name: 'approvals-dept-head', url: '/approvals', role: 'dept_head' },
  { name: 'pr-form-new', url: '/purchase-requests/new', role: 'staff' },
  { name: 'pr-form-edit', url: '/purchase-requests/<PR_ID>/edit', role: 'staff' },

  // ── Modal surfaces (desktop only for clarity) ──
  {
    name: 'modal-create-user',
    url: '/users',
    role: 'admin',
    viewports: ['desktop'],
    setup: async (page) => {
      await page.getByRole('button', { name: /add user/i }).click();
      await page.waitForTimeout(400);
    },
  },
  {
    name: 'modal-create-department',
    url: '/departments',
    role: 'admin',
    viewports: ['desktop'],
    setup: async (page) => {
      await page.getByRole('button', { name: /add department/i }).click();
      await page.waitForTimeout(400);
    },
  },
  {
    name: 'modal-add-project',
    url: '/projects',
    role: 'admin',
    viewports: ['desktop'],
    setup: async (page) => {
      await page.getByRole('button', { name: /new project/i }).click();
      await page.waitForTimeout(400);
    },
  },
  {
    name: 'modal-approval',
    url: '/approvals',
    role: 'ceo',
    viewports: ['desktop'],
    setup: async (page) => {
      // Click the first PR row in the approvals list
      const firstRow = page.locator('.pr-row-enter').first();
      if (await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        await firstRow.click();
        await page.waitForTimeout(800);
      }
    },
  },
  {
    name: 'modal-change-password',
    url: '/profile',
    role: 'admin',
    viewports: ['desktop'],
    setup: async (page) => {
      await page.getByRole('button', { name: /change password/i }).click();
      await page.waitForTimeout(400);
    },
  },
];

// ── Helpers ───────────────────────────────────────────────

/** Log in via API and return the localStorage payload for Zustand persist */
async function getAuthPayload(email: string): Promise<string> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status}`);
  const json = await res.json();
  const { user, tokens } = json.data;
  // Match the shape Zustand persist expects (see auth.store.ts partialize)
  return JSON.stringify({
    state: {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      isAuthenticated: true,
    },
    version: 0,
  });
}

/** Resolve placeholder IDs by querying the API */
async function resolveIds(token: string): Promise<Record<string, string>> {
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const ids: Record<string, string> = {};

  // Fetch one department
  try {
    const res = await fetch(`${API_URL}/departments?limit=1`, { headers });
    const json = await res.json();
    ids['<DEPT_ID>'] = json.data?.[0]?._id ?? '';
  } catch { ids['<DEPT_ID>'] = ''; }

  // Fetch one supplier
  try {
    const res = await fetch(`${API_URL}/suppliers?limit=1`, { headers });
    const json = await res.json();
    ids['<SUPPLIER_ID>'] = json.data?.[0]?._id ?? '';
  } catch { ids['<SUPPLIER_ID>'] = ''; }

  // Fetch one PO
  try {
    const res = await fetch(`${API_URL}/purchase-orders?limit=1`, { headers });
    const json = await res.json();
    ids['<PO_ID>'] = json.data?.[0]?._id ?? '';
  } catch { ids['<PO_ID>'] = ''; }

  // Fetch one PR (any status, for admin viewing)
  try {
    const res = await fetch(`${API_URL}/purchase-requests?limit=1`, { headers });
    const json = await res.json();
    ids['<PR_ID>'] = json.data?.[0]?._id ?? '';
  } catch { ids['<PR_ID>'] = ''; }

  // Fetch a PR in procurement-relevant status for the workspace
  try {
    const res = await fetch(`${API_URL}/purchase-requests?status=pending_quotation&limit=1`, { headers });
    const json = await res.json();
    ids['<PROCUREMENT_PR_ID>'] = json.data?.[0]?._id ?? ids['<PR_ID>'] ?? '';
  } catch { ids['<PROCUREMENT_PR_ID>'] = ids['<PR_ID>'] ?? ''; }

  return ids;
}

function resolveUrl(url: string, ids: Record<string, string>): string {
  let resolved = url;
  for (const [placeholder, id] of Object.entries(ids)) {
    resolved = resolved.replace(placeholder, id);
  }
  return resolved;
}

function screenshotDir(viewport: string): string {
  return path.join(__dirname, 'screenshots', viewport);
}

async function captureScreenshot(
  page: Page,
  name: string,
  viewport: string,
) {
  const dir = screenshotDir(viewport);
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({
    path: path.join(dir, `${name}.png`),
    fullPage: true,
  });
}

async function waitForPageReady(page: Page) {
  // Wait for DOM to be ready, then give extra time for data fetches + animations.
  // Avoid networkidle — some pages have long-polling or keep-alive connections.
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(2500);
}

// ── Auth payload cache ────────────────────────────────────

const authCache = new Map<string, string>();
let resolvedIds: Record<string, string> = {};

async function ensureAuth(role: string): Promise<string> {
  if (role === '__none__') return '';
  if (authCache.has(role)) return authCache.get(role)!;
  const payload = await getAuthPayload(CREDS[role]);
  authCache.set(role, payload);
  return payload;
}

// ── Test suite ────────────────────────────────────────────

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  // Pre-authenticate admin to resolve IDs
  const adminPayload = await getAuthPayload(CREDS.admin);
  authCache.set('admin', adminPayload);
  const parsed = JSON.parse(adminPayload);
  resolvedIds = await resolveIds(parsed.state.accessToken);

  console.log('Resolved IDs:', resolvedIds);
  console.log(`Capturing ${ROUTES.length} routes × ${VIEWPORTS.length} viewports`);
});

for (const route of ROUTES) {
  const viewportsForRoute = route.viewports
    ? VIEWPORTS.filter((v) => (route.viewports as string[]).includes(v.tag))
    : [...VIEWPORTS];

  for (const vp of viewportsForRoute) {
    test(`${route.name} @ ${vp.tag}`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: vp.tag === 'mobile' ? 3 : vp.tag === 'tablet' ? 2 : 1,
      });
      const page = await context.newPage();

      // Inject auth state if needed
      if (route.role !== '__none__') {
        const payload = await ensureAuth(route.role);
        await context.addInitScript((authPayload) => {
          localStorage.setItem('prams-auth', authPayload);
        }, payload);
      }

      // Navigate
      const url = resolveUrl(route.url, resolvedIds);
      await page.goto(`${BASE_URL}${url}`, { waitUntil: 'domcontentloaded' });
      await waitForPageReady(page);

      // Run optional setup (e.g. open modal)
      if (route.setup) {
        await route.setup(page);
        await waitForPageReady(page);
      }

      // Capture
      await captureScreenshot(page, route.name, vp.tag);

      await context.close();
    });
  }
}
