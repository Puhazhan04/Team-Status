import { View, Text, TextInput, Button, StyleSheet, Pressable, Alert, ScrollView } from "react-native";
import { useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import auth, { db } from "@/app/Firebase";
import { router } from "expo-router";
import { ref, set, get, update } from "firebase/database";

type Mode = "select" | "join" | "create";

export default function TeamSetupBildschirm(): any {
    const [mode, setMode] = useState<Mode>("select");
    const [teamName, setTeamName] = useState("");
    const [teamCode, setTeamCode] = useState("");
    const [loading, setLoading] = useState(false);

    const generateTeamCode = () => {
        return "TEAM-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    const handleCreateTeam = async () => {
        if (!teamName.trim()) {
            Alert.alert("Fehler", "Bitte geben Sie einen Team-Namen ein");
            return;
        }

        setLoading(true);
        try {
            const code = generateTeamCode();
            const firebaseUser = auth.currentUser;
            if (!firebaseUser) throw new Error("No user logged in");

            // Erstelle Team in RTDB
            const teamRef = ref(db, `teams/${code}`);
            await set(teamRef, {
                name: teamName.trim(),
                code: code,
                createdAt: Date.now(),
                createdBy: firebaseUser.uid,
            });

            // Update User mit Team-Code
            const userRef = ref(db, `users/${firebaseUser.uid}`);
            await update(userRef, {
                teamCode: code,
            });

            Alert.alert("Erfolg", `Team "${teamName}" erstellt! Code: ${code}`);
            router.replace("/dashboard");
        } catch (error) {
            console.error("Error creating team:", error);
            Alert.alert("Fehler", "Team konnte nicht erstellt werden");
        } finally {
            setLoading(false);
        }
    };

    const handleJoinTeam = async () => {
        if (!teamCode.trim()) {
            Alert.alert("Fehler", "Bitte geben Sie einen Team-Code ein");
            return;
        }

        setLoading(true);
        try {
            const firebaseUser = auth.currentUser;
            if (!firebaseUser) throw new Error("No user logged in");

            // Check ob Team existiert
            const teamRef = ref(db, `teams/${teamCode.trim()}`);
            const teamSnapshot = await get(teamRef);

            if (!teamSnapshot.exists()) {
                Alert.alert("Fehler", "Team nicht gefunden. Code prüfen!");
                setLoading(false);
                return;
            }

            // Update User mit Team-Code
            const userRef = ref(db, `users/${firebaseUser.uid}`);
            await update(userRef, {
                teamCode: teamCode.trim(),
            });

            Alert.alert("Erfolg", "Erfolgreich dem Team beigetreten!");
            router.replace("/dashboard");
        } catch (error) {
            console.error("Error joining team:", error);
            Alert.alert("Fehler", "Team-Beitritt fehlgeschlagen");
        } finally {
            setLoading(false);
        }
    };

    if (mode === "select") {
        return (
            <View style={styles.container}>
                <View style={styles.centerContent}>
                    <Text style={styles.mainTitle}>Team wählen</Text>
                    <Text style={styles.subtitle}>Treten Sie einem Team bei oder erstellen Sie ein neues</Text>

                    <View style={styles.optionsContainer}>
                        <Pressable
                            style={styles.optionButton}
                            onPress={() => setMode("join")}
                        >
                            <Text style={styles.optionIcon}>👥</Text>
                            <Text style={styles.optionTitle}>Team beitreten</Text>
                            <Text style={styles.optionDesc}>Ich habe einen Team-Code</Text>
                        </Pressable>

                        <Pressable
                            style={styles.optionButton}
                            onPress={() => setMode("create")}
                        >
                            <Text style={styles.optionIcon}>➕</Text>
                            <Text style={styles.optionTitle}>Neues Team erstellen</Text>
                            <Text style={styles.optionDesc}>Von vorne beginnen</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => setMode("select")}>
                    <Text style={styles.backText}>← Zurück</Text>
                </Pressable>
                <Text style={styles.title}>
                    {mode === "join" ? "Team beitreten" : "Team erstellen"}
                </Text>
                <Text style={styles.description}>
                    {mode === "join"
                        ? "Geben Sie den Code ein, den Sie von Ihrem Admin erhielten"
                        : "Geben Sie Ihrem Team einen Namen"}
                </Text>
            </View>

            <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                        {mode === "join" ? "Team-Code" : "Team-Name"}
                    </Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder={mode === "join" ? "z.B. TEAM-ABC123" : "z.B. Design Team"}
                        placeholderTextColor="#aaa"
                        value={mode === "join" ? teamCode : teamName}
                        onChangeText={(text: string) => mode === "join" ? setTeamCode(text) : setTeamName(text)}
                        autoFocus
                    />
                </View>

                {mode === "create" && (
                    <View style={styles.infoBox}>
                        <Text style={styles.infoTitle}>ℹ️ Team-Code</Text>
                        <Text style={styles.infoText}>
                            Ein eindeutiger Code wird automatisch generiert, den Sie an andere weitergeben können
                        </Text>
                    </View>
                )}

                <View style={styles.buttonContainer}>
                    <Button
                        title={mode === "join" ? "Beitreten" : "Team erstellen"}
                        onPress={mode === "join" ? handleJoinTeam : handleCreateTeam}
                        disabled={loading}
                        color="#2196F3"
                    />
                </View>
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
    centerContent: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 60,
    },
    mainTitle: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#eef1f4",
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 14,
        color: "#aaa",
        marginBottom: 30,
        textAlign: "center",
    },
    optionsContainer: {
        width: "100%",
        gap: 15,
    },
    optionButton: {
        backgroundColor: "#102c4c",
        borderRadius: 12,
        padding: 20,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#aaa",
    },
    optionIcon: {
        fontSize: 32,
        marginBottom: 10,
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#eef1f4",
        marginBottom: 5,
    },
    optionDesc: {
        fontSize: 12,
        color: "#aaa",
    },
    header: {
        paddingTop: 50,
        marginBottom: 30,
    },
    backText: {
        color: "#2196F3",
        fontSize: 14,
        marginBottom: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#eef1f4",
        marginBottom: 5,
    },
    description: {
        fontSize: 14,
        color: "#aaa",
    },
    formContainer: {
        paddingBottom: 40,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 12,
        fontWeight: "600",
        color: "#aaa",
        marginBottom: 8,
        textTransform: "uppercase",
    },
    textInput: {
        backgroundColor: "#102c4c",
        borderWidth: 1,
        borderColor: "#aaa",
        borderRadius: 8,
        padding: 12,
        color: "#eef1f4",
        fontSize: 14,
    },
    infoBox: {
        backgroundColor: "#1a3f6b",
        borderRadius: 8,
        padding: 12,
        marginBottom: 30,
    },
    infoTitle: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#2196F3",
        marginBottom: 5,
    },
    infoText: {
        fontSize: 12,
        color: "#aaa",
        lineHeight: 18,
    },
    buttonContainer: {
        marginTop: 20,
    },
});
