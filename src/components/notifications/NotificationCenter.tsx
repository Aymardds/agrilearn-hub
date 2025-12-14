import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    useNotifications,
    useUnreadNotificationsCount,
    useMarkNotificationAsRead,
    useMarkAllNotificationsAsRead,
} from "@/hooks/useGamification";
import NotificationItem from "./NotificationItem";
import { useNavigate } from "react-router-dom";

interface NotificationCenterProps {
    userId: string;
}

const NotificationCenter = ({ userId }: NotificationCenterProps) => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);

    const { data: notifications } = useNotifications(userId);
    const { data: unreadCount } = useUnreadNotificationsCount(userId);
    const markAsReadMutation = useMarkNotificationAsRead();
    const markAllAsReadMutation = useMarkAllNotificationsAsRead();

    const recentNotifications = notifications?.slice(0, 5) || [];
    const hasUnread = (unreadCount || 0) > 0;

    const handleNotificationClick = (notification: any) => {
        if (!notification.is_read) {
            markAsReadMutation.mutate(notification.id);
        }

        if (notification.link) {
            navigate(notification.link);
            setIsOpen(false);
        }
    };

    const handleMarkAllAsRead = () => {
        markAllAsReadMutation.mutate(userId);
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5" />
                    {hasUnread && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                        >
                            {unreadCount! > 9 ? "9+" : unreadCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold">Notifications</h3>
                    {hasUnread && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleMarkAllAsRead}
                            className="text-xs h-auto py-1"
                        >
                            Tout marquer comme lu
                        </Button>
                    )}
                </div>

                <ScrollArea className="h-[400px]">
                    {recentNotifications.length > 0 ? (
                        <div className="divide-y">
                            {recentNotifications.map((notification: any) => (
                                <NotificationItem
                                    key={notification.id}
                                    notification={notification}
                                    onClick={() => handleNotificationClick(notification)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                            <Bell className="w-12 h-12 text-muted-foreground mb-3" />
                            <p className="text-sm text-muted-foreground">
                                Aucune notification
                            </p>
                        </div>
                    )}
                </ScrollArea>

                {notifications && notifications.length > 5 && (
                    <div className="p-3 border-t">
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                                navigate("/notifications");
                                setIsOpen(false);
                            }}
                        >
                            Voir toutes les notifications
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
};

export default NotificationCenter;
