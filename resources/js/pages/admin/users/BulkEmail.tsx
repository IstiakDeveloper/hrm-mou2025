import React, { useState, useEffect } from 'react';
import { Head, useForm } from '@inertiajs/react';
import {
  Mail,
  Users,
  Send,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  MessageSquare,
  UserCheck,
  FileText,
  X
} from 'lucide-react';

interface User {
  id: number;
  name: string;
  email: string;
  employee_id?: string;
  roles: string;
  branch?: string;
}

interface Props {
  users: User[];
}

interface FormData {
  user_ids: number[];
  email_type: 'welcome' | 'account_info' | 'custom';
  custom_subject: string;
  custom_message: string;
}

const BulkEmail: React.FC<Props> = ({ users }) => {
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [selectAll, setSelectAll] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const { data, setData, post, processing, errors, reset } = useForm<FormData>({
    user_ids: [],
    email_type: 'welcome',
    custom_subject: '',
    custom_message: '',
  });

  // Filter users based on search and role filter
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.employee_id && user.employee_id.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = !filterRole || user.roles.toLowerCase().includes(filterRole.toLowerCase());

    return matchesSearch && matchesRole;
  });

  // Get unique roles for filter dropdown
  const uniqueRoles = [...new Set(users.flatMap(user => user.roles.split(', ')))];

  // Update form data when selectedUsers changes
  useEffect(() => {
    setData('user_ids', selectedUsers);
  }, [selectedUsers]);

  // Handle select all checkbox
  useEffect(() => {
    if (selectAll) {
      const allUserIds = filteredUsers.map(user => user.id);
      setSelectedUsers(allUserIds);
      setData('user_ids', allUserIds);
    } else {
      setSelectedUsers([]);
      setData('user_ids', []);
    }
  }, [selectAll, filteredUsers]);

  // Handle individual user selection
  const handleUserSelect = (userId: number) => {
    const newSelectedUsers = selectedUsers.includes(userId)
      ? selectedUsers.filter(id => id !== userId)
      : [...selectedUsers, userId];

    setSelectedUsers(newSelectedUsers);
    setData('user_ids', newSelectedUsers);
    setSelectAll(newSelectedUsers.length === filteredUsers.length);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if users are selected
    if (selectedUsers.length === 0) {
      alert('Please select at least one user to send emails.');
      return;
    }

    // Check custom email fields if custom type is selected
    if (data.email_type === 'custom') {
      if (!data.custom_subject.trim()) {
        alert('Please enter a subject for your custom email.');
        return;
      }
      if (!data.custom_message.trim()) {
        alert('Please enter a message for your custom email.');
        return;
      }
    }

    post(route('admin.users.bulk-email.send'), {
      onSuccess: () => {
        reset();
        setSelectedUsers([]);
        setSelectAll(false);
      },
      onError: (errors) => {
        console.error('Email sending failed:', errors);
      }
    });
  };

  // Email type configurations
  const emailTypes = {
    welcome: {
      icon: <UserCheck className="w-5 h-5" />,
      title: 'Welcome Email',
      description: 'Send a warm welcome message to new team members',
      color: 'bg-gradient-to-r from-blue-500 to-purple-600'
    },
    account_info: {
      icon: <FileText className="w-5 h-5" />,
      title: 'Account Information',
      description: 'Share current account details and access information',
      color: 'bg-gradient-to-r from-cyan-500 to-blue-500'
    },
    custom: {
      icon: <MessageSquare className="w-5 h-5" />,
      title: 'Custom Message',
      description: 'Create your own personalized message',
      color: 'bg-gradient-to-r from-pink-500 to-rose-500'
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Head title="Bulk Email" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-xl">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Bulk Email</h1>
                <p className="text-gray-600 mt-1">Send emails to multiple users at once</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-blue-50 px-4 py-2 rounded-lg">
                <span className="text-blue-700 font-semibold">{users.length} Total Users</span>
              </div>
              <div className="bg-green-50 px-4 py-2 rounded-lg">
                <span className="text-green-700 font-semibold">{selectedUsers.length} Selected</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Selection Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <Users className="w-6 h-6 mr-2" />
                  Select Recipients
                </h2>
              </div>

              <div className="p-6">
                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users by name, email, or employee ID..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <select
                      className="pl-10 pr-8 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                    >
                      <option value="">All Roles</option>
                      {uniqueRoles.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Select All */}
                <div className="flex items-center justify-between mb-4 p-4 bg-gray-50 rounded-xl">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={(e) => setSelectAll(e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="font-semibold text-gray-700">Select All ({filteredUsers.length} users)</span>
                  </label>
                  {selectedUsers.length > 0 && (
                    <button
                      onClick={() => {
                        setSelectedUsers([]);
                        setSelectAll(false);
                        setData('user_ids', []);
                      }}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>

                {/* User List */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${
                        selectedUsers.includes(user.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleUserSelect(user.id)}
                    >
                      <div className="flex items-center space-x-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => handleUserSelect(user.id)}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{user.name}</h3>
                          <p className="text-gray-600 text-sm">{user.email}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            {user.employee_id && (
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                ID: {user.employee_id}
                              </span>
                            )}
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {user.roles}
                            </span>
                            {user.branch && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                {user.branch}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {selectedUsers.includes(user.id) && (
                        <CheckCircle className="w-6 h-6 text-blue-500" />
                      )}
                    </div>
                  ))}
                </div>

                {filteredUsers.length === 0 && (
                  <div className="text-center py-12">
                    <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No users found matching your criteria</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Email Configuration Panel */}
          <div className="lg:col-span-1">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <Send className="w-6 h-6 mr-2" />
                    Email Configuration
                  </h2>
                </div>

                <div className="p-6 space-y-6">
                  {/* Email Type Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-4">
                      Choose Email Type
                    </label>
                    <div className="space-y-3">
                      {Object.entries(emailTypes).map(([type, config]) => (
                        <label
                          key={type}
                          className={`block cursor-pointer rounded-xl border-2 transition-all ${
                            data.email_type === type
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="p-4">
                            <div className="flex items-center space-x-3">
                              <input
                                type="radio"
                                name="email_type"
                                value={type}
                                checked={data.email_type === type}
                                onChange={(e) => setData('email_type', e.target.value as any)}
                                className="w-5 h-5 text-blue-600"
                              />
                              <div className={`p-2 rounded-lg ${config.color}`}>
                                <div className="text-white">
                                  {config.icon}
                                </div>
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900">{config.title}</h3>
                                <p className="text-sm text-gray-600">{config.description}</p>
                              </div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                    {errors.email_type && (
                      <p className="text-red-600 text-sm mt-2">{errors.email_type}</p>
                    )}
                  </div>

                  {/* Custom Email Fields */}
                  {data.email_type === 'custom' && (
                    <div className="space-y-4 p-4 bg-pink-50 rounded-xl border border-pink-200">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Email Subject *
                        </label>
                        <input
                          type="text"
                          value={data.custom_subject}
                          onChange={(e) => setData('custom_subject', e.target.value)}
                          placeholder="Enter email subject..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        />
                        {errors.custom_subject && (
                          <p className="text-red-600 text-sm mt-1">{errors.custom_subject}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Email Message *
                        </label>
                        <textarea
                          value={data.custom_message}
                          onChange={(e) => setData('custom_message', e.target.value)}
                          placeholder="Enter your custom message..."
                          rows={6}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                        />
                        {errors.custom_message && (
                          <p className="text-red-600 text-sm mt-1">{errors.custom_message}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Error Display */}
                  {errors.user_ids && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-red-600 text-sm">{errors.user_ids}</p>
                    </div>
                  )}

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={processing || selectedUsers.length === 0}
                    className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all flex items-center justify-center space-x-2 ${
                      processing || selectedUsers.length === 0
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transform hover:scale-105'
                    }`}
                  >
                    {processing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Sending Emails...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>Send {selectedUsers.length} Email{selectedUsers.length !== 1 ? 's' : ''}</span>
                      </>
                    )}
                  </button>

                  {selectedUsers.length === 0 && (
                    <p className="text-center text-gray-500 text-sm">
                      Select users to enable email sending
                    </p>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkEmail;
