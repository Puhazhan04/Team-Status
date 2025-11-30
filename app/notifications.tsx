import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Pressable,
    ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { auth, db } from "@/app/Firebase";
import { ref, onValue, update, remove } from "firebase/database";

interface Notification {
    id: string;
    type: "status_request" | "team_invite" | "status_change" | "reminder";
    title: string;
    message: string;
    fromUserId?: string;
    fromUserName?: string;
    timestamp: number;
    read: boolean;
}

export default function NotificationsScreen() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            router.replace("/");
            return;
        }

        const notificationsRef = ref(db, `notifications/${user.uid}`);
        const unsubscribe = onValue(notificationsRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) {
                setNotifications([]);
                setLoading(false);
                return;
            }

            const notificationsList: Notification[] = Object.entries(data).map(
                ([id, value]: any) => ({
                    id,
                    ...value,
                })
            );

            // Sortiere nach Zeitstempel (neueste zuerst)
            notificationsList.sort((a, b) => b.timestamp - a.timestamp);
            setNotifications(notificationsList);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const markAsRead = async (notificationId: string) => {
        const user = auth.currentUser;
        if (!user) return;

        const notificationRef = ref(
            db,
            `notifications/${user.uid}/${notificationId}`
        );
        await update(notificationRef, { read: true });
    };

    const deleteNotification = async (notificationId: string) => {
        const user = auth.currentUser;
        if (!user) return;

        const notificationRef = ref(
            db,
            `notifications/${user.uid}/${notificationId}`
        );
        await remove(notificationRef);
    };

    const markAllAsRead = async () => {
        const user = auth.currentUser;
        if (!user) return;

        const updates: any = {};
        notifications.forEach((notification) => {
            if (!notification.read) {
                updates[`notifications/${user.uid}/${notification.id}/read`] = true;
            }
        });

        await update(ref(db), updates);
    };

    const clearAll = async () => {
        const user = auth.currentUser;
        if (!user) return;

        const notificationsRef = ref(db, `notifications/${user.uid}`);
        await remove(notificationsRef);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "status_request":
                return "❓";
            case "team_invite":
                return "👥";
            case "status_change":
                return "🔄";
            case "reminder":
                return "⏰";
            default:
                return "📬";
        }
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "Gerade eben";
        if (minutes < 60) return `vor ${minutes} Min.`;
        if (hours < 24) return `vor ${hours} Std.`;
        if (days < 7) return `vor ${days} Tag${days > 1 ? "en" : ""}`;

        return date.toLocaleDateString("de-DE");
    };

    const renderNotification = ({ item }: { item: Notification }) => (
        <Pressable
            style={[styles.notificationCard, !item.read && styles.unreadCard]}
            onPress={() => markAsRead(item.id)}
        >
            <View style={styles.notificationHeader}>
                <Text style={styles.notificationIcon}>{getIcon(item.type)}</Text>
                <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>{item.title}</Text>
                    <Text style={styles.notificationMessage}>{item.message}</Text>
                    {item.fromUserName && (
                        <Text style={styles.notificationFrom}>
                            Von: {item.fromUserName}
                        </Text>
                    )}
                    <Text style={styles.notificationTime}>
                        {formatTime(item.timestamp)}
                    </Text>
                </View>
                <Pressable
                    style={styles.deleteButton}
                    onPress={() => deleteNotification(item.id)}
                >
                    <Text style={styles.deleteButtonText}>✕</Text>
                </Pressable>
            </View>
            {!item.read && <View style={styles.unreadDot} />}
        </Pressable>
    );

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()}>
                    <Text style={styles.backButton}>← Zurück</Text>
                </Pressable>
                <Text style={styles.title}>Benachrichtigungen</Text>
                {unreadCount > 0 && (
                    <Text style={styles.unreadCount}>
                        {unreadCount} ungelesen
                    </Text>
                )}
            </View>

            {/* Action Buttons */}
            {notifications.length > 0 && (
                <View style={styles.actionButtons}>
                    {unreadCount > 0 && (
                        <Pressable
                            style={styles.actionButton}
                            onPress={markAllAsRead}
                        >
                            <Text style={styles.actionButtonText}>
                                Alle als gelesen
                            </Text>
                        </Pressable>
                    )}
                    <Pressable
                        style={[styles.actionButton, styles.clearButton]}
                        onPress={clearAll}
                    >
                        <Text style={styles.actionButtonText}>Alle löschen</Text>
                    </Pressable>
                </View>
            )}

            {/* Notifications List */}
            {loading ? (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color="#2196F3" />
                </View>
            ) : notifications.length === 0 ? (
                <View style={styles.centerContent}>
                    <Text style={styles.emptyIcon}>📭</Text>
                    <Text style={styles.emptyText}>
                        Keine Benachrichtigungen
                    </Text>

                </View>
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={renderNotification}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#051b37",
    },
    header: {
        paddingTop: 50,
        paddingHorizontal: 15,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#aaa",
    },
    backButton: {
        color: "#2196F3",
        fontSize: 16,
        marginBottom: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#eef1f4",
        marginBottom: 5,
    },
    unreadCount: {
        fontSize: 14,
        color: "#F44336",
        fontWeight: "600",
    },
    actionButtons: {
        flexDirection: "row",
        padding: 15,
        gap: 10,
    },
    actionButton: {
        flex: 1,
        backgroundColor: "#2196F3",
        borderRadius: 8,
        padding: 10,
        alignItems: "center",
    },
    clearButton: {
        backgroundColor: "#F44336",
    },
    actionButtonText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 12,
    },
    listContent: {
        padding: 15,
    },
    notificationCard: {
        backgroundColor: "#102c4c",
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#aaa",
        position: "relative",
    },
    unreadCard: {
        borderColor: "#2196F3",
        borderWidth: 2,
    },
    notificationHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    notificationIcon: {
        fontSize: 24,
        marginRight: 10,
    },
    notificationContent: {
        flex: 1,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#eef1f4",
        marginBottom: 5,
    },
    notificationMessage: {
        fontSize: 14,
        color: "#ddd",
        marginBottom: 5,
    },
    notificationFrom: {
        fontSize: 12,
        color: "#aaa",
        marginBottom: 5,
    },
    notificationTime: {
        fontSize: 12,
        color: "#aaa",
    },
    deleteButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "#F44336",
        justifyContent: "center",
        alignItems: "center",
    },
    deleteButtonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
    unreadDot: {
        position: "absolute",
        top: 10,
        right: 10,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#2196F3",
    },
    centerContent: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 20,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#eef1f4",
        marginBottom: 5,
    },
    emptySubtext: {
        fontSize: 14,
        color: "#aaa",
        textAlign: "center",
    },
});