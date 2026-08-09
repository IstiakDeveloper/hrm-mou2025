import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { format } from 'date-fns';
import { CheckCircle2, Clock, MapPin, Gauge, AlertCircle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { resolveMovementStartPlace } from '@/lib/movement-start-place';

interface CloseMovementModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    movementId?: number | null;
    movementType?: string | null;
    startMeterReading?: number | string | null;
    startPlace?: string | null;
    branchFallbackName?: string;
    onSuccess?: () => void;
}

export function CloseMovementModal({
    open,
    onOpenChange,
    movementId,
    movementType: propMovementType,
    startMeterReading: propStartMeterReading,
    startPlace: propStartPlace,
    branchFallbackName = '',
    onSuccess,
}: CloseMovementModalProps) {
    const [workResult, setWorkResult] = useState('');
    const [forgotReturnTime, setForgotReturnTime] = useState(false);
    const [customReturnTime, setCustomReturnTime] = useState('');
    const [startMeterReading, setStartMeterReading] = useState('');
    const [endMeterReading, setEndMeterReading] = useState('');
    const [personalKm, setPersonalKm] = useState('');
    const [movementType, setMovementType] = useState<string | null>(propMovementType || null);
    const [startPlace, setStartPlace] = useState(propStartPlace || branchFallbackName);
    const [fetchedStartMeter, setFetchedStartMeter] = useState<number | null>(null);
    const [resolvingPlace, setResolvingPlace] = useState(false);
    const [closeError, setCloseError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const isPersonalMovement = (movementType || propMovementType || '').toLowerCase() === 'personal';

    useEffect(() => {
        if (open) {
            setCloseError(null);
            setForgotReturnTime(false);
            setWorkResult('');
            setStartMeterReading('');
            setEndMeterReading('');
            setPersonalKm('');
            setMovementType(propMovementType || null);
            setCustomReturnTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
            setStartPlace(propStartPlace || branchFallbackName);

            const initialProp = (propStartMeterReading !== undefined && propStartMeterReading !== null && propStartMeterReading !== '')
                ? Number(propStartMeterReading)
                : null;
            setFetchedStartMeter(initialProp !== null && !Number.isNaN(initialProp) && initialProp >= 0 ? initialProp : null);

            if (movementId) {
                fetch(`/movements/${movementId}/details`)
                    .then((res) => res.json())
                    .then((data) => {
                        if (data?.movement_type) {
                            setMovementType(data.movement_type);
                        }
                        if (data?.start_place) {
                            setStartPlace(data.start_place);
                        }

                        // Prefer last day's closing meter for this employee
                        const lastEnd = data?.last_end_meter_reading;
                        if (lastEnd !== null && lastEnd !== undefined && lastEnd !== '') {
                            const val = Number(lastEnd);
                            if (!Number.isNaN(val) && val >= 0) {
                                setFetchedStartMeter(val);
                                return;
                            }
                        }
                        if (data?.start_meter_reading !== null && data?.start_meter_reading !== undefined && data?.start_meter_reading !== '') {
                            const val = Number(data.start_meter_reading);
                            if (!Number.isNaN(val) && val >= 0) {
                                setFetchedStartMeter(val);
                            }
                        }
                    })
                    .catch(() => {});
            }

            if (!propStartPlace) {
                setResolvingPlace(true);
                resolveMovementStartPlace(branchFallbackName)
                    .then((place) => setStartPlace(place))
                    .catch(() => setStartPlace(branchFallbackName))
                    .finally(() => setResolvingPlace(false));
            }
        }
    }, [open, movementId, branchFallbackName, propStartMeterReading, propStartPlace]);

    const presetStartMeter = (fetchedStartMeter !== null && !Number.isNaN(fetchedStartMeter) && fetchedStartMeter >= 0)
        ? fetchedStartMeter
        : (propStartMeterReading !== undefined && propStartMeterReading !== null && propStartMeterReading !== '' && !Number.isNaN(Number(propStartMeterReading)) && Number(propStartMeterReading) >= 0)
            ? Number(propStartMeterReading)
            : null;

    const hasPresetStartMeter = presetStartMeter !== null;

    const startMeterValue = hasPresetStartMeter ? presetStartMeter : (startMeterReading.trim() !== '' ? Number(startMeterReading) : null);
    const endMeterValue = endMeterReading.trim() !== '' ? Number(endMeterReading) : null;
    const personalKmNum = personalKm.trim() === '' || Number.isNaN(Number(personalKm)) ? 0 : Number(personalKm);

    const hasValidReadings =
        startMeterValue !== null &&
        endMeterValue !== null &&
        !Number.isNaN(startMeterValue) &&
        !Number.isNaN(endMeterValue) &&
        endMeterValue >= startMeterValue;

    const totalKm = hasValidReadings ? Math.max(0, endMeterValue - startMeterValue) : 0;
    const effectivePersonalKm = isPersonalMovement ? totalKm : personalKmNum;
    const officialKm = isPersonalMovement ? 0 : Math.max(0, totalKm - personalKmNum);

    const handleClose = () => {
        setCloseError(null);
        if (!movementId) return;

        if (!workResult.trim() || workResult.trim().length < 5) {
            setCloseError('Please write the work result / feedback (at least 5 characters).');
            return;
        }

        const effectiveStartMeter = hasPresetStartMeter ? presetStartMeter : Number(startMeterReading);
        const endReading = Number(endMeterReading);
        const personal = personalKm.trim() === '' ? 0 : Number(personalKm);

        if (!hasPresetStartMeter && (startMeterReading.trim() === '' || Number.isNaN(effectiveStartMeter) || effectiveStartMeter < 0)) {
            setCloseError('Please enter a valid start meter reading.');
            return;
        }
        if (endMeterReading.trim() === '' || Number.isNaN(endReading) || endReading < effectiveStartMeter) {
            setCloseError(`Closing meter reading must be greater than or equal to start reading (${effectiveStartMeter}).`);
            return;
        }

        const totalKmCalc = Math.max(0, endReading - effectiveStartMeter);
        if (!isPersonalMovement) {
            if (personalKm.trim() !== '' && (Number.isNaN(personal) || personal < 0)) {
                setCloseError('Please enter a valid personal distance.');
                return;
            }
            if (personal > totalKmCalc) {
                setCloseError('Personal distance cannot exceed total distance.');
                return;
            }
        }

        if (forgotReturnTime && !customReturnTime?.trim()) {
            setCloseError('Please select the actual date and time you returned.');
            return;
        }

        setSubmitting(true);
        router.post(
            route('movements.complete', movementId),
            {
                forgot_return_time: forgotReturnTime ? '1' : '0',
                actual_return_datetime: forgotReturnTime ? customReturnTime : null,
                work_result: workResult.trim(),
                start_place: startPlace.trim() || branchFallbackName || 'Unknown',
                start_meter_reading: effectiveStartMeter,
                end_meter_reading: endReading,
                personal_km: isPersonalMovement
                    ? totalKmCalc
                    : (personalKm.trim() !== '' ? personal : null),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    onOpenChange(false);
                    if (onSuccess) onSuccess();
                },
                onError: (errors) => {
                    setCloseError(
                        (errors.work_result as string) ||
                        (errors.start_meter_reading as string) ||
                        (errors.end_meter_reading as string) ||
                        (errors.personal_km as string) ||
                        (errors.start_place as string) ||
                        (errors.actual_return_datetime as string) ||
                        'Could not close movement. Please check the form.'
                    );
                },
                onFinish: () => setSubmitting(false),
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.25rem)] max-w-lg overflow-y-auto rounded-2xl p-4 sm:max-h-[90dvh] sm:p-5">
                <DialogHeader className="pb-1 space-y-1">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100/80 text-emerald-700 sm:h-10 sm:w-10 shrink-0">
                            <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                                Close Movement
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500">
                                Enter work feedback & complete your return
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-3 py-1">
                    {/* Work Result Field */}
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="modalWorkResult" className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                                Work Result / Feedback <span className="text-rose-500 font-bold">*</span>
                            </Label>
                            <span className="text-[10px] text-slate-400">Min 5 chars</span>
                        </div>
                        <Textarea
                            id="modalWorkResult"
                            value={workResult}
                            onChange={(e) => {
                                setWorkResult(e.target.value);
                                setCloseError(null);
                            }}
                            placeholder="কী কাজ সম্পন্ন করেছেন লিখুন..."
                            rows={2}
                            className="resize-none text-xs sm:text-sm bg-white border-slate-200 focus-visible:ring-emerald-500 rounded-lg"
                        />
                    </div>

                    {/* Backdated Return Checkbox Section */}
                    <div className={`rounded-xl border transition-all p-3 space-y-2 ${
                        forgotReturnTime ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200/80 bg-slate-50/30'
                    }`}>
                        <div className="flex items-center space-x-2.5">
                            <Checkbox
                                id="modalForgotReturnTime"
                                checked={forgotReturnTime}
                                onCheckedChange={(checked) => {
                                    setForgotReturnTime(checked === true);
                                    setCloseError(null);
                                    if (checked === true) {
                                        setCustomReturnTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
                                    }
                                }}
                                className="h-4 w-4 rounded border-amber-400 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                            />
                            <Label htmlFor="modalForgotReturnTime" className="cursor-pointer text-xs font-medium text-slate-700 flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-amber-600" />
                                <span>আগে ক্লোজ করতে ভুলে গিয়েছিলাম (Backdated Return)</span>
                            </Label>
                        </div>

                        {forgotReturnTime && (
                            <div className="pt-1 space-y-1">
                                <Label htmlFor="modalCustomTime" className="text-[11px] font-medium text-amber-900">
                                    প্রকৃত ফেরার সময় (Actual Return Date & Time)
                                </Label>
                                <Input
                                    id="modalCustomTime"
                                    type="datetime-local"
                                    value={customReturnTime}
                                    onChange={(e) => setCustomReturnTime(e.target.value)}
                                    className="h-8 text-xs bg-white border-amber-200 focus-visible:ring-amber-500 rounded-lg"
                                />
                            </div>
                        )}
                    </div>

                    {/* Log Book Meter Inputs (always created on close) */}
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/20 p-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                                <Gauge className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Log Book Meter Reading</span>
                            </div>
                            {resolvingPlace && (
                                <span className="text-[10px] text-amber-600 animate-pulse flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> GPS...
                                </span>
                            )}
                        </div>

                        <div className="space-y-2.5 pt-1">
                            {hasPresetStartMeter ? (
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="modalEndMeter" className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                                            <span>Closing Meter (এন্ড মিটার)</span>
                                            <span className="text-rose-500 font-bold">*</span>
                                        </Label>
                                        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                                            Start: <strong className="text-emerald-950 tabular-nums">{presetStartMeter}</strong> km
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-500">
                                        Start meter = এই employee-এর সর্বশেষ close meter reading
                                    </p>
                                    <Input
                                        id="modalEndMeter"
                                        type="number"
                                        min={presetStartMeter}
                                        step="0.01"
                                        value={endMeterReading}
                                        onChange={(e) => setEndMeterReading(e.target.value)}
                                        placeholder={`e.g. ${Number(presetStartMeter) + 25}`}
                                        className="h-8.5 text-xs sm:text-sm bg-white border-slate-200 focus-visible:ring-emerald-500 rounded-lg"
                                    />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label htmlFor="modalStartMeter" className="text-[11px] font-medium text-slate-600">
                                            Start Meter <span className="text-rose-500">*</span>
                                        </Label>
                                        <Input
                                            id="modalStartMeter"
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={startMeterReading}
                                            onChange={(e) => setStartMeterReading(e.target.value)}
                                            placeholder="e.g. 12540"
                                            className="h-8 text-xs bg-white border-slate-200 focus-visible:ring-emerald-500 rounded-lg"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="modalEndMeter" className="text-[11px] font-medium text-slate-600">
                                            Closing Meter <span className="text-rose-500">*</span>
                                        </Label>
                                        <Input
                                            id="modalEndMeter"
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={endMeterReading}
                                            onChange={(e) => setEndMeterReading(e.target.value)}
                                            placeholder="e.g. 12565"
                                            className="h-8 text-xs bg-white border-slate-200 focus-visible:ring-emerald-500 rounded-lg"
                                        />
                                    </div>
                                </div>
                            )}

                            {hasValidReadings && (
                                <div className="rounded-lg border border-emerald-200/80 bg-white p-2.5 space-y-2 text-xs">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 text-slate-600">
                                        <span>Total Distance:</span>
                                        <span className="font-bold text-slate-900">{parseFloat(totalKm.toFixed(2))} km</span>
                                    </div>

                                    {isPersonalMovement ? (
                                        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                                            Personal movement — পুরো দূরত্ব Personal km হিসেবে গণনা হবে।
                                        </p>
                                    ) : (
                                        <div className="flex items-center justify-between gap-2">
                                            <Label htmlFor="modalPersonalKm" className="text-[11px] text-slate-500 shrink-0">
                                                Personal (km):
                                            </Label>
                                            <Input
                                                id="modalPersonalKm"
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={personalKm}
                                                onChange={(e) => setPersonalKm(e.target.value)}
                                                placeholder="0"
                                                className="h-7 text-xs w-24 text-right bg-slate-50 border-slate-200 rounded"
                                            />
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-1 font-semibold text-emerald-800">
                                        <span>{isPersonalMovement ? 'Personal Distance:' : 'Official Distance:'}</span>
                                        <span className="text-sm font-bold text-emerald-700">
                                            {parseFloat((isPersonalMovement ? effectivePersonalKm : officialKm).toFixed(2))} km
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Error Banner */}
                    {closeError && (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-lg">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{closeError}</span>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex-row gap-2 pt-2 sm:pt-3 border-t border-slate-100">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="flex-1 h-9 text-xs sm:text-sm font-medium border-slate-200 text-slate-700 rounded-xl"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleClose}
                        disabled={submitting || resolvingPlace}
                        className="flex-1 h-9 text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm"
                    >
                        {submitting ? 'Processing...' : 'Confirm Return'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
