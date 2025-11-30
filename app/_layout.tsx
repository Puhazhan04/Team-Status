import { Stack } from "expo-router";
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import auth from "@/app/Firebase";

export default function RootLayout() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        // währenddessen nur Splash / index
        return (
            <Stack>
                <Stack.Screen name="index" options={{ headerShown: false }} />
            </Stack>
        );
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            {!user ? (
                <>
                    <Stack.Screen name="index" options={{ title: "Splash" }} />
                    <Stack.Screen name="login" options={{ title: "Login" }} />
                    <Stack.Screen name="register" options={{ title: "Registrieren" }} />
                    <Stack.Screen name="reset" options={{ title: "Passwort zurücksetzen" }} />
                </>
            ) : (
                <>
                    <Stack.Screen name="dashboard" options={{ title: "Dashboard" }} />
                    <Stack.Screen name="team" options={{ title: "Team" }} />
                    <Stack.Screen name="join" options={{ title: "Team beitreten" }} />
                    <Stack.Screen name="notifications" options={{ title: "Benachrichtigungen" }} />
                    <Stack.Screen name="profile" options={{ title: "Profil" }} />
                    <Stack.Screen name="member/[id]" options={{ title: "Mitglied" }} />
                </>
            )}
        </Stack>
    );
}
