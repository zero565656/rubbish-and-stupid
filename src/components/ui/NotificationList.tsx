import { useNotifications, useMarkNotificationRead, useDeleteNotification } from "@/hooks/useNotifications";
import type { Notification } from "@/types/database.types";
import { Trash2 } from "lucide-react";

interface NotificationListProps {
    onNotificationClick?: (notification: Notification) => void;
}

export const NotificationList = ({ onNotificationClick }: NotificationListProps) => {
    const { data: notifications = [], isLoading } = useNotifications();
    const markRead = useMarkNotificationRead();
    const deleteNotification = useDeleteNotification();

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.is_read) {
            markRead.mutate(notification.id);
        }
        onNotificationClick?.(notification);
    };

    const handleDelete = (e: React.MouseEvent, notificationId: string) => {
        e.stopPropagation();
        deleteNotification.mutate(notificationId);
    };

    const getNotificationIcon = (type: Notification["type"]) => {
        switch (type) {
            case "submission_received":
                return "📄";
            case "reviewer_assigned":
                return "👤";
            case "review_completed":
                return "✅";
            case "status_changed":
                return "🔄";
            default:
                return "📢";
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                        <div className="h-20 bg-muted rounded-lg" />
                    </div>
                ))}
            </div>
        );
    }

    if (notifications.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">No notifications yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {notifications.map((notification) => (
                <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`flex items-start gap-4 p-4 border border-border bg-card hover:bg-muted transition-colors cursor-pointer ${
                        !notification.is_read ? "border-l-4 border-l-primary" : ""
                    }`}
                >
                    <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.is_read ? "font-semibold" : ""} text-foreground`}>
                            {notification.title}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            {formatTime(notification.created_at)}
                        </p>
                    </div>
                    <button
                        onClick={(e) => handleDelete(e, notification.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        title="Delete notification"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
};
