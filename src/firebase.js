import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCgmD3tXjNX4HB5xj4mis7NVDnzgD6C738",
  authDomain: "lightpulse-c0d95.firebaseapp.com",
  projectId: "lightpulse-c0d95",
  storageBucket: "lightpulse-c0d95.firebasestorage.app",
  messagingSenderId: "669911437123",
  appId: "1:669911437123:web:26a9c73c51ddb0966b69f6"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
