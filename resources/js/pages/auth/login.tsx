import React, { FormEvent, useMemo, useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
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
    [key: string]: string | undefined;
  };
}

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
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
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
        {/* Top-Right Return to Mousumi Apps Button */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
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
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
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

            <CardFooter className="justify-center border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-400">
                © {new Date().getFullYear()} HRM System
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
}
