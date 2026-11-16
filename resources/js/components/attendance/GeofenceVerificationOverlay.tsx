import React from "react";
import { MapPin, CheckCircle2, Loader2, AlertTriangle, ShieldCheck, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type LocationPreview = {
    bestAccuracy: number | null;
    sampleCount: number;
};

interface GeofenceVerificationOverlayProps {
    isOpen: boolean;
    locationStatus: string | null;
    locationProgress: number;
    locationPreview: LocationPreview;
    attendanceError: string | null;
    onDismissError: () => void;
    actionType: "check-in" | "check-out" | null;
}

export function GeofenceVerificationOverlay({
    isOpen,
    locationStatus,
    locationProgress,
    locationPreview,
    attendanceError,
    onDismissError,
    actionType,
}: GeofenceVerificationOverlayProps) {
    if (!isOpen) return null;

    const isErrorState = !!attendanceError;
    const isSuccessState = locationProgress === 100 && !isErrorState;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md transition-all duration-300 animate-in fade-in">
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white/90 p-6 sm:p-8 text-center shadow-2xl backdrop-blur-2xl transition-all duration-300 animate-in zoom-in-95 duration-200">
                {/* Close Button for Error State */}
                {isErrorState && (
                    <button
                        onClick={onDismissError}
                        className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}

                {/* Status Icon Header */}
                <div className="flex justify-center mb-6">
                    {isErrorState ? (
                        <div className="relative flex items-center justify-center h-20 w-20 rounded-full bg-rose-50 border border-rose-100 text-rose-600 animate-bounce">
                            <AlertTriangle className="h-10 w-10" />
                        </div>
                    ) : isSuccessState ? (
                        <div className="relative flex items-center justify-center h-20 w-20 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/30 opacity-75 animate-ping"></span>
                            <ShieldCheck className="h-10 w-10 relative" />
                        </div>
                    ) : (
                        <div className="relative flex items-center justify-center h-24 w-24">
                            {/* Concentric Pulsing Radar Rings */}
                            <span className="absolute inline-flex h-20 w-20 rounded-full bg-blue-400/20 opacity-75 animate-ping"></span>
                            <span className="absolute inline-flex h-14 w-14 rounded-full bg-blue-400/20 opacity-75 animate-ping delay-300"></span>
                            <div className="relative flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
                                <MapPin className="h-8 w-8 animate-bounce" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Titles */}
                <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                    {isErrorState
                        ? "Verification Blocked"
                        : isSuccessState
                        ? "Verification Successful"
                        : actionType === "check-out"
                        ? "Geofence Check Out"
                        : "Geofence Check In"}
                </h3>
                
                <p className="mt-2 text-sm text-slate-500 font-medium">
                    {isErrorState 
                        ? "Unable to complete geofence verification."
                        : locationStatus || "Initializing GPS signal..."}
                </p>

                {/* Interactive Signal/GPS Metadata */}
                {!isErrorState && !isSuccessState && locationPreview.sampleCount > 0 && (
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-50/80 border border-blue-100 px-3.5 py-1 text-xs font-semibold text-blue-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                        Accuracy: {locationPreview.bestAccuracy !== null ? `${Math.round(locationPreview.bestAccuracy)}m` : "N/A"}
                        <span className="text-blue-300">•</span>
                        Samples: {locationPreview.sampleCount}/3
                    </div>
                )}

                {/* Progress bar */}
                {!isErrorState && (
                    <div className="mt-6 space-y-2">
                        <div className="flex justify-between text-xs font-bold text-slate-500 tabular-nums">
                            <span>Progress</span>
                            <span>{locationProgress}%</span>
                        </div>
                        <Progress
                            value={locationProgress}
                            className="h-2.5 bg-slate-100 rounded-full overflow-hidden"
                            indicatorClassName="bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-300"
                        />
                    </div>
                )}

                {/* Checklist Stages */}
                {!isErrorState && (
                    <div className="mt-6 space-y-2.5 text-left border-t border-slate-100 pt-5">
                        {/* Stage 1 */}
                        <div className={cn(
                            "flex items-center justify-between p-3 rounded-xl border transition-all duration-300 text-xs font-semibold",
                            locationProgress >= 70
                                ? "bg-emerald-50/50 border-emerald-100 text-emerald-800"
                                : locationProgress > 0 && locationProgress < 70
                                ? "bg-blue-50/50 border-blue-100 text-blue-800 animate-pulse"
                                : "bg-slate-50 border-slate-100 text-slate-400"
                        )}>
                            <div className="flex items-center gap-2.5">
                                {locationProgress >= 70 ? (
                                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                                ) : locationProgress > 0 && locationProgress < 70 ? (
                                    <Loader2 className="h-4.5 w-4.5 text-blue-600 animate-spin shrink-0" />
                                ) : (
                                    <span className="h-2 w-2 rounded-full bg-slate-300 shrink-0 ml-1.5 mr-1" />
                                )}
                                <span>1. Lock GPS Position</span>
                            </div>
                            <span className="text-[10px] uppercase tracking-wider opacity-80">
                                {locationProgress >= 70 ? "Done" : locationProgress > 0 && locationProgress < 70 ? "Locking..." : "Pending"}
                            </span>
                        </div>

                        {/* Stage 2 */}
                        <div className={cn(
                            "flex items-center justify-between p-3 rounded-xl border transition-all duration-300 text-xs font-semibold",
                            locationProgress >= 90
                                ? "bg-emerald-50/50 border-emerald-100 text-emerald-800"
                                : locationProgress >= 70 && locationProgress < 90
                                ? "bg-indigo-50/50 border-indigo-100 text-indigo-800 animate-pulse"
                                : "bg-slate-50 border-slate-100 text-slate-400"
                        )}>
                            <div className="flex items-center gap-2.5">
                                {locationProgress >= 90 ? (
                                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                                ) : locationProgress >= 70 && locationProgress < 90 ? (
                                    <Loader2 className="h-4.5 w-4.5 text-indigo-600 animate-spin shrink-0" />
                                ) : (
                                    <span className="h-2 w-2 rounded-full bg-slate-300 shrink-0 ml-1.5 mr-1" />
                                )}
                                <span>2. Validate Branch Geofence</span>
                            </div>
                            <span className="text-[10px] uppercase tracking-wider opacity-80">
                                {locationProgress >= 90 ? "Verified" : locationProgress >= 70 && locationProgress < 90 ? "Verifying..." : "Pending"}
                            </span>
                        </div>

                        {/* Stage 3 */}
                        <div className={cn(
                            "flex items-center justify-between p-3 rounded-xl border transition-all duration-300 text-xs font-semibold",
                            locationProgress === 100
                                ? "bg-emerald-50/50 border-emerald-100 text-emerald-800"
                                : locationProgress >= 90
                                ? "bg-emerald-50/30 border-emerald-100 text-emerald-700 animate-pulse"
                                : "bg-slate-50 border-slate-100 text-slate-400"
                        )}>
                            <div className="flex items-center gap-2.5">
                                {locationProgress === 100 ? (
                                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                                ) : locationProgress >= 90 ? (
                                    <Loader2 className="h-4.5 w-4.5 text-emerald-600 animate-spin shrink-0" />
                                ) : (
                                    <span className="h-2 w-2 rounded-full bg-slate-300 shrink-0 ml-1.5 mr-1" />
                                )}
                                <span>3. Sync Attendance Record</span>
                            </div>
                            <span className="text-[10px] uppercase tracking-wider opacity-80">
                                {locationProgress === 100 ? "Synced" : locationProgress >= 90 ? "Syncing..." : "Pending"}
                            </span>
                        </div>
                    </div>
                )}

                {/* Error Banner and Button */}
                {isErrorState && (
                    <div className="mt-5 space-y-5">
                        <div className="p-4 rounded-2xl border border-rose-100 bg-rose-50/60 text-left text-xs text-rose-800 animate-in fade-in slide-in-from-top-2">
                            <span className="font-bold block text-sm mb-1">Reason for failure:</span>
                            <span className="leading-relaxed block text-rose-700">{attendanceError}</span>
                        </div>
                        <Button
                            onClick={onDismissError}
                            className="w-full h-11 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-semibold shadow-md active:scale-95 transition-all duration-200"
                        >
                            Dismiss
                        </Button>
                    </div>
                )}

                {/* Success Close message (Auto closes anyway, but safe display) */}
                {isSuccessState && (
                    <div className="mt-6 p-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 text-emerald-800 text-xs font-semibold animate-in fade-in">
                        Attendance successfully saved. Closing window...
                    </div>
                )}
            </div>
        </div>
    );
}
