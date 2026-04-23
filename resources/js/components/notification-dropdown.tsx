import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link } from '@inertiajs/react';

export default function NotificationDropdown() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            const { data } = await axios.get('/notifications/latest');
            setNotifications(data.notifications);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
            setLoading(false);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const { data } = await axios.get('/notifications/unread-count');
            setUnreadCount(data.count);
        } catch (error) {
            console.error('Failed to fetch unread count', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        fetchUnreadCount();

        // Poll for new notifications and count every 30 seconds
        const interval = setInterval(() => {
            fetchNotifications(); // Also fetch the notifications, not just the count
            fetchUnreadCount();
        }, 12000); // Poll every 12s so admin notices show without a long wait

        return () => clearInterval(interval);
    }, []);

    const handleNotificationClick = async (notification) => {
        try {
            if (!notification.read) {
                await axios.post(`/notifications/${notification.id}/mark-as-read`);
                setNotifications(notifications.map(n =>
                    n.id === notification.id ? { ...n, read: true } : n
                ));
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Failed to mark notification as read', error);
        }

        window.location.href = `/my-notices/${notification.id}`;
    };

    const markAllAsRead = async () => {
        try {
            await axios.post('/notifications/mark-all-as-read');
            setNotifications(notifications.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read', error);
        }
    };

    const getNotificationTypeIcon = (type) => {
        switch (type) {
            case 'success': return 'bg-green-500';
            case 'warning': return 'bg-yellow-500';
            case 'error': return 'bg-red-500';
            default: return 'bg-blue-500';
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-gray-700 hover:bg-gray-100 h-10 w-10 rounded-full p-0">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs font-medium rounded-full">
                            {unreadCount < 100 ? unreadCount : '99+'}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 border shadow-lg rounded-md">
                <div className="flex justify-between items-center px-3 py-2">
                    <DropdownMenuLabel className="font-semibold text-gray-900 py-0">Notifications</DropdownMenuLabel>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={markAllAsRead}
                            className="text-xs text-blue-600 hover:text-blue-800"
                        >
                            Mark all as read
                        </Button>
                    )}
                </div>
                <DropdownMenuSeparator />
                {loading ? (
                    <div className="p-4 text-center text-gray-500">
                        <p>Loading notifications...</p>
                    </div>
                ) : notifications && notifications.length > 0 ? (
                    <ScrollArea className="h-80">
                        {notifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className={`p-3 cursor-pointer hover:bg-gray-100 ${!notification.read ? 'bg-blue-50' : ''}`}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className="flex gap-3">
                                    <div className={`w-2 h-2 rounded-full mt-2 ${getNotificationTypeIcon(notification.type)}`} />
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{notification.title}</p>
                                        <p className="text-sm text-gray-600">{notification.message}</p>
                                        <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                                    </div>
                                </div>
                            </DropdownMenuItem>
                        ))}
                    </ScrollArea>
                ) : (
                    <div className="p-4 text-center text-gray-500">
                        <p>No new notifications</p>
                    </div>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="p-2 text-center cursor-pointer">
                    <Link href="/my-notices" className="w-full text-blue-600 font-medium">
                        View all notices
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
