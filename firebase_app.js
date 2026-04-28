import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAAHbfwLcqeXEk32Oc7q9kUFf9rLCn5I6c",
  authDomain: "pingkipquiz.firebaseapp.com",
  projectId: "pingkipquiz",
  storageBucket: "pingkipquiz.firebasestorage.app",
  messagingSenderId: "838722993256",
  appId: "1:838722993256:web:6eb2b4c79a000cfb248fdd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Authentication helper functions
const googleProvider = new GoogleAuthProvider();
export const loginUser = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const registerUser = (email, password) => createUserWithEmailAndPassword(auth, email, password);
export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logoutUser = () => signOut(auth);

// Database helper functions
export async function savePracticeRecord(record) {
  try {
    await addDoc(collection(db, "practice_records"), {
      ...record,
      timestamp: new Date()
    });
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
}

export async function getUserHistory(uid) {
  const q = query(
    collection(db, "practice_records"), 
    where("uid", "==", uid)
  );
  const querySnapshot = await getDocs(q);
  const docs = querySnapshot.docs.map(doc => doc.data());
  
  // Safely get time whether it's a Firestore Timestamp or JS Date
  const getTime = t => t ? (t.toMillis ? t.toMillis() : (t.getTime ? t.getTime() : 0)) : 0;
  
  // Sort descending by timestamp locally
  docs.sort((a, b) => getTime(b.timestamp) - getTime(a.timestamp));
  return docs.slice(0, 20);
}
