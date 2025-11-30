import {
    View,
    Text,
    FlatList,
    StyleSheet,
    Pressable,
    TextInput,
    Alert,
    Vibration,
} from "react-native";
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import auth, { db } from "@/app/Firebase";
import { router } from "expo-router";
import { onValue, ref, push } from "firebase/database";

export default function TeamListeBildschirm(): any {
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [user, setUser] = useState<any>(null);
    const [currentUserName, setCurrentUserName] = useState("");

    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
            if (!firebaseUser) {
                router.replace("/");
                return;
            }
            setUser(firebaseUser);

            // aktuellen Benutzer laden
            const currentUserRef = ref(db, `users/${firebaseUser.uid}`);
            onValue(currentUserRef, (snapshot) => {
                const data = snapshot.val();
                setCurrentUserName(data?.name || firebaseUser.email || "Unbekannt");
            });

            const usersRef = ref(db, "users");
            const unsubDb = onValue(
                usersRef,
                (snapshot) => {
                    const data = snapshot.val() || {};
                    const members = Object.entries(data).map(
                        ([id, value]: any) => ({
                            id,
                            ...value,
                        })
                    );
                    // eigenen User ausblenden
                    setTeamMembers(
                        members.filter((m) => m.id !== firebaseUser.uid)
                    );
                    setLoading(false);
                },
                (error) => {
                    console.error("Error loading team members:", error);
                    Alert.alert("Fehler", "Fehler beim Laden der Teammitglieder");
                    setLoading(false);
                }
            );

            return () => unsubDb();
        });

        return () => unsubAuth();
    }, []);

    const sendStatusRequest = async (memberId: string, memberName: string) => {
        if (!user) return;

        try {
            const notificationsRef = ref(db, `notifications/${memberId}`);
            await push(notificationsRef, {
                type: "status_request",
                title: "Status-Anfrage",
                message: `${currentUserName} möchte Ihren aktuellen Status wissen`,
                fromUserId: user.uid,
                fromUserName: currentUserName,
                timestamp: Date.now(),
                read: false,
            });

            Vibration.vibrate(200);
            Alert.alert(
                "Status anfragen",
                `Anfrage an ${memberName} wurde gesendet.`
            );
        } catch (error) {
            console.error("Error sending status request:", error);
            Alert.alert("Fehler", "Anfrage konnte nicht gesendet werden");
        }
    };

    const filteredMembers = teamMembers.filter((member) =>
        (member.name || "")
            .toString()
            .toLowerCase()
            .includes(search.toLowerCase())
    );

    const statusColors: Record<string, string> = {
        available: "#4CAF50",
        busy: "#F44336",
        meeting: "#9C27B0",
        away: "#FF9800",
    };

    const statusLabels: Record<string, string> = {
        available: "Verfügbar",
        busy: "Beschäftigt",
        meeting: "Im Meeting",
        away: "Abwesend",
    };

    const formatUntil = (ts?: number) => {
        if (!ts) return "";
        const d = new Date(ts);
        return d.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const renderMember = ({ item }: { item: any }) => (
        <Pressable
            style={styles.memberCard}
            onPress={() =>
                router.push({ pathname: "/mitarbeiter/id", params: { id: item.id } })
            }
        >
            <View style={styles.memberHeader}>
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {(item.name || "?")
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")
                                .toUpperCase()}
                        </Text>
                    </View>
                    <View
                        style={[
                            styles.statusIndicator,
                            {
                                backgroundColor:
                                    statusColors[item.currentStatus] || "#4CAF50",
                            },
                        ]}
                    />
                </View>

                <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{item.name || "Unbekannt"}</Text>
                    <Text style={styles.memberEmail}>{item.email}</Text>
                </View>
            </View>

            <View style={styles.memberStatus}>
                <Text style={styles.statusText}>
                    {statusLabels[item.currentStatus] || "Verfügbar"}
                </Text>
                {item.statusMessage && (
                    <Text style={styles.statusMessage}>{item.statusMessage}</Text>
                )}
                {item.statusUntil && (
                    <Text style={styles.statusUntil}>
                        bis {formatUntil(item.statusUntil)}
                    </Text>
                )}
            </View>

            <Pressable
                style={styles.requestButton}
                onPress={() =>
                    sendStatusRequest(item.id, item.name || "Mitarbeiter")
                }
            >
                <Text style={styles.requestButtonText}>Status anfragen</Text>
            </Pressable>
        </Pressable>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()}>
                    <Text style={styles.backButton}>← Zurück</Text>
                </Pressable>
                <Text style={styles.title}>Mitarbeiter</Text>
            </View>

            {/* Suche */}
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Mitarbeiter suchen..."
                    placeholderTextColor="#aaa"
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            {/* Liste */}
            {loading ? (
                <View style={styles.centerContent}>
                    <Text style={styles.loadingText}>Wird geladen...</Text>
                </View>
            ) : filteredMembers.length === 0 ? (
                <View style={styles.centerContent}>
                    <Text style={styles.emptyText}>
                        Keine Teammitglieder gefunden
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredMembers}
                    renderItem={renderMember}
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
    },
    searchContainer: {
        padding: 15,
    },
    searchInput: {
        backgroundColor: "#102c4c",
        borderWidth: 1,
        borderColor: "#aaa",
        borderRadius: 8,
        padding: 12,
        color: "#eef1f4",
    },
    listContent: {
        paddingHorizontal: 10,
        paddingBottom: 20,
    },
    memberCard: {
        backgroundColor: "#102c4c",
        borderRadius: 12,
        padding: 12,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: "#aaa",
    },
    memberHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    avatarContainer: {
        position: "relative",
        marginRight: 12,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#2196F3",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        position: "absolute",
        bottom: 0,
        right: 0,
        borderWidth: 2,
        borderColor: "#102c4c",
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#eef1f4",
    },
    memberEmail: {
        fontSize: 12,
        color: "#aaa",
        marginTop: 3,
    },
    memberStatus: {
        marginBottom: 4,
    },
    statusText: {
        fontSize: 12,
        color: "#2196F3",
        fontWeight: "600",
    },
    statusMessage: {
        fontSize: 11,
        color: "#aaa",
        marginTop: 2,
    },
    statusUntil: {
        fontSize: 11,
        color: "#ddd",
        marginTop: 2,
    },
    centerContent: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        color: "#aaa",
        fontSize: 16,
    },
    emptyText: {
        color: "#aaa",
        fontSize: 14,
    },
    requestButton: {
        marginTop: 8,
        backgroundColor: "#2196F3",
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: "center",
    },
    requestButtonText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 12,
    },
});
