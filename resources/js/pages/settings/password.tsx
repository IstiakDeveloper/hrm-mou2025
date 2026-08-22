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

export default function Password({ loginId }: { loginId?: string }) {
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

    return (
        <AdminLayout>
            <Head title="Change password" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title="Change password"
                        description="Update the password you use with your Employee ID / username to sign in"
                    />

                    {loginId && (
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
                                {flash?.success || 'Password updated successfully.'}
                            </AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={updatePassword} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="current_password">Current password</Label>

                            <div className="relative">
                                <Input
                                    id="current_password"
                                    ref={currentPasswordInput}
                                    value={data.current_password}
                                    onChange={(e) => setData('current_password', e.target.value)}
                                    type={showCurrent ? 'text' : 'password'}
                                    className="mt-1 block w-full pr-10"
                                    autoComplete="current-password"
                                    placeholder="Current password"
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
                            <Label htmlFor="password">New password</Label>

                            <div className="relative">
                                <Input
                                    id="password"
                                    ref={passwordInput}
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    type={showNew ? 'text' : 'password'}
                                    className="mt-1 block w-full pr-10"
                                    autoComplete="new-password"
                                    placeholder="At least 4 characters"
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
                            <Label htmlFor="password_confirmation">Confirm new password</Label>

                            <div className="relative">
                                <Input
                                    id="password_confirmation"
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    type={showConfirm ? 'text' : 'password'}
                                    className="mt-1 block w-full pr-10"
                                    autoComplete="new-password"
                                    placeholder="Re-enter new password"
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
                                <p className="text-sm text-destructive">Passwords do not match</p>
                            )}
                        </div>

                        <div className="flex items-center gap-4">
                            <Button
                                disabled={
                                    processing ||
                                    !data.current_password ||
                                    !data.password ||
                                    !data.password_confirmation ||
                                    data.password !== data.password_confirmation
                                }
                            >
                                {processing ? 'Saving…' : 'Save password'}
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
