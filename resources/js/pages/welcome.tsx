import React from 'react';
import { Bell, Calendar, Users, Briefcase, FileText, MessageSquare, Search, ChevronDown } from 'lucide-react';

const WelcomePage = () => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const upcomingEvents = [
    { id: 1, title: 'Team Meeting', time: '10:00 AM', date: 'Today' },
    { id: 2, title: 'Performance Review', time: '2:30 PM', date: 'Tomorrow' },
    { id: 3, title: 'Training Session', time: '11:00 AM', date: 'Mar 6, 2025' }
  ];

  const recentAnnouncements = [
    { id: 1, title: 'New Health Benefits Package', date: 'Mar 1, 2025' },
    { id: 2, title: 'Office Closure - Spring Holiday', date: 'Feb 28, 2025' }
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm px-6 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-blue-600">HR Management</h1>
        </div>
        <div className="flex items-center space-x-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <Bell className="text-gray-600 h-6 w-6 cursor-pointer" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">3</span>
          </div>
          <div className="flex items-center space-x-2 cursor-pointer">
            <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-medium">JD</span>
            </div>
            <span className="text-gray-700">John Doe</span>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Welcome Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Welcome back, John!</h1>
              <p className="text-gray-600 mt-1">{currentDate}</p>
            </div>
            <div className="bg-blue-50 px-4 py-2 rounded-md">
              <p className="text-blue-600 font-medium">HR Manager</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-blue-50 rounded-md p-4 flex items-center">
              <Users className="h-10 w-10 text-blue-600 mr-3" />
              <div>
                <p className="text-gray-600 text-sm">Total Employees</p>
                <p className="text-xl font-bold text-gray-800">248</p>
              </div>
            </div>
            <div className="bg-green-50 rounded-md p-4 flex items-center">
              <Briefcase className="h-10 w-10 text-green-600 mr-3" />
              <div>
                <p className="text-gray-600 text-sm">Open Positions</p>
                <p className="text-xl font-bold text-gray-800">12</p>
              </div>
            </div>
            <div className="bg-purple-50 rounded-md p-4 flex items-center">
              <FileText className="h-10 w-10 text-purple-600 mr-3" />
              <div>
                <p className="text-gray-600 text-sm">Pending Requests</p>
                <p className="text-xl font-bold text-gray-800">18</p>
              </div>
            </div>
            <div className="bg-yellow-50 rounded-md p-4 flex items-center">
              <Calendar className="h-10 w-10 text-yellow-600 mr-3" />
              <div>
                <p className="text-gray-600 text-sm">Upcoming Events</p>
                <p className="text-xl font-bold text-gray-800">3</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="grid grid-cols-3 gap-6">
          {/* Upcoming Events */}
          <div className="bg-white rounded-lg shadow-sm p-6 col-span-1">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">Upcoming Events</h2>
              <button className="text-blue-600 text-sm font-medium">View All</button>
            </div>
            <div className="space-y-4">
              {upcomingEvents.map(event => (
                <div key={event.id} className="border-l-4 border-blue-500 pl-3 py-1">
                  <p className="font-medium text-gray-800">{event.title}</p>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span>{event.date}</span>
                    <span className="mx-2">•</span>
                    <span>{event.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Announcements */}
          <div className="bg-white rounded-lg shadow-sm p-6 col-span-1">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">Recent Announcements</h2>
              <button className="text-blue-600 text-sm font-medium">View All</button>
            </div>
            <div className="space-y-4">
              {recentAnnouncements.map(announcement => (
                <div key={announcement.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                  <p className="font-medium text-gray-800">{announcement.title}</p>
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span>{announcement.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6 col-span-1">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <button className="bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md p-3 flex flex-col items-center transition">
                <Users className="h-6 w-6 mb-1" />
                <span className="text-sm font-medium">Add Employee</span>
              </button>
              <button className="bg-green-50 hover:bg-green-100 text-green-700 rounded-md p-3 flex flex-col items-center transition">
                <FileText className="h-6 w-6 mb-1" />
                <span className="text-sm font-medium">Approve Leave</span>
              </button>
              <button className="bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md p-3 flex flex-col items-center transition">
                <MessageSquare className="h-6 w-6 mb-1" />
                <span className="text-sm font-medium">Send Message</span>
              </button>
              <button className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-md p-3 flex flex-col items-center transition">
                <Calendar className="h-6 w-6 mb-1" />
                <span className="text-sm font-medium">Schedule Event</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
