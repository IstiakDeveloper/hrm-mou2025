import { ComboSelect } from '@/components/ComboSelect';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { branchComboSelectItems } from '@/lib/payroll-branches';
import { cn } from '@/lib/utils';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowRight,
    Building2,
    CheckCircle2,
    EyeIcon,
    EyeOffIcon,
    KeyRound,
    LayoutGrid,
    LockIcon,
    MapPin,
    ShieldCheck,
    UserIcon,
} from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

type LoginMode = 'staff' | 'branch';

interface BranchOption {
    id: number;
    name: string;
    branch_code?: string | null;
    is_head_office?: boolean;
}

interface LoginProps {
    branches: BranchOption[];
    errors: {
        login?: string;
        password?: string;
        branch_id?: string;
        pin?: string;
        [key: string]: string | undefined;
    };
}

export default function Login({ branches, errors }: LoginProps) {
    const [mode, setMode] = useState<LoginMode>('staff');
    const [showPassword, setShowPassword] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const [activeSlide, setActiveSlide] = useState(0);

    const { data, setData, post, processing, reset, transform } = useForm({
        mode: 'staff' as LoginMode,
        login: '',
        password: '',
        remember: true,
        branch_id: null as number | null,
        pin: '',
    });

    transform((formData) => ({
        ...formData,
        mode,
    }));

    const branchItems = useMemo(() => branchComboSelectItems(branches, { numericValue: true }), [branches]);

    const switchMode = (next: LoginMode) => {
        setMode(next);
        if (next === 'staff') {
            setData({
                mode: 'staff',
                branch_id: null,
                pin: '',
            });
        } else {
            setData({
                mode: 'branch',
                login: '',
                password: '',
                remember: false,
            });
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post(route('login.attempt'), {
            preserveScroll: true,
            onSuccess: () => reset('password', 'pin'),
        });
    };

    const formError = mode === 'staff' ? errors.login : errors.pin || errors.branch_id;

    const slides = [
        {
            title: 'Manage your workforce',
            highlight: 'in minutes',
            desc: 'Real-time biometric attendance, automated branch payroll, and seamless staff management all in one place.',
        },
        {
            title: 'Automated Payroll',
            highlight: 'with 1-click',
            desc: 'Calculate salary sheets, allowances, deductions, and print branch payslips effortlessly.',
        },
        {
            title: 'Branch Network &',
            highlight: 'Field Sync',
            desc: 'Real-time multi-branch synchronization, attendance geofencing, and centralized MIS reporting.',
        },
    ];

    return (
        <>
            <Head title="Log in — Mousumi HRM" />

            <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F6FAF7] px-4 py-8 selection:bg-emerald-500 selection:text-white sm:py-12">
                {/* Ambient Light Green Mesh Background Gradients */}
                <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                    <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-200/35 blur-3xl" />
                    <div className="absolute top-1/2 -right-32 h-[28rem] w-[28rem] rounded-full bg-teal-200/25 blur-3xl" />
                    <div className="absolute -bottom-24 left-1/3 h-80 w-80 rounded-full bg-emerald-100/50 blur-3xl" />
                </div>

                {/* Main Split-Card Container */}
                <div className="grid min-h-[640px] w-full max-w-5xl grid-cols-1 overflow-hidden rounded-3xl border border-emerald-100/80 bg-white shadow-[0_20px_60px_-15px_rgba(5,150,105,0.08),0_10px_30px_-10px_rgba(0,0,0,0.04)] lg:grid-cols-12">
                    {/* ================= LEFT COLUMN: SHOWCASE & VALUE PROPOSITION ================= */}
                    <div className="relative hidden flex-col justify-between border-b border-emerald-100/70 bg-gradient-to-br from-emerald-50/90 via-[#ECFDF5]/60 to-[#F0FDF4] p-8 sm:p-10 lg:col-span-5 lg:flex lg:border-r lg:border-b-0">
                        {/* Top Brand Identity */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
                                    <Building2 className="h-6 w-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-lg font-extrabold tracking-tight text-slate-900">MOUSUMI</span>
                                        <span className="rounded bg-emerald-600/10 px-1.5 py-0.5 text-xs font-bold tracking-wider text-emerald-700 uppercase">
                                            HRM
                                        </span>
                                    </div>
                                    <p className="text-[11px] font-medium text-slate-500">Workforce & Operations Management</p>
                                </div>
                            </div>

                            {/* Dynamic Headline with Emerald Highlight */}
                            <div className="pt-2">
                                <h2 className="text-2xl leading-snug font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                                    {slides[activeSlide].title}{' '}
                                    <span className="text-emerald-600 underline decoration-emerald-300 decoration-wavy decoration-2">
                                        {slides[activeSlide].highlight}
                                    </span>
                                </h2>
                                <p className="mt-2 text-xs leading-relaxed font-normal text-slate-600 sm:text-sm">{slides[activeSlide].desc}</p>
                            </div>
                        </div>

                        {/* Centerpiece Graphic Mockup (Tablet / Dashboard Isometric Card) */}
                        <div className="relative my-4 flex items-center justify-center py-2">
                            <div className="absolute inset-0 -z-0 rounded-full bg-emerald-200/30 blur-2xl" />

                            {/* Mini Tablet Mockup */}
                            <div className="relative z-10 w-full max-w-[320px] rounded-2xl border border-emerald-100/90 bg-white p-4 shadow-xl shadow-emerald-950/5">
                                {/* Tablet Window Header */}
                                <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5">
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                                        <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                                    </div>
                                    <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                                        Biometric Live
                                    </div>
                                </div>

                                {/* Dashboard Stats */}
                                <div className="space-y-2.5 text-xs">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                                            <span className="block text-[10px] font-medium text-slate-500">Present Today</span>
                                            <span className="text-base font-bold text-slate-800">98.4%</span>
                                            <span className="mt-0.5 flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600">
                                                ↑ +2.1% on-time
                                            </span>
                                        </div>
                                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-2.5">
                                            <span className="block text-[10px] font-medium text-emerald-800">Active Branches</span>
                                            <span className="text-base font-bold text-emerald-900">{branches.length || 42} Offices</span>
                                            <span className="mt-0.5 flex items-center gap-0.5 text-[9px] font-semibold text-emerald-700">
                                                ✓ All Synced
                                            </span>
                                        </div>
                                    </div>

                                    {/* Employee Sample Card */}
                                    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-2 shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600/10 text-[10px] font-bold text-emerald-700">
                                                HO
                                            </div>
                                            <div>
                                                <p className="text-[11px] leading-tight font-semibold text-slate-800">Branch & HO Staff</p>
                                                <p className="text-[9px] text-slate-400">Automated Attendance</p>
                                            </div>
                                        </div>
                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-semibold text-emerald-700">
                                            Active
                                        </span>
                                    </div>

                                    {/* Progress Indicator */}
                                    <div className="space-y-1 rounded-xl border border-slate-100 bg-slate-50 p-2">
                                        <div className="flex justify-between text-[10px] font-medium text-slate-500">
                                            <span>Monthly Payroll Process</span>
                                            <span className="font-bold text-emerald-600">Ready</span>
                                        </div>
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                                            <div className="h-full w-4/5 rounded-full bg-emerald-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating Instant Sync Badge */}
                            <div className="absolute -bottom-2 left-2 z-20 flex items-center gap-2 rounded-xl border border-emerald-100 bg-white/95 p-2.5 shadow-lg backdrop-blur-sm">
                                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500 text-white">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                </div>
                                <div>
                                    <div className="text-[11px] leading-none font-bold text-slate-900">Instant Sync</div>
                                    <div className="text-[9px] text-slate-500">Live Branch Updates</div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Carousel Navigation Dots */}
                        <div className="flex items-center justify-between pt-4">
                            <div className="flex items-center gap-1.5">
                                {slides.map((_, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setActiveSlide(idx)}
                                        className={cn(
                                            'h-2 rounded-full transition-all duration-300',
                                            activeSlide === idx ? 'w-6 bg-emerald-600' : 'w-2 bg-slate-300 hover:bg-slate-400',
                                        )}
                                        aria-label={`Go to slide ${idx + 1}`}
                                    />
                                ))}
                            </div>
                            <span className="text-[11px] font-medium text-slate-400">Enterprise Cloud</span>
                        </div>
                    </div>

                    {/* ================= RIGHT COLUMN: AUTHENTICATION FORM ================= */}
                    <div className="flex flex-col justify-between bg-white p-6 sm:p-10 lg:col-span-7 lg:p-12">
                        <div>
                            {/* Mobile Top Brand Header (< lg) */}
                            <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4 lg:hidden">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                                        <Building2 className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <span className="font-extrabold text-slate-900">MOUSUMI HRM</span>
                                        <p className="text-[10px] text-slate-500">HR & Payroll Suite</p>
                                    </div>
                                </div>
                                <Link
                                    href="/office-map"
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600"
                                >
                                    <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                                    Map
                                </Link>
                            </div>

                            {/* Form Header */}
                            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Sign In</h1>
                                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                            HRM Portal
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500 sm:text-sm">Sign in to access your staff portal or branch console</p>
                                </div>

                                <Link
                                    href="/office-map"
                                    className="group hidden flex-shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:border-emerald-500 hover:bg-emerald-50/50 hover:text-emerald-700 sm:inline-flex"
                                    title="Find Head Office, zones, and branches"
                                >
                                    <MapPin className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-emerald-600" />
                                    <span>Office Map</span>
                                </Link>
                            </div>

                            {/* Mode Switcher Segmented Pills */}
                            <div className="my-6">
                                <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                                    <button
                                        type="button"
                                        onClick={() => switchMode('staff')}
                                        className={cn(
                                            'flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 transition-all',
                                            mode === 'staff'
                                                ? 'border border-slate-200/60 bg-white font-bold text-emerald-800 shadow-sm'
                                                : 'text-slate-500 hover:text-slate-900',
                                        )}
                                    >
                                        <UserIcon className={cn('h-4 w-4', mode === 'staff' ? 'text-emerald-600' : 'text-slate-400')} />
                                        Staff Account
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => switchMode('branch')}
                                        className={cn(
                                            'flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 transition-all',
                                            mode === 'branch'
                                                ? 'border border-slate-200/60 bg-white font-bold text-emerald-800 shadow-sm'
                                                : 'text-slate-500 hover:text-slate-900',
                                        )}
                                    >
                                        <Building2 className={cn('h-4 w-4', mode === 'branch' ? 'text-emerald-600' : 'text-slate-400')} />
                                        Branch Access
                                    </button>
                                </div>
                            </div>

                            {/* Validation Alert */}
                            {formError && (
                                <Alert variant="destructive" className="mb-4">
                                    <AlertDescription>{formError}</AlertDescription>
                                </Alert>
                            )}

                            {/* Main Form */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {mode === 'staff' ? (
                                    <>
                                        {/* Username or Email Input */}
                                        <div className="space-y-1.5">
                                            <Label htmlFor="login" className="text-xs font-semibold text-slate-700">
                                                Username or email <span className="text-rose-500">*</span>
                                            </Label>
                                            <div className="relative">
                                                <UserIcon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                <Input
                                                    id="login"
                                                    type="text"
                                                    placeholder="e.g. username or email@mousumi.org"
                                                    value={data.login}
                                                    onChange={(e) => setData('login', e.target.value)}
                                                    className="h-11 rounded-xl border-slate-200 pl-10 text-sm font-medium transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                                                    required
                                                    autoComplete="username"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>

                                        {/* Password Input */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                                                    Password <span className="text-rose-500">*</span>
                                                </Label>
                                            </div>
                                            <div className="relative">
                                                <LockIcon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                <Input
                                                    id="password"
                                                    type={showPassword ? 'text' : 'password'}
                                                    placeholder="Enter your security password"
                                                    value={data.password}
                                                    onChange={(e) => setData('password', e.target.value)}
                                                    className="h-11 rounded-xl border-slate-200 pr-11 pl-10 text-sm font-medium transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                                                    required
                                                    autoComplete="current-password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword((v) => !v)}
                                                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 transition-colors hover:text-slate-600"
                                                >
                                                    {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                                                </button>
                                            </div>
                                            {errors.password && <span className="text-destructive text-xs">{errors.password}</span>}
                                        </div>

                                        {/* Remember me & Helper */}
                                        <div className="flex items-center justify-between pt-1">
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    id="remember"
                                                    checked={data.remember}
                                                    onCheckedChange={(checked) => setData('remember', checked === true)}
                                                    className="rounded border-slate-300 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600"
                                                />
                                                <Label htmlFor="remember" className="cursor-pointer text-xs font-medium text-slate-600 select-none">
                                                    Keep me signed in
                                                </Label>
                                            </div>
                                            <span className="text-[11px] text-slate-400">30 days session</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Branch ComboSelect */}
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-700">
                                                Select Branch Office <span className="text-rose-500">*</span>
                                            </Label>
                                            <ComboSelect
                                                value={data.branch_id}
                                                onChange={(value) => setData('branch_id', value as number | null)}
                                                items={branchItems}
                                                placeholder="Search branch name or code…"
                                                className="w-full"
                                            />
                                            {branches.length === 0 && (
                                                <p className="text-xs text-amber-600">
                                                    No branch is set up for PIN login yet. Ask admin to set a branch PIN.
                                                </p>
                                            )}
                                        </div>

                                        {/* Branch PIN Input */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="pin" className="text-xs font-semibold text-slate-700">
                                                    Branch Terminal PIN <span className="text-rose-500">*</span>
                                                </Label>
                                                <span className="text-[11px] text-slate-400">4–12 digits</span>
                                            </div>
                                            <div className="relative">
                                                <KeyRound className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                <Input
                                                    id="pin"
                                                    type={showPin ? 'text' : 'password'}
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    placeholder="Enter 4–12 digit PIN"
                                                    value={data.pin}
                                                    onChange={(e) => setData('pin', e.target.value.replace(/\D/g, ''))}
                                                    className="h-11 rounded-xl border-slate-200 pr-11 pl-10 font-mono text-sm tracking-widest transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                                                    required
                                                    maxLength={12}
                                                    autoComplete="off"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPin((v) => !v)}
                                                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 transition-colors hover:text-slate-600"
                                                >
                                                    {showPin ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Terms / Security notice */}
                                <p className="pt-1 text-[11px] leading-relaxed text-slate-400">
                                    By signing in, you agree to Mousumi HRM organizational security protocols and access guidelines.
                                </p>

                                {/* Primary Action Button */}
                                <div className="pt-2">
                                    <Button
                                        type="submit"
                                        className="group h-11 w-full rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-700 hover:shadow-emerald-600/35 active:bg-emerald-800"
                                        disabled={processing || (mode === 'branch' && branches.length === 0)}
                                    >
                                        <span>
                                            {processing ? 'Signing in…' : mode === 'staff' ? 'Continue to Dashboard' : 'Enter Branch Terminal'}
                                        </span>
                                        <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                    </Button>
                                </div>
                            </form>

                            {/* Divider (Matching reference image "Or continue with") */}
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-100" />
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="bg-white px-3 font-medium text-slate-400">Or quick access</span>
                                </div>
                            </div>

                            {/* Quick Access Ecosystem Buttons */}
                            <div className="grid grid-cols-2 gap-3">
                                <Link
                                    href="/office-map"
                                    className="group flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-50/40 hover:text-emerald-800"
                                >
                                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 transition-transform group-hover:scale-110">
                                        <MapPin className="h-3.5 w-3.5" />
                                    </div>
                                    <span>Office Map</span>
                                </Link>

                                <a
                                    href="https://app.mousumibd.org"
                                    target="_self"
                                    className="group flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-sky-300 hover:bg-sky-50/40 hover:text-sky-800"
                                >
                                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-sky-100 text-sky-700 transition-transform group-hover:rotate-12">
                                        <LayoutGrid className="h-3.5 w-3.5" />
                                    </div>
                                    <span>Mousumi Apps</span>
                                </a>
                            </div>
                        </div>

                        {/* Footer Security Badges */}
                        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-6 text-[11px] text-slate-400">
                            <div className="flex items-center gap-1.5">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                                <span>256-bit SSL Encrypted</span>
                            </div>
                            <span>© {new Date().getFullYear()} Mousumi HRM</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
