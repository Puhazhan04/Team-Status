import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyBXvIXYJCYwL6szkskUh6vm7rU32m-IVVU",
    authDomain: "team-status-dfc1c.firebaseapp.com",
    databaseURL: "https://team-status-dfc1c-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "team-status-dfc1c",
    storageBucket: "team-status-dfc1c.firebasestorage.app",
    messagingSenderId: "334042959060",
    appId: "1:334042959060:web:b0a40984bbdf6cf283ff41",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getDatabase(app);
export default auth;
