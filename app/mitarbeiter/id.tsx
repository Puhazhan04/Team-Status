// app/mitarbeiter/id.tsx
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState } from "react";
import { db } from "@/app/Firebase";
import { ref, onValue } from "firebase/database";

export default function MitarbeiterBildschirm() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [mitarbeiter, setMitarbeiter] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        const userRef = ref(db, `users/${id}`);
        const unsub = onValue(userRef, (snap) => {
            setMitarbeiter(snap.val());
            setLoading(false);
        });
        return () => unsub();
    }, [id]);

    if (loading || !mitarbeiter) {
        return (
            <View style={styles.center}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>Lade Mitglied...</Text>
            </View>
        );
    }

    const initials = (mitarbeiter.name || "?")
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase();

    return (
        <View style={styles.container}>
            <Pressable onPress={() => router.back()}>
                <Text style={styles.back}>← Zurück</Text>
            </Pressable>

            <View style={styles.card}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <Text style={styles.name}>{mitarbeiter.name}</Text>
                <Text style={styles.email}>{mitarbeiter.email}</Text>

                <Text style={styles.sectionTitle}>Status</Text>
                <Text style={styles.statusText}>
                    {mitarbeiter.currentStatus || "Verfügbar"}
                </Text>
                {mitarbeiter.statusMessage ? (
                    <Text style={styles.message}>{mitarbeiter.statusMessage}</Text>
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#051b37",
        padding: 20,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#051b37",
    },
    loadingText: {
        color: "#eef1f4",
        marginTop: 10,
    },
    back: {
        color: "#2196F3",
        marginTop: 40,
        marginBottom: 10,
        fontSize: 16,
    },
    card: {
        backgroundColor: "#102c4c",
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: "#aaa",
        alignItems: "center",
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: "#2196F3",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 10,
    },
    avatarText: {
        color: "#fff",
        fontSize: 24,
        fontWeight: "bold",
    },
    name: {
        color: "#eef1f4",
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 4,
    },
    email: {
        color: "#aaa",
        fontSize: 12,
        marginBottom: 20,
    },
    sectionTitle: {
        color: "#aaa",
        fontSize: 12,
        marginTop: 10,
        marginBottom: 4,
        textTransform: "uppercase",
    },
    statusText: {
        color: "#eef1f4",
        fontSize: 16,
        marginBottom: 4,
    },
    message: {
        color: "#aaa",
        fontSize: 12,
    },
});
