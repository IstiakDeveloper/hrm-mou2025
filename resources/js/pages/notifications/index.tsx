import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import axios from 'axios';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { PageSurface } from '@/components/page-surface';

export default function Index({ notifications }) {
  const [notificationsData, setNotificationsData] = useState(notifications.data);

  const markAsRead = async (id) => {
    try {
      await axios.post(`/notifications/${id}/mark-as-read`);
      setNotificationsData(
        notificationsData.map(notification =>
          notification.id === id
            ? { ...notification, read_at: new Date().toISOString() }
            : notification
        )
      );
      toast({
        description: "Notification marked as read",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Failed to mark notification as read",
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.post('/notifications/mark-all-as-read');
      setNotificationsData(
        notificationsData.map(notification => ({
          ...notification,
          read_at: notification.read_at || new Date().toISOString()
        }))
      );
      toast({
        description: "All notifications marked as read",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Failed to mark all notifications as read",
      });
    }
  };

  const getNotificationTypeColor = (type) => {
    switch (type) {
      case 'success': return 'bg-green-100 border-green-500 text-green-700';
      case 'warning': return 'bg-yellow-100 border-yellow-500 text-yellow-700';
      case 'error': return 'bg-red-100 border-red-500 text-red-700';
      default: return 'bg-blue-100 border-blue-500 text-blue-700';
    }
  };

  return (
    <AdminLayout>
      <Head title="Notifications" />

      <PageSurface className="py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-semibold text-xl text-gray-800 leading-tight">Notifications</h2>
            {notificationsData.some(notification => !notification.read_at) && (
              <Button
                variant="outline"
                onClick={markAllAsRead}
                className="text-sm"
              >
                Mark all as read
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              {notificationsData.length > 0 ? (
                <div className="space-y-4">
                  {notificationsData.map((notification) => {
                    const data = notification.data;
                    const typeColor = getNotificationTypeColor(data.type);

                    return (
                      <div
                        key={notification.id}
                        className={`border-l-4 p-4 rounded-md ${notification.read_at ? 'bg-gray-50' : 'bg-white'} ${typeColor}`}
                      >
                        <div className="flex justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium">{data.title}</h3>
                            <p className="text-sm mt-1">{data.message}</p>
                            <p className="text-xs mt-2 text-gray-500">
                              {new Date(notification.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex flex-col space-y-2">
                            {!notification.read_at && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                                className="text-xs"
                              >
                                Mark as read
                              </Button>
                            )}
                            {notification.read_at && (
                              <Badge variant="outline" className="text-xs bg-gray-100">Read</Badge>
                            )}
                            {data.link && (
                              <Button
                                variant="link"
                                size="sm"
                                className="text-xs"
                                onClick={() => window.location.href = data.link}
                              >
                                View details
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500">
                  <p>No notifications yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
      </PageSurface>
    </AdminLayout>
  );
}
