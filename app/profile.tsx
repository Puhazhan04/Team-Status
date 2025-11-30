import { View, Text, StyleSheet, Button } from "react-native";
import { router } from "expo-router";
import { auth } from "@/app/Firebase";
import { signOut } from "firebase/auth";

export default function ProfileScreen() {
    const user = auth.currentUser;

    const handleLogout = () => {
        signOut(auth).then(() => router.replace("/"));
    };

    return (
        <View style={styles.container}>
            <Text style={styles.back} onPress={() => router.back()}>
                ← Zurück
            </Text>
            <Text style={styles.title}>Profil</Text>
            <Text style={styles.label}>E-Mail</Text>
            <Text style={styles.value}>{user?.email}</Text>

            <View style={{ marginTop: 30 }}>
                <Button title="Logout" onPress={handleLogout} color="#F44336" />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#051b37",
        padding: 20,
        paddingTop: 50,
    },
    back: {
        color: "#2196F3",
        marginBottom: 10,
    },
    title: {
        color: "#eef1f4",
        fontSize: 22,
        fontWeight: "bold",
        marginBottom: 20,
    },
    label: {
        color: "#aaa",
        fontSize: 12,
        textTransform: "uppercase",
        marginBottom: 4,
    },
    value: {
        color: "#eef1f4",
        fontSize: 16,
    },
});
