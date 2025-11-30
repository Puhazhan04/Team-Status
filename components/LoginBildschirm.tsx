import { View, Text, TextInput, Button, StyleSheet, Pressable } from "react-native";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import auth from "@/app/Firebase";
import { router } from "expo-router";

export default function LoginBildschirm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleLogin = () => {
        setError("");

        if (!email || !password) {
            setError("Bitte Email und Passwort eingeben.");
            return;
        }

        signInWithEmailAndPassword(auth, email.trim(), password)
            .then((userCredential) => {
                console.log("Login erfolgreich:", userCredential.user.uid);
                router.replace("/dashboard");
            })
            .catch((err) => {
                console.log("Login Fehler:", err.message);
                setError(String(err.message));
            });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Login</Text>

            <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#aaa"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
            />

            <TextInput
                style={styles.input}
                placeholder="Passwort"
                placeholderTextColor="#aaa"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />

            <Button title="Login" onPress={handleLogin} />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable onPress={() => router.push("/reset")}>
                <Text style={styles.linkText}>Passwort vergessen?</Text>
            </Pressable>

            <Pressable onPress={() => router.push("/register")}>
                <Text style={styles.linkText}>Noch kein Konto? Hier registrieren</Text>
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
        marginBottom: 30,
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
    errorText: {
        color: "red",
        marginTop: 10,
        textAlign: "center",
    },
    linkText: {
        color: "#eef1f4",
        marginTop: 15,
        fontSize: 14,
        textAlign: "center",
    },
});
