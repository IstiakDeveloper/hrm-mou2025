import { Head, Link } from '@inertiajs/react';
import { ShieldX, Home, ArrowLeft } from 'lucide-react';

interface ErrorProps {
    status: number;
    message: string;
}

export default function Error403({ status, message }: ErrorProps) {
    return (
        <>
            <Head title="403 - Unauthorized" />

            <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8 text-center">
                    <div>
                        {/* Error Icon */}
                        <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-red-100 mb-6">
                            <ShieldX className="h-12 w-12 text-red-600" />
                        </div>

                        {/* Status Code */}
                        <h1 className="text-9xl font-bold text-red-600 mb-4">
                            {status}
                        </h1>

                        {/* Error Title */}
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">
                            Unauthorized Access
                        </h2>

                        {/* Error Message */}
                        <p className="text-lg text-gray-600 mb-8">
                            {message || "You don't have permission to access this resource."}
                        </p>

                        {/* Additional Message */}
                        <p className="text-sm text-gray-500 mb-8">
                            আপনার এই পেজে প্রবেশের অনুমতি নেই। অনুগ্রহ করে আপনার administrator এর সাথে যোগাযোগ করুন।
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={() => window.history.back()}
                            className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                        >
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            Go Back
                        </button>

                        <Link
                            href="/"
                            className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                        >
                            <Home className="h-5 w-5 mr-2" />
                            Go Home
                        </Link>
                    </div>

                    {/* Contact Info */}
                    <div className="mt-8 p-4 bg-white rounded-lg shadow-sm">
                        <p className="text-sm text-gray-600">
                            Need help? Contact support at{' '}
                            <a
                                href="mailto:support@example.com"
                                className="text-red-600 hover:text-red-500 font-medium"
                            >
                                support@example.com
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
