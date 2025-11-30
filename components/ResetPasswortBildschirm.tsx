import { View, Text, TextInput, Button, StyleSheet, Alert, Pressable } from "react-native";
import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import auth from "@/app/Firebase";
import { router } from "expo-router";

export default function ResetPasswortBildschirm() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const handleReset = () => {
        if (!email.trim()) {
            Alert.alert("Fehler", "Bitte Email eingeben.");
            return;
        }

        setLoading(true);
        sendPasswordResetEmail(auth, email.trim())
            .then(() => {
                Alert.alert("Erfolg", "Reset-Link wurde gesendet.");
                router.back(); // zurück zu Login
            })
            .catch((err) => {
                console.log("Reset Fehler:", err);
                Alert.alert("Fehler", "E-Mail konnte nicht gesendet werden.");
            })
            .finally(() => setLoading(false));
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Passwort zurücksetzen</Text>

            <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#aaa"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
            />

            <Button title="Reset-Link senden" onPress={handleReset} disabled={loading} />

            <Pressable onPress={() => router.back()}>
                <Text style={styles.linkText}>Zurück zum Login</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#051b37",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    title: {
        color: "#eef1f4",
        fontWeight: "bold",
        fontSize: 22,
        marginBottom: 20,
    },
    input: {
        width: 250,
        height: 45,
        borderColor: "white",
        borderWidth: 1,
        marginVertical: 10,
        paddingHorizontal: 10,
        color: "white",
        backgroundColor: "#102c4c",
    },
    linkText: {
        color: "#eef1f4",
        marginTop: 20,
    },
});
