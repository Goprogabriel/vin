// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD4yy-cIUCS65pxgca1sJ4rdMhGxshMoWQ",
  authDomain: "vinnoget.firebaseapp.com",
  projectId: "vinnoget",
  storageBucket: "vinnoget.firebasestorage.app",
  messagingSenderId: "758247587410",
  appId: "1:758247587410:web:f92fdbb8f4d7fcb61ea98b",
  measurementId: "G-LDX4JKQH69"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export default app;
