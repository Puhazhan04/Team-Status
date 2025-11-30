import React, { useEffect, useState, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    Button,
    Alert,
    Platform,
    TextInput,
    Vibration,
} from "react-native";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { ref, onValue, update } from "firebase/database";
import { router } from "expo-router";
import { auth, db } from "@/app/Firebase";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Audio } from "expo-av";

type StatusId = "available" | "busy" | "meeting" | "away";

const STATUS_OPTIONS: { id: StatusId; label: string; color: string }[] = [
    { id: "available", label: "Verfügbar", color: "#4CAF50" },
    { id: "busy", label: "Beschäftigt", color: "#F44336" },
    { id: "meeting", label: "Im Meeting", color: "#9C27B0" },
    { id: "away", label: "Abwesend", color: "#FF9800" },
];

export default function DashboardBildschirm() {
    const [userName, setUserName] = useState<string | null>(null);
    const [currentStatus, setCurrentStatus] = useState<StatusId>("available");
    const [statusUntil, setStatusUntil] = useState<Date | null>(null);
    const [teamCode, setTeamCode] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState("");
    const [unreadNotifications, setUnreadNotifications] = useState(0);

    const [showTimePicker, setShowTimePicker] = useState(false);
    const [tempTime, setTempTime] = useState<Date>(new Date());
    const [loading, setLoading] = useState(true);

    const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const notificationSoundRef = useRef<Audio.Sound | null>(null);

    const formatTime = (date: Date) => {
        const h = String(date.getHours()).padStart(2, "0");
        const m = String(date.getMinutes()).padStart(2, "0");
        return `${h}:${m}`;
    };

    const formatUntilText = () => {
        if (!statusUntil) return "";
        return `bis ${formatTime(statusUntil)}`;
    };

    //  Sound einmal beim Mount laden
    useEffect(() => {
        let isMounted = true;

        (async () => {
            try {
                const { sound } = await Audio.Sound.createAsync(
                    // Datei: app/assets/notification.mp3
                    require("../assets/notification.mp3")
                );
                if (isMounted) {
                    notificationSoundRef.current = sound;
                }
            } catch (error) {
                console.error("Fehler beim Laden des Sounds:", error);
            }
        })();

        return () => {
            isMounted = false;
            if (notificationSoundRef.current) {
                notificationSoundRef.current.unloadAsync();
            }
        };
    }, []);

    const playNotificationSound = async () => {
        try {
            if (notificationSoundRef.current) {
                await notificationSoundRef.current.replayAsync();
            }
        } catch (error) {
            console.error("Fehler beim Abspielen des Sounds:", error);
        }
    };

    // User + Status aus RTDB laden
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (!firebaseUser) {
                router.replace("/");
                return;
            }

            const uid = firebaseUser.uid;
            const userRef = ref(db, `users/${uid}`);

            onValue(
                userRef,
                (snapshot) => {
                    const data = snapshot.val();
                    if (!data) {
                        setUserName(firebaseUser.email ?? "Benutzer");
                        setCurrentStatus("available");
                        setStatusUntil(null);
                        setTeamCode(null);
                        setStatusMessage("");
                        setLoading(false);
                        return;
                    }

                    setUserName(data.name ?? firebaseUser.email ?? "Benutzer");
                    setCurrentStatus(data.currentStatus ?? "available");
                    setTeamCode(data.teamCode ?? null);
                    setStatusMessage(data.statusMessage ?? "");

                    if (data.statusUntil) {
                        const d = new Date(data.statusUntil);
                        if (d.getTime() > Date.now()) {
                            setStatusUntil(d);
                        } else {
                            setStatusUntil(null);
                        }
                    } else {
                        setStatusUntil(null);
                    }

                    setLoading(false);
                },
                (error) => {
                    console.error("Error reading user:", error);
                    setLoading(false);
                }
            );
        });

        return () => unsubscribe();
    }, []);

    //  Benachrichtigungen beobachten
    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        const notificationsRef = ref(db, `notifications/${user.uid}`);
        const unsubscribe = onValue(
            notificationsRef,
            (snapshot) => {
                const data = snapshot.val() || {};
                const list = Object.values(data) as any[];
                const unread = list.filter((n) => !n.read).length;

                setUnreadNotifications((prev) => {
                    if (unread > prev) {
                        Vibration.vibrate(300);
                        playNotificationSound();
                    }
                    return unread;
                });
            },
            (error) => {
                console.error("Error reading notifications:", error);
            }
        );

        return () => unsubscribe();
    }, []);

    // Status in RTDB speichern
    const saveStatusToDb = async (
        newStatus: StatusId,
        until: Date | null,
        message?: string
    ): Promise<void> => {
        const user = auth.currentUser;
        if (!user) return;

        const userRef = ref(db, `users/${user.uid}`);
        await update(userRef, {
            currentStatus: newStatus,
            statusUntil: until ? until.getTime() : null,
            statusMessage: message !== undefined ? message : statusMessage,
            updatedAt: Date.now(),
        });
    };

    const handleStatusChange = async (newStatus: StatusId) => {
        try {
            setCurrentStatus(newStatus);
            await saveStatusToDb(newStatus, statusUntil);
        } catch (error) {
            console.error("Error updating status:", error);
            Alert.alert("Fehler", "Status konnte nicht aktualisiert werden");
        }
    };

    // Auto-Reset Logik
    const scheduleAutoReset = () => {
        if (resetTimerRef.current) {
            clearTimeout(resetTimerRef.current);
            resetTimerRef.current = null;
        }

        if (!statusUntil) return;

        const diff = statusUntil.getTime() - Date.now();

        if (diff <= 0) {
            resetStatus();
            return;
        }

        resetTimerRef.current = setTimeout(() => {
            resetStatus();
        }, diff);
    };

    const resetStatus = async () => {
        try {
            setCurrentStatus("available");
            setStatusUntil(null);
            await saveStatusToDb("available", null);
        } catch (error) {
            console.error("Auto-reset error:", error);
        }
    };

    useEffect(() => {
        scheduleAutoReset();
        return () => {
            if (resetTimerRef.current) {
                clearTimeout(resetTimerRef.current);
            }
        };
    }, [statusUntil]);

    const handleLogout = () => {
        signOut(auth)
            .then(() => {
                router.replace("/");
            })
            .catch((error) => {
                console.error("Logout error:", error);
            });
    };

    const openTimePicker = () => {
        setTempTime(statusUntil ?? new Date());
        setShowTimePicker(true);
    };

    const onTimeChange = (_event: any, selectedDate?: Date) => {
        if (selectedDate) setTempTime(selectedDate);
    };

    const applyTime = async () => {
        try {
            setStatusUntil(tempTime);
            setShowTimePicker(false);
            await saveStatusToDb(currentStatus, tempTime);
        } catch (error) {
            console.error("Error saving time:", error);
            Alert.alert("Fehler", "Zeit konnte nicht gespeichert werden");
        }
    };

    const clearTime = async () => {
        try {
            setStatusUntil(null);
            setShowTimePicker(false);
            await saveStatusToDb(currentStatus, null);
        } catch (error) {
            console.error("Error clearing time:", error);
        }
    };

    const handleMessageBlur = async () => {
        try {
            await saveStatusToDb(currentStatus, statusUntil, statusMessage);
        } catch (error) {
            console.error("Error saving message:", error);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <Text style={styles.title}>Wird geladen…</Text>
            </View>
        );
    }

    const currentOption = STATUS_OPTIONS.find((s) => s.id === currentStatus);

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.title}>Mein Status</Text>
                        <Text style={styles.subtitle}>
                            Willkommen, {userName ?? "User"}
                        </Text>
                    </View>

                    {/* Navigation Buttons */}
                    <View style={styles.headerButtons}>
                        {/*  Benachrichtigungen mit Badge */}
                        <Pressable
                            style={styles.iconButton}
                            onPress={() => router.push("/notifications")}
                        >
                            <View>
                                <Text style={styles.iconButtonText}>🔔</Text>
                                {unreadNotifications > 0 && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>
                                            {unreadNotifications > 9
                                                ? "9+"
                                                : unreadNotifications}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </Pressable>

                        {/* 👤 Profil */}
                        <Pressable
                            style={styles.iconButton}
                            onPress={() => router.push("/profile")}
                        >
                            <Text style={styles.iconButtonText}>👤</Text>
                        </Pressable>
                    </View>
                </View>
            </View>

            {/* Aktueller Status */}
            <View style={styles.currentStatusCard}>
                <Text style={styles.statusCardLabel}>Aktueller Status</Text>
                <View style={styles.statusDisplayRow}>
                    <View
                        style={[
                            styles.statusDisplayDot,
                            { backgroundColor: currentOption?.color ?? "#4CAF50" },
                        ]}
                    />
                    <View>
                        <Text style={styles.statusDisplayText}>
                            {currentOption?.label ?? "Verfügbar"}
                        </Text>
                        {statusUntil && (
                            <Text style={styles.statusUntilText}>{formatUntilText()}</Text>
                        )}
                        {statusMessage && (
                            <Text style={styles.statusMessagePreview}>{statusMessage}</Text>
                        )}
                    </View>
                </View>
            </View>

            {/* Status Buttons */}
            <View style={styles.statusGrid}>
                {STATUS_OPTIONS.map((option) => (
                    <Pressable
                        key={option.id}
                        style={[
                            styles.statusButton,
                            currentStatus === option.id && [
                                styles.statusButtonActive,
                                { borderColor: option.color },
                            ],
                        ]}
                        onPress={() => handleStatusChange(option.id)}
                    >
                        <View
                            style={[styles.statusDot, { backgroundColor: option.color }]}
                        />
                        <Text style={styles.statusLabel}>{option.label}</Text>
                    </Pressable>
                ))}
            </View>

            {/* Kommentar / Nachricht */}
            <View style={styles.messageSection}>
                <Text style={styles.messageLabel}></Text>
                <TextInput
                    style={styles.messageInput}
                    placeholder="Optionale Nachricht..."
                    placeholderTextColor="#aaa"
                    value={statusMessage}
                    onChangeText={setStatusMessage}
                    onBlur={handleMessageBlur}
                    multiline
                    numberOfLines={2}
                />
            </View>

            {/* Zeit-Sektion */}
            <View style={styles.timeSection}>
                <Text style={styles.timeLabel}>Status bis:</Text>
                <View style={styles.timeRow}>
                    <Pressable style={styles.timeField} onPress={openTimePicker}>
                        <Text style={styles.timeFieldText}>
                            {statusUntil ? formatTime(statusUntil) : "Zeit auswählen"}
                        </Text>
                    </Pressable>
                    <Pressable style={styles.noEndButton} onPress={clearTime}>
                        <Text style={styles.noEndButtonText}>Ohne Ende</Text>
                    </Pressable>
                </View>

                {showTimePicker && (
                    <>
                        <View style={styles.pickerContainer}>
                            <DateTimePicker
                                mode="time"
                                value={tempTime}
                                display={Platform.OS === "ios" ? "spinner" : "default"}
                                onChange={onTimeChange}
                            />
                        </View>

                        <Pressable style={styles.applyTimeButton} onPress={applyTime}>
                            <Text style={styles.applyTimeText}>Zeit übernehmen</Text>
                        </Pressable>
                    </>
                )}
            </View>

            {/* Team Sektion */}
            <View style={styles.teamSection}>
                {teamCode ? (
                    <>
                        <Pressable
                            style={styles.teamButton}
                            onPress={() => router.push("/team")}
                        >
                            <Text style={styles.teamButtonText}>👥 Team-Übersicht</Text>
                        </Pressable>

                        <Text style={styles.teamCodeText}>Team-Code: {teamCode}</Text>
                    </>
                ) : (
                    <Pressable
                        style={styles.joinTeamButton}
                        onPress={() => router.push("/join")}
                    >
                        <Text style={styles.joinTeamButtonText}>
                            👥 Team beitreten/erstellen
                        </Text>
                    </Pressable>
                )}
            </View>

            {/* Logout */}
            <View style={styles.logoutSection}>
                <Button title="Logout" onPress={handleLogout} color="#F44336" />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#051b37",
        paddingHorizontal: 15,
    },
    center: {
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        marginTop: 40,
        marginBottom: 30,
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    headerButtons: {
        flexDirection: "row",
        gap: 10,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#102c4c",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#aaa",
    },
    iconButtonText: {
        fontSize: 20,
    },
    badge: {
        position: "absolute",
        top: -4,
        right: -4,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: "#F44336",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 2,
    },
    badgeText: {
        color: "#fff",
        fontSize: 10,
        fontWeight: "bold",
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#eef1f4",
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 14,
        color: "#aaa",
    },
    currentStatusCard: {
        backgroundColor: "#102c4c",
        borderRadius: 12,
        padding: 15,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: "#aaa",
    },
    statusCardLabel: {
        fontSize: 12,
        color: "#aaa",
        marginBottom: 10,
        textTransform: "uppercase",
        fontWeight: "600",
    },
    statusDisplayRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    statusDisplayDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
    },
    statusDisplayText: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#eef1f4",
    },
    statusUntilText: {
        fontSize: 12,
        color: "#aaa",
        marginTop: 4,
    },
    statusMessagePreview: {
        fontSize: 12,
        color: "#ddd",
        marginTop: 4,
        fontStyle: "italic",
    },
    statusGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 25,
    },
    statusButton: {
        width: "48%",
        backgroundColor: "#102c4c",
        borderRadius: 10,
        padding: 15,
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#102c4c",
    },
    statusButtonActive: {
        borderWidth: 2,
    },
    statusDot: {
        width: 18,
        height: 18,
        borderRadius: 9,
        marginBottom: 8,
    },
    statusLabel: {
        color: "#eef1f4",
        fontWeight: "600",
        fontSize: 12,
    },
    messageSection: {
        marginBottom: 25,
    },
    messageLabel: {
        fontSize: 12,
        color: "#aaa",
        marginBottom: 10,
        fontWeight: "600",
        textTransform: "uppercase",
    },
    messageInput: {
        backgroundColor: "#102c4c",
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: "#aaa",
        color: "#eef1f4",
        fontSize: 14,
        minHeight: 60,
        textAlignVertical: "top",
    },
    timeSection: {
        marginBottom: 25,
    },
    timeLabel: {
        fontSize: 12,
        color: "#aaa",
        marginBottom: 10,
        fontWeight: "600",
        textTransform: "uppercase",
    },
    timeRow: {
        flexDirection: "row",
        gap: 10,
    },
    timeField: {
        flex: 1,
        backgroundColor: "#102c4c",
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: "#aaa",
    },
    timeFieldText: {
        color: "#eef1f4",
        textAlign: "center",
        fontWeight: "600",
    },
    noEndButton: {
        backgroundColor: "#F44336",
        borderRadius: 8,
        padding: 12,
        justifyContent: "center",
    },
    noEndButtonText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 12,
    },
    pickerContainer: {
        marginVertical: 15,
        backgroundColor: "#102c4c",
        borderRadius: 8,
        padding: 10,
    },
    applyTimeButton: {
        backgroundColor: "#2196F3",
        borderRadius: 8,
        padding: 12,
        alignItems: "center",
    },
    applyTimeText: {
        color: "#fff",
        fontWeight: "600",
    },
    teamSection: {
        marginBottom: 25,
    },
    teamButton: {
        backgroundColor: "#4CAF50",
        borderRadius: 10,
        padding: 15,
        alignItems: "center",
    },
    teamButtonText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 14,
    },
    teamCodeText: {
        color: "#aaa",
        fontSize: 12,
        textAlign: "center",
        marginTop: 10,
    },
    joinTeamButton: {
        backgroundColor: "#2196F3",
        borderRadius: 10,
        padding: 15,
        alignItems: "center",
    },
    joinTeamButtonText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 14,
    },
    logoutSection: {
        marginBottom: 40,
    },
});
