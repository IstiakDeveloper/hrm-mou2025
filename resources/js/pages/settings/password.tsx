import InputError from '@/components/input-error';
import AdminLayout from '@/layouts/AdminLayout';
import SettingsLayout from '@/layouts/settings/layout';
import { Transition } from '@headlessui/react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { CheckCircle, EyeIcon, EyeOffIcon, KeyRound } from 'lucide-react';
import { FormEventHandler, useRef, useState } from 'react';

import HeadingSmall from '@/components/heading-small';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BranchInfo {
    id: number;
    name: string;
    branch_code?: string | null;
}

interface PasswordProps {
    loginId?: string;
    isBranchAccount?: boolean;
    branch?: BranchInfo | null;
}

export default function Password({ loginId, isBranchAccount = false, branch }: PasswordProps) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);
    const flash = (usePage().props as { flash?: { success?: string } }).flash;
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword: FormEventHandler = (e) => {
        e.preventDefault();

        put(route('settings.password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (formErrors) => {
                if (formErrors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (formErrors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    const handlePinInput = (field: 'current_password' | 'password' | 'password_confirmation', val: string) => {
        if (isBranchAccount) {
            setData(field, val.replace(/\D/g, ''));
        } else {
            setData(field, val);
        }
    };

    return (
        <AdminLayout>
            <Head title={isBranchAccount ? 'Change Branch PIN' : 'Change password'} />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title={isBranchAccount ? 'Change Branch Login PIN' : 'Change password'}
                        description={
                            isBranchAccount
                                ? 'Update the 4–12 digit PIN used to sign into this branch portal'
                                : 'Update the password you use with your Employee ID / username to sign in'
                        }
                    />

                    {isBranchAccount && branch && (
                        <Alert className="border-emerald-200 bg-emerald-50">
                            <KeyRound className="h-4 w-4 text-emerald-700" />
                            <AlertDescription className="text-emerald-800">
                                Branch: <span className="font-semibold">{branch.name}</span> {branch.branch_code ? `(${branch.branch_code})` : ''}. After saving, select this branch and enter the new PIN on the Branch Login screen.
                            </AlertDescription>
                        </Alert>
                    )}

                    {!isBranchAccount && loginId && (
                        <Alert className="border-emerald-200 bg-emerald-50">
                            <KeyRound className="h-4 w-4 text-emerald-700" />
                            <AlertDescription className="text-emerald-800">
                                Your login ID is <span className="font-semibold">{loginId}</span>. After saving, use this ID and the new password on the Staff Login screen.
                            </AlertDescription>
                        </Alert>
                    )}

                    {(flash?.success || recentlySuccessful) && (
                        <Alert className="border-green-200 bg-green-50">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-700">
                                {flash?.success || (isBranchAccount ? 'Branch login PIN updated successfully.' : 'Password updated successfully.')}
                            </AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={updatePassword} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="current_password">
                                {isBranchAccount ? 'Current Branch PIN' : 'Current password'}
                            </Label>

                            <div className="relative">
                                <Input
                                    id="current_password"
                                    ref={currentPasswordInput}
                                    value={data.current_password}
                                    onChange={(e) => handlePinInput('current_password', e.target.value)}
                                    type={showCurrent ? 'text' : 'password'}
                                    className="mt-1 block w-full pr-10"
                                    autoComplete="current-password"
                                    placeholder={isBranchAccount ? 'Enter current 4–12 digit PIN' : 'Current password'}
                                    maxLength={isBranchAccount ? 12 : undefined}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrent((v) => !v)}
                                    className="absolute inset-y-0 right-0 mt-1 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                                >
                                    {showCurrent ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                                </button>
                            </div>

                            <InputError message={errors.current_password} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">
                                {isBranchAccount ? 'New Branch PIN' : 'New password'}
                            </Label>

                            <div className="relative">
                                <Input
                                    id="password"
                                    ref={passwordInput}
                                    value={data.password}
                                    onChange={(e) => handlePinInput('password', e.target.value)}
                                    type={showNew ? 'text' : 'password'}
                                    className="mt-1 block w-full pr-10"
                                    autoComplete="new-password"
                                    placeholder={isBranchAccount ? '4–12 numeric digits' : 'At least 4 characters'}
                                    maxLength={isBranchAccount ? 12 : undefined}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNew((v) => !v)}
                                    className="absolute inset-y-0 right-0 mt-1 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                                >
                                    {showNew ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                                </button>
                            </div>

                            <InputError message={errors.password} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password_confirmation">
                                {isBranchAccount ? 'Confirm New Branch PIN' : 'Confirm new password'}
                            </Label>

                            <div className="relative">
                                <Input
                                    id="password_confirmation"
                                    value={data.password_confirmation}
                                    onChange={(e) => handlePinInput('password_confirmation', e.target.value)}
                                    type={showConfirm ? 'text' : 'password'}
                                    className="mt-1 block w-full pr-10"
                                    autoComplete="new-password"
                                    placeholder={isBranchAccount ? 'Re-enter new branch PIN' : 'Re-enter new password'}
                                    maxLength={isBranchAccount ? 12 : undefined}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm((v) => !v)}
                                    className="absolute inset-y-0 right-0 mt-1 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                                >
                                    {showConfirm ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                                </button>
                            </div>

                            <InputError message={errors.password_confirmation} />
                            {data.password && data.password_confirmation && data.password !== data.password_confirmation && (
                                <p className="text-sm text-destructive">
                                    {isBranchAccount ? 'PINs do not match' : 'Passwords do not match'}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-4">
                            <Button
                                disabled={
                                    processing ||
                                    !data.current_password ||
                                    !data.password ||
                                    !data.password_confirmation ||
                                    data.password !== data.password_confirmation ||
                                    (isBranchAccount && (data.password.length < 4 || data.password.length > 12))
                                }
                            >
                                {processing ? 'Saving…' : isBranchAccount ? 'Save PIN' : 'Save password'}
                            </Button>

                            <Transition
                                show={recentlySuccessful}
                                enter="transition ease-in-out"
                                enterFrom="opacity-0"
                                leave="transition ease-in-out"
                                leaveTo="opacity-0"
                            >
                                <p className="text-sm text-neutral-600">Saved</p>
                            </Transition>
                        </div>
                    </form>
                </div>
            </SettingsLayout>
        </AdminLayout>
    );
}
