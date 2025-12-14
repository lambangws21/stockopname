// lib/firebase/client.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCwN90oQItu1fx88mFwR11zA6f_Egz8sgU",
  authDomain: "data-ok-b4091.firebaseapp.com",
  databaseURL: "https://data-ok-b4091-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "data-ok-b4091",
  storageBucket: "data-ok-b4091.firebasestorage.app", 
  messagingSenderId: "525002375108",
  appId: "1:525002375108:web:8f54dfaa2526b1e795ae91"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

export { app, db, storage, auth };

// "data-ok-b4091.firebasestorage.app",