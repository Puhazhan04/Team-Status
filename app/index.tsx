// app/index.tsx
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { router } from "expo-router";
import { auth } from "@/app/Firebase";

export default function SplashScreen() {
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                router.replace("/dashboard");
            } else {
                router.replace("/login");
            }
        });
        return () => unsub();
    }, []);

    return (
        <View style={styles.container}>
            {/* App Logo */}
            <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                    <Text style={styles.logoText}>TS</Text>
                </View>
            </View>

            <Text style={styles.appName}>TEAM STATUS</Text>

            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.subtitle}>Wird geladen...</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#051b37",
        justifyContent: "center",
        alignItems: "center",
    },
    logoContainer: {
        marginBottom: 30,
    },
    logoCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "#2196F3",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 4,
        borderColor: "#eef1f4",
    },
    logoText: {
        fontSize: 48,
        fontWeight: "bold",
        color: "#fff",
    },
    appName: {
        fontSize: 32,
        color: "#eef1f4",
        fontWeight: "bold",
        marginBottom: 50,
        letterSpacing: 2,
    },
    loadingContainer: {
        alignItems: "center",
    },
    subtitle: {
        color: "#aaa",
        marginTop: 15,
        fontSize: 14,
    },
});