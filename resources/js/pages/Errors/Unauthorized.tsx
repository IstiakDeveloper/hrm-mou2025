// resources/js/Pages/Errors/Unauthorized.tsx
import { Head, Link } from '@inertiajs/react';
import { ShieldX, Home, ArrowLeft, Key } from 'lucide-react';

interface Props {
    permission?: string;
    reason?: string;
    errorDetails?: {
        type: string;
        required_permission: string;
        user_permissions: string[];
        attempted_url: string;
    };
}

export default function Unauthorized({ permission, reason, errorDetails }: Props) {
    return (
        <>
            <Head title="403 - Unauthorized" />

            <div className="min-h-screen bg-gradient-to-br from-red-50 via-red-100 to-pink-50 flex items-center justify-center px-4">
                <div className="max-w-lg w-full text-center">
                    {/* Animated Icon */}
                    <div className="relative mb-8">
                        <div className="mx-auto flex items-center justify-center h-32 w-32 rounded-full bg-gradient-to-r from-red-500 to-pink-500 shadow-2xl animate-pulse">
                            <ShieldX className="h-16 w-16 text-white" />
                        </div>
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500 to-pink-500 blur-xl opacity-30 animate-ping"></div>
                    </div>

                    {/* Error Code */}
                    <h1 className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-pink-600 mb-4">
                        403
                    </h1>

                    {/* Title */}
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
                        Access Denied
                    </h2>

                    {/* Description */}
                    <div className="space-y-4 mb-10">
                        <p className="text-xl text-gray-600">
                            You don't have permission to access this page
                        </p>
                        <p className="text-lg text-gray-500">
                            আপনার এই পেজে প্রবেশের অনুমতি নেই
                        </p>

                        {/* Show specific permission if available */}
                        {permission && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
                                <div className="flex items-center mb-2">
                                    <Key className="h-5 w-5 text-red-600 mr-2" />
                                    <p className="text-sm font-semibold text-red-800">
                                        Required Permission:
                                    </p>
                                </div>
                                <p className="text-sm text-red-700 font-mono bg-red-100 px-3 py-2 rounded">
                                    {permission}
                                </p>
                            </div>
                        )}

                        {/* Show detailed error info if available */}
                        {errorDetails && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
                                <h4 className="text-sm font-semibold text-gray-800 mb-3">Debug Information:</h4>
                                <div className="space-y-2 text-sm text-gray-600">
                                    <p><span className="font-medium">Required:</span> {errorDetails.required_permission}</p>
                                    <p><span className="font-medium">Your permissions:</span> {errorDetails.user_permissions?.join(', ') || 'None'}</p>
                                    <p><span className="font-medium">Attempted URL:</span> {errorDetails.attempted_url}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                        <button
                            onClick={() => window.history.back()}
                            className="group inline-flex items-center px-8 py-4 bg-white border-2 border-gray-300 rounded-xl shadow-lg hover:shadow-xl text-gray-700 hover:border-red-400 transition-all duration-300 transform hover:-translate-y-1"
                        >
                            <ArrowLeft className="h-5 w-5 mr-3 group-hover:animate-bounce" />
                            <span className="font-semibold">Go Back</span>
                        </button>

                        <Link
                            href="/"
                            className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl shadow-lg hover:shadow-xl text-white font-semibold hover:from-red-600 hover:to-pink-600 transition-all duration-300 transform hover:-translate-y-1"
                        >
                            <Home className="h-5 w-5 mr-3 group-hover:animate-bounce" />
                            <span>Go Home</span>
                        </Link>
                    </div>

                    {/* Help Text */}
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 shadow-lg">
                        <p className="text-sm text-gray-600 leading-relaxed">
                            If you believe this is an error, please contact your administrator or
                            <a href="mailto:support@example.com" className="text-red-600 hover:text-red-700 font-medium ml-1">
                                contact support
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
