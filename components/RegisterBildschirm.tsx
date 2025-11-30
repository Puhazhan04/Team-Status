import { View, Text, TextInput, Button, StyleSheet, Pressable } from "react-native";
import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import auth, { db } from "@/app/Firebase";
import { router } from "expo-router";
import { ref, set } from "firebase/database";

export default function RegisterBildschirm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleRegister = () => {
        setError("");

        if (!email || !password) {
            setError("Bitte Email und Passwort eingeben.");
            return;
        }

        createUserWithEmailAndPassword(auth, email.trim(), password)
            .then(async (userCredential) => {
                const fbUser = userCredential.user;

                const name = fbUser.email?.split("@")[0] || "User";
                const userRef = ref(db, `users/${fbUser.uid}`);

                await set(userRef, {
                    email: fbUser.email,
                    name,
                    currentStatus: "available",
                    statusMessage: "",
                    statusUntil: null,
                    createdAt: Date.now(),
                });

                console.log("User registriert & in RTDB gespeichert:", fbUser.uid);
                router.replace("/");
            })
            .catch((err: any) => {
                console.log("Register Fehler:", err);

                if (err.code === "auth/email-already-in-use") {
                    setError("Diese E-Mail ist bereits registriert. Bitte loggen Sie sich ein.");
                    router.replace("/");
                } else {
                    setError(
                        err.message ||
                        "Registrierung fehlgeschlagen. Bitte später erneut versuchen."
                    );
                }
            });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Registrieren</Text>

            <TextInput
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="#aaa"
                style={styles.textInput}
                value={email}
                keyboardType="email-address"
                autoCapitalize="none"
            />

            <TextInput
                onChangeText={setPassword}
                placeholder="Passwort"
                placeholderTextColor="#aaa"
                secureTextEntry
                style={styles.textInput}
                value={password}
            />

            <Button title="Registrieren" onPress={handleRegister} />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable onPress={() => router.replace("/")}>
                <Text style={styles.loginText}>Schon ein Konto? Hier einloggen</Text>
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
        fontSize: 24,
        marginBottom: 20,
    },
    textInput: {
        color: "white",
        height: 45,
        marginVertical: 10,
        borderColor: "white",
        borderWidth: 1,
        width: 250,
        paddingHorizontal: 10,
        backgroundColor: "#102c4c",
    },
    errorText: {
        color: "red",
        marginTop: 10,
        textAlign: "center",
    },
    loginText: {
        color: "#eef1f4",
        marginTop: 20,
        fontSize: 14,
        textAlign: "center",
    },
});
