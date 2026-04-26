import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@prams/shared';
import { useAuthStore } from '@/stores/auth.store';
import apiClient from '@/lib/api-client';
import { Eye, EyeOff, Loader2, FileText, CheckSquare, ClipboardList, ShoppingCart } from 'lucide-react';
import wiwoLogo from '@/assets/wilsonworks.png';

// ── Mock data for the animated hero preview ───────────────

const MOCK_PRS = [
  { title: 'CCTV Camera System — Busway', dept: 'Operations', amount: '₱145,000', status: 'Approved' },
  { title: 'Office Supplies Q4 2024', dept: 'Admin', amount: '₱23,400', status: 'For Review' },
  { title: 'Network Equipment Upgrade', dept: 'IT', amount: '₱380,000', status: 'Pending' },
  { title: 'Safety Equipment Set', dept: 'Operations', amount: '₱67,500', status: 'Issued' },
  { title: 'Server Infrastructure Upgrade', dept: 'IT', amount: '₱920,000', status: 'For Review' },
];

const STATUS: Record<string, { bg: string; text: string; dot: string }> = {
  Approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  'For Review': { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400' },
  Pending: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  Issued: { bg: 'bg-violet-500/10', text: 'text-violet-400', dot: 'bg-violet-400' },
};

const BARS = [38, 62, 48, 78, 55, 88, 68, 50, 72, 84, 60, 42];
const TRUST = [
  { icon: FileText, label: 'Purchase Requests' },
  { icon: CheckSquare, label: 'Approvals' },
  { icon: ClipboardList, label: 'Procurement Queue' },
  { icon: ShoppingCart, label: 'Purchase Orders' },
];

// ── Sub-components ────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS[status] ?? STATUS['Pending'];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
}

function AnimatedMockup() {
  return (
    <div className="relative w-full select-none">
      {/* Floating secondary KPI card */}
      <div
        className="hero-anim absolute -top-5 right-4 z-10 rounded-xl border border-white/10 bg-white/[0.07] px-4 py-3 shadow-lg backdrop-blur-sm"
        style={{ animation: 'heroFloat2 14s ease-in-out 1.5s infinite' }}
        aria-hidden
      >
        <p className="text-[10px] uppercase tracking-widest text-white/30">Pending Value</p>
        <p className="mt-0.5 text-lg font-bold text-white">₱1.54M</p>
        <p className="mt-0.5 text-[10px] text-amber-400">↑ 8 awaiting approval</p>
      </div>

      {/* Main dashboard card */}
      <div
        className="hero-anim relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm"
        style={{ animation: 'heroFloat 13s ease-in-out infinite' }}
        aria-hidden
      >
        {/* Light sweep */}
        <div
          className="hero-anim pointer-events-none absolute inset-y-0 w-1/3"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.035) 50%, transparent 100%)',
            animation: 'heroShimmer 9s ease-in-out 2s infinite',
          }}
        />

        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Purchase Requests</p>
            <p className="mt-0.5 text-2xl font-bold text-white">37 <span className="text-sm font-normal text-white/30">total</span></p>
          </div>
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-[10px] text-white/30">Pending</p>
              <p className="text-base font-semibold text-amber-400">8</p>
            </div>
            <div>
              <p className="text-[10px] text-white/30">Approved</p>
              <p className="text-base font-semibold text-emerald-400">20</p>
            </div>
          </div>
        </div>

        {/* PR rows */}
        <div className="space-y-1.5">
          {MOCK_PRS.map((pr, i) => (
            <div
              key={pr.title}
              className="hero-anim flex items-center gap-3 rounded-lg bg-white/[0.04] px-3 py-2.5"
              style={{ animation: `heroFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) ${0.1 + i * 0.1}s both` }}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-white/75">{pr.title}</p>
                <p className="mt-0.5 text-[10px] text-white/25">{pr.dept}</p>
              </div>
              <span className="shrink-0 text-[11px] tabular-nums text-white/40">{pr.amount}</span>
              <StatusPill status={pr.status} />
            </div>
          ))}
        </div>

        {/* Mini bar chart */}
        <div className="mt-4 border-t border-white/[0.06] pt-4">
          <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-white/25">Monthly Volume</p>
          <div className="flex h-10 items-end gap-[3px]">
            {BARS.map((h, i) => (
              <div
                key={i}
                className="hero-anim flex-1 origin-bottom rounded-sm"
                style={{
                  height: `${h}%`,
                  backgroundColor: i === 9 ? 'rgba(255,255,255,0.55)' : `rgba(255,255,255,${0.15 + (h / 100) * 0.2})`,
                  animation: `heroBarGrow 1.1s cubic-bezier(0.25,1,0.5,1) ${0.04 * i}s both`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main login page ───────────────────────────────────────

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setError('');
    try {
      const response = await apiClient.post('/auth/login', data);
      const { user, tokens } = response.data.data;
      setAuth(user, tokens.accessToken, tokens.refreshToken);
      navigate('/dashboard');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setError(axiosErr.response?.data?.message || 'Login failed');
      } else {
        setError('Network error. Please try again.');
      }
    }
  };

  return (
    <div className="flex min-h-screen">

      {/* ── Hero Panel (lg+) ─────────────────────────────── */}
      <div className="relative hidden overflow-hidden lg:flex lg:w-[58%] xl:w-[60%] flex-col bg-[#131313]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 90% 70% at 55% 48%, rgba(255,255,255,0.05) 0%, transparent 62%)' }}
          aria-hidden
        />
        <div className="relative flex flex-1 flex-col justify-between p-12 xl:p-16">
          <div className="flex items-center gap-2.5">
            <img src={wiwoLogo} alt="Wilson Works" className="h-12 rounded" />
          </div>
          <div className="space-y-10">
            <div className="max-w-[440px] space-y-4">
              <h1 className="text-[28px] font-bold leading-[1.25] tracking-tight text-white xl:text-[34px]">
                Procurement, approvals, and purchase orders in one workspace.
              </h1>
              <p className="text-[14px] leading-relaxed text-white/45">
                Track requests, approvals, supplier sourcing, and purchase orders with a clean workflow built for fast-moving teams.
              </p>
            </div>
            <AnimatedMockup />
          </div>
          <div className="flex flex-wrap gap-2">
            {TRUST.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5">
                <Icon className="h-3 w-3 text-white/35" />
                <span className="text-[11px] text-white/45">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Login Form Panel ─────────────────────────────── */}
      <div className="login-panel-bg relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-12">

        {/* Ambient depth glow */}
        <div className="login-glow login-anim" aria-hidden />

        {/* Mobile branding */}
        <div className="relative mb-10 flex flex-col items-center gap-2 lg:hidden">
          <img src={wiwoLogo} alt="Wilson Works" className="h-9 rounded" />
          <span className="text-base font-bold tracking-tight text-zinc-900">WIWO PR</span>
          <span className="text-[13px] text-zinc-500">Procurement &amp; Requisition</span>
        </div>

        {/* Form wrapper */}
        <div
          className="login-anim relative w-full max-w-[440px]"
          style={{ animation: 'loginSlideUp 0.6s cubic-bezier(0.16,1,0.3,1) both' }}
        >

          {/* Card */}
          <div className="login-card">
            <div className="login-card-rule" />

            <div className="px-11 py-10">

              {/* Brand + heading */}
              <div
                className="login-anim mb-8"
                style={{ animation: 'loginSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.05s both' }}
              >
                <div className="mb-5 hidden items-center gap-2.5 lg:flex">
                  {/*<img src={wiwoLogo} alt="WIWO" className="h-5 rounded opacity-60" />*/}
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Wilson Works
                  </span>
                </div>
                <h2 className="text-[26px] font-bold tracking-[-0.01em] text-zinc-900">
                  Welcome back
                </h2>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-zinc-500">
                  Sign in to access your procurement workspace.
                </p>
              </div>

              <div className="login-divider" />

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-[18px]">

                {error && (
                  <div
                    className="login-anim rounded-xl border border-red-100 bg-red-50/80 px-4 py-3 text-[13px] text-red-600"
                    style={{ animation: 'loginSlideUp 0.3s ease-out both' }}
                  >
                    {error}
                  </div>
                )}

                {/* Email */}
                <div
                  className="login-anim space-y-2"
                  style={{ animation: 'loginSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.10s both' }}
                >
                  <label
                    htmlFor="email"
                    className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="you@wilsonworks.com"
                    autoComplete="email"
                    autoFocus
                    className="login-input"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-[11px] text-red-500">{errors.email.message}</p>
                  )}
                </div>

                {/* Password */}
                <div
                  className="login-anim space-y-2"
                  style={{ animation: 'loginSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.17s both' }}
                >
                  <label
                    htmlFor="password"
                    className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="login-input pr-12"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors duration-200 hover:text-zinc-700"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[11px] text-red-500">{errors.password.message}</p>
                  )}
                </div>

                {/* Submit */}
                <div
                  className="login-anim pt-[6px]"
                  style={{ animation: 'loginSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.24s both' }}
                >
                  <button type="submit" disabled={isSubmitting} className="login-btn">
                    <span className="login-btn-sheen" aria-hidden />
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Footer */}
          <div
            className="login-anim mt-5 flex flex-col items-center gap-2"
            style={{ animation: 'loginSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.30s both' }}
          >
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 opacity-80" />
              <span className="text-[11px] text-zinc-500">Secured internal access</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Contact your administrator if you need an account.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
