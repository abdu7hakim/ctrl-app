// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// SIZNING KODINGIZ (rasmdan nusxalang)
const firebaseConfig = {
  apiKey: "AIzaSyBNOF5jxv4t8Y50JhrD1p2QT1x0aDHCaMk",
  authDomain: "ctrlwebapp.firebaseapp.com",
  projectId: "ctrlwebapp",
  storageBucket: "ctrlwebapp.firebasestorage.app",
  messagingSenderId: "147944979842",
  appId: "1:147944979842:web:657eb4b576a7018c18a39b"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);