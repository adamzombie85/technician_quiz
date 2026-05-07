import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy, limit, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

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
export const loginWithGoogleRedirect = () => signInWithRedirect(auth, googleProvider);
export const handleRedirectResult = () => getRedirectResult(auth);
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

// User Profile & Leveling System
export const LEVEL_THRESHOLDS = [
  { level: 1, req: 0, treasure: null, icon: '' },
  { level: 2, req: 50, treasure: '木劍', icon: 'fa-khanda' },
  { level: 3, req: 150, treasure: '鐵盾', icon: 'fa-shield' },
  { level: 4, req: 300, treasure: '魔法披風', icon: 'fa-hat-wizard' },
  { level: 5, req: 500, treasure: '王者之劍', icon: 'fa-sword' }
];

export function calculateLevel(totalQuestions) {
  let currentLevel = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalQuestions >= LEVEL_THRESHOLDS[i].req) {
      currentLevel = LEVEL_THRESHOLDS[i].level;
      break;
    }
  }
  return currentLevel;
}

export async function getUserProfile(uid, email) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    return userSnap.data();
  } else {
    // Create default profile
    const defaultProfile = {
      uid,
      email,
      nickname: email.split('@')[0],
      avatar: 'fa-cat', // Default avatar
      totalQuestions: 0,
      totalTime: 0, // in seconds
      level: 1,
      treasures: []
    };
    await setDoc(userRef, defaultProfile);
    return defaultProfile;
  }
}

export async function updateUserProfile(uid, data) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, data);
}

export async function syncUserStats(uid, addedQuestions, addedTimeStr) {
  const [m, s] = addedTimeStr.split(':').map(Number);
  const addedSeconds = m * 60 + s;

  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return null;

  const data = userSnap.data();
  const newTotalQuestions = (data.totalQuestions || 0) + addedQuestions;
  const newTotalTime = (data.totalTime || 0) + addedSeconds;
  
  const oldLevel = data.level || 1;
  const newLevel = calculateLevel(newTotalQuestions);
  
  const updates = {
    totalQuestions: newTotalQuestions,
    totalTime: newTotalTime,
    level: newLevel
  };

  let newTreasures = [];
  if (newLevel > oldLevel) {
    const currentTreasures = data.treasures || [];
    for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
       const t = LEVEL_THRESHOLDS[i];
       if (t.level > oldLevel && t.level <= newLevel && t.treasure) {
           const treasureObj = { name: t.treasure, icon: t.icon };
           currentTreasures.push(treasureObj);
           newTreasures.push(treasureObj);
       }
    }
    updates.treasures = currentTreasures;
  }

  await updateDoc(userRef, updates);

  return {
    leveledUp: newLevel > oldLevel,
    newLevel,
    newTreasures,
    totalQuestions: newTotalQuestions,
    totalTime: newTotalTime,
    treasures: updates.treasures || data.treasures
  };
}

export async function getGlobalLeaderboard() {
  const q = query(
    collection(db, "users"),
    orderBy("totalQuestions", "desc"),
    limit(20)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
}
