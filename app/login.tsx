import { View, StyleSheet } from "react-native";
import LoginBildschirm from "@/components/LoginBildschirm";

export default function LoginScreen() {
    return (
        <View style={styles.container}>
            <LoginBildschirm />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#051b37",
    },
});
