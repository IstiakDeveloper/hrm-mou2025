import React from 'react';
import { Link } from '@inertiajs/react';
import { Mail, Send } from 'lucide-react';

// Add this button to your users index page
const BulkEmailButton: React.FC = () => {
  return (
    <Link
      href={route('admin.users.bulk-email.form')}
      className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
    >
      <Mail className="w-5 h-5" />
      <span>Bulk Email</span>
      <Send className="w-4 h-4" />
    </Link>
  );
};

export default BulkEmailButton;
