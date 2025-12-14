import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { X, Bell, Award, TrendingUp, BookOpen, Video, MessageSquare, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDeleteNotification } from "@/hooks/useGamification";

interface NotificationItemProps {
    notification: {
        id: string;
        type: string;
        title: string;
        message: string;
        icon?: string;
        is_read: boolean;
        priority: string;
        created_at: string;
        link?: string;
    };
    onClick?: () => void;
}

const NotificationItem = ({ notification, onClick }: NotificationItemProps) => {
    const deleteNotificationMutation = useDeleteNotification();

    const getIcon = () => {
        if (notification.icon) return notification.icon;

        const iconMap: Record<string, any> = {
            badge: Award,
            level: TrendingUp,
            course: BookOpen,
            quiz: AlertCircle,
            live_session: Video,
            forum: MessageSquare,
            system: Bell,
        };

        const IconComponent = iconMap[notification.type] || Bell;
        return <IconComponent className="w-5 h-5" />;
    };

    const getPriorityColor = () => {
        switch (notification.priority) {
            case "urgent":
                return "bg-red-100 border-red-200";
            case "high":
                return "bg-orange-100 border-orange-200";
            case "normal":
                return "bg-blue-100 border-blue-200";
            case "low":
                return "bg-gray-100 border-gray-200";
            default:
                return "bg-muted border-border";
        }
    };

    const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
        addSuffix: true,
        locale: fr,
    });

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        deleteNotificationMutation.mutate(notification.id);
    };

    return (
        <div
            className={`p-4 hover:bg-accent/50 cursor-pointer transition-colors relative group ${!notification.is_read ? "bg-primary/5" : ""
                }`}
            onClick={onClick}
        >
            <div className="flex gap-3">
                <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getPriorityColor()}`}
                >
                    {typeof getIcon() === "string" ? (
                        <span className="text-xl">{getIcon()}</span>
                    ) : (
                        getIcon()
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-sm line-clamp-1">
                            {notification.title}
                        </h4>
                        {!notification.is_read && (
                            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5"></div>
                        )}
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {notification.message}
                    </p>

                    <p className="text-xs text-muted-foreground mt-2">{timeAgo}</p>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 flex-shrink-0"
                    onClick={handleDelete}
                >
                    <X className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
};

export default NotificationItem;
