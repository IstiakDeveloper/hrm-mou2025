<<<<<<< HEAD
import React, { FormEvent, useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
=======
import React, { FormEvent, useMemo, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
>>>>>>> feature/flutter-mobile-app
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
<<<<<<< HEAD
import { EyeIcon, EyeOffIcon, UserIcon, LockIcon } from 'lucide-react';

interface LoginProps {
  errors: {
    email?: string;
    password?: string;
=======
import { ComboSelect } from '@/components/ComboSelect';
import { branchComboSelectItems } from '@/lib/payroll-branches';
import { cn } from '@/lib/utils';
import {
  Building2,
  EyeIcon,
  EyeOffIcon,
  KeyRound,
  LockIcon,
  UserIcon,
  LayoutGrid,
  MapPin,
} from 'lucide-react';

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
>>>>>>> feature/flutter-mobile-app
    [key: string]: string | undefined;
  };
}

<<<<<<< HEAD
export default function Login({ errors }: LoginProps) {
  const { data, setData, post, processing, reset } = useForm({
    email: '',
    password: '',
    remember: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
=======
export default function Login({ branches, errors }: LoginProps) {
  const [mode, setMode] = useState<LoginMode>('staff');
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);

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

  const branchItems = useMemo(
    () => branchComboSelectItems(branches, { numericValue: true }),
    [branches],
  );

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
>>>>>>> feature/flutter-mobile-app
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
<<<<<<< HEAD
    setLoginError(null);

    post(route('login.attempt'), {
      onError: (errors) => {
        if (errors.email) {
          setLoginError(errors.email);
        }
      }
    });
  };

  return (
    <>
      <Head title="Log in" />
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Header */}
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
              HRM System
            </h2>
            <p className="text-center text-sm text-gray-600">
              Welcome back! Please sign in to your account
            </p>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-xl">Sign in</CardTitle>
              <CardDescription>
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loginError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{loginError}</AlertDescription>
=======
    post(route('login.attempt'), {
      preserveScroll: true,
      onSuccess: () => reset('password', 'pin'),
    });
  };

  const formError = mode === 'staff' ? errors.login : errors.pin || errors.branch_id;

  return (
    <>
      <Head title="Log in" />
      <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 px-4 py-10">
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between gap-2 sm:top-6 sm:left-6 sm:right-6">
          <Link
            href="/office-map"
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 p-2 text-xs font-bold text-white shadow-lg transition-colors hover:bg-emerald-800 sm:px-3.5 sm:py-2"
            title="Office Map — find branches"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-white/20 p-0.5 text-white shadow-sm transition-transform duration-300 group-hover:scale-110">
              <MapPin className="h-3.5 w-3.5" />
            </div>
            <span className="tracking-wide">Office Map</span>
          </Link>
          <a
            href="https://app.mousumibd.org"
            target="_self"
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 p-2 text-xs font-bold text-white shadow-lg transition-colors hover:bg-sky-600 sm:px-3.5 sm:py-2 dark:bg-sky-600 dark:hover:bg-sky-500"
            title="Return to Mousumi Apps Launcher"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-sky-500 p-0.5 text-white shadow-sm transition-transform duration-300 group-hover:rotate-12 dark:bg-white/20">
              <LayoutGrid className="h-3.5 w-3.5" />
            </div>
            <span className="hidden tracking-wide sm:inline">Mousumi Apps</span>
          </a>
        </div>
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
              <Building2 className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">HRM System</h1>
            <p className="text-sm text-slate-500">Sign in to continue</p>
          </div>

          <Card className="border-slate-200/80 shadow-xl shadow-slate-200/50">
            <CardHeader className="pb-4 space-y-4">
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => switchMode('staff')}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all',
                    mode === 'staff'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800',
                  )}
                >
                  <UserIcon className="h-4 w-4" />
                  Staff Login
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('branch')}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all',
                    mode === 'branch'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800',
                  )}
                >
                  <Building2 className="h-4 w-4" />
                  Branch Login
                </button>
              </div>

              <div>
                <CardTitle className="text-lg">
                  {mode === 'staff' ? 'Staff account' : 'Branch access'}
                </CardTitle>
                <CardDescription>
                  {mode === 'staff'
                    ? 'Use your username or email with password'
                    : 'Select your branch and enter the branch PIN'}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              {formError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{formError}</AlertDescription>
>>>>>>> feature/flutter-mobile-app
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
<<<<<<< HEAD
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <UserIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={data.email}
                      onChange={(e) => setData('email', e.target.value)}
                      className="pl-10"
                      required
                      autoComplete="username"
                    />
                  </div>
                  {errors.email && (
                    <span className="text-sm text-destructive">{errors.email}</span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <a
                      href="#"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <LockIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={data.password}
                      onChange={(e) => setData('password', e.target.value)}
                      className="pl-10 pr-10"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOffIcon className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <span className="text-sm text-destructive">{errors.password}</span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={data.remember}
                    onCheckedChange={(checked) =>
                      setData('remember', checked === true)
                    }
                  />
                  <Label
                    htmlFor="remember"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Remember me
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={processing}
                >
                  {processing ? (
                    <div className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Signing in...
                    </div>
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col">
              <p className="mt-4 text-center text-sm text-gray-600">
                © {new Date().getFullYear()} HRM System. All rights reserved.
=======
                {mode === 'staff' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="login">Username or email</Label>
                      <div className="relative">
                        <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="login"
                          type="text"
                          placeholder="username or email"
                          value={data.login}
                          onChange={(e) => setData('login', e.target.value)}
                          className="pl-9 h-10"
                          required
                          autoComplete="username"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <LockIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter password"
                          value={data.password}
                          onChange={(e) => setData('password', e.target.value)}
                          className="pl-9 pr-10 h-10"
                          required
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.password && (
                        <span className="text-sm text-destructive">{errors.password}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="remember"
                        checked={data.remember}
                        onCheckedChange={(checked) => setData('remember', checked === true)}
                      />
                      <Label htmlFor="remember" className="text-sm font-normal text-slate-600">
                        Remember me
                      </Label>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Branch</Label>
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

                    <div className="space-y-2">
                      <Label htmlFor="pin">Branch PIN</Label>
                      <div className="relative">
                        <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="pin"
                          type={showPin ? 'text' : 'password'}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="Enter 4–12 digit PIN"
                          value={data.pin}
                          onChange={(e) => setData('pin', e.target.value.replace(/\D/g, ''))}
                          className="pl-9 pr-10 h-10 tracking-[0.2em] font-mono"
                          required
                          maxLength={12}
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin((v) => !v)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                        >
                          {showPin ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 font-semibold"
                  disabled={processing || (mode === 'branch' && branches.length === 0)}
                >
                  {processing ? 'Signing in…' : mode === 'staff' ? 'Sign in' : 'Enter branch'}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex-col gap-3 border-t border-slate-100 pt-4">
              <Link
                href="/office-map"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition-colors hover:border-emerald-300 hover:bg-emerald-100"
              >
                <MapPin className="h-4 w-4" />
                View office map
              </Link>
              <p className="text-center text-xs text-slate-500">
                Find Head Office, zones, and branches — no login needed
              </p>
              <p className="text-xs text-slate-400">
                © {new Date().getFullYear()} HRM System
>>>>>>> feature/flutter-mobile-app
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
}
