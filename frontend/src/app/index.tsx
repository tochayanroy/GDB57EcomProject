import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router } from "expo-router";
import { useEffect } from "react";

import SplashScreen from "./SplashScreen";

export default function Index() {

    useEffect(() => {
        initializeApp();
    }, []);

    const initializeApp = async () => {
        try {

            // Show Welcome Screen for 2 seconds
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Get token from AsyncStorage

            const token = await AsyncStorage.getItem("token");
            console.log(token);

            // No token found
            if (!token) {
                router.replace("/(auth)");
                return;
            }

            // Get Profile API
            const response = await axios.get("http://10.225.180.27:5000/User/profile",{
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            console.log(response?.data);
            // API Success
            if (response?.data?.success) {

                const role = response?.data?.data?.role;

                if (role === "admin") {
                    router.replace("/(admin)");
                    return;
                }

                if (role === "user") {
                    router.replace("/(user)");
                    return;
                }
            }

            // Invalid response
            await AsyncStorage.removeItem("token");
            router.replace("/(auth)");

        } catch (error) {
            console.log("App Initialization Error:", error);

            // Remove invalid token
            await AsyncStorage.removeItem("token");

            router.replace("/(auth)");
        }
    };

    return <SplashScreen />;
}