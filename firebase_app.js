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
  { level: 1, req: 0, piecesAwarded: 0 },
  { level: 2, req: 50, piecesAwarded: 2 },
  { level: 3, req: 150, piecesAwarded: 2 },
  { level: 4, req: 300, piecesAwarded: 2 },
  { level: 5, req: 500, piecesAwarded: 3 }
];

export const PUZZLE_THEMES = [
  {
    id: 'mona_lisa',
    name: '蒙娜麗莎',
    imagePrefix: 'assets/puzzle_mona_lisa/piece_',
    silhouette: 'assets/puzzle_mona_lisa/silhouette.png',
    totalPieces: 9,
    aspectRatio: '960 / 1431'
  }
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
    let data = userSnap.data();
    
    // Migration: Convert old treasures to puzzle pieces if they haven't been migrated yet
    if (data.treasures && data.treasures.length > 0 && (!data.puzzlePieces || data.puzzlePieces.length === 0)) {
      console.log("Migrating old treasures to puzzle pieces for user:", uid);
      const level = data.level || 1;
      let pieces = [];
      let pieceCount = 0;
      for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
        if (LEVEL_THRESHOLDS[i].level <= level) {
          pieceCount += (LEVEL_THRESHOLDS[i].piecesAwarded || 0);
        }
      }
      for (let i = 0; i < pieceCount && i < 9; i++) {
        pieces.push(i);
      }
      
      data.puzzlePieces = pieces;
      data.currentPuzzleId = 'mona_lisa';
      // Keep treasures for safety but prioritize puzzlePieces in UI
      await updateDoc(userRef, { 
        puzzlePieces: data.puzzlePieces,
        currentPuzzleId: data.currentPuzzleId
      });
    }

    // Ensure default puzzle fields
    if (!data.puzzlePieces) data.puzzlePieces = [];
    if (!data.currentPuzzleId) data.currentPuzzleId = 'mona_lisa';

    return data;
  } else {
    // Create default profile
    const defaultProfile = {
      uid,
      email,
      nickname: email.split('@')[0],
      avatar: 'male_1.png', // New default avatar
      totalQuestions: 0,
      totalTime: 0, // in seconds
      level: 1,
      puzzlePieces: [],
      currentPuzzleId: 'mona_lisa',
      profileCompleted: false,
      role: '', // teacher or student
      realName: '',
      school: '',
      teacherSubject: '',
      studentDept: ''
    };
    await setDoc(userRef, defaultProfile);
    return defaultProfile;
  }
}

export async function updateUserProfile(uid, data) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, data);
}

export async function syncUserStats(uid, scoreOrUpdate, totalQuestions, totalTime, practicedQuestionIds = []) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) return null;
  const data = userSnap.data();
  
  let updateData = {};

  if (typeof scoreOrUpdate === 'object' && scoreOrUpdate !== null && !Array.isArray(scoreOrUpdate)) {
    updateData = { ...scoreOrUpdate };
  } else {
    const qCount = Number(totalQuestions) || 0;
    const tTime = Number(totalTime) || 0;
    
    updateData.totalQuestions = (Number(data.totalQuestions) || 0) + qCount;
    updateData.totalTime = (Number(data.totalTime) || 0) + tTime;
    
    const questionStats = data.questionStats || {};
    if (Array.isArray(practicedQuestionIds)) {
        practicedQuestionIds.forEach(id => {
            questionStats[id] = (questionStats[id] || 0) + 1;
        });
    }
    updateData.questionStats = questionStats;
  }

  const oldLevel = Number(data.level) || 1;
  let newLevel = oldLevel;

  // Auto-recalculate level if questions updated
  if (updateData.totalQuestions !== undefined) {
    newLevel = 1;
    for (const threshold of LEVEL_THRESHOLDS) {
      if (updateData.totalQuestions >= threshold.req) {
        newLevel = threshold.level;
      }
    }
    updateData.level = newLevel;
  }

  let newPieces = [];
  const currentPieces = [...(data.puzzlePieces || [])];
  
  if (newLevel > oldLevel) {
    for (let l = oldLevel + 1; l <= newLevel; l++) {
      const threshold = LEVEL_THRESHOLDS.find(t => t.level === l);
      if (threshold && threshold.piecesAwarded > 0) {
        const startIdx = currentPieces.length;
        const count = threshold.piecesAwarded;
        for (let i = 0; i < count; i++) {
          const pieceIdx = startIdx + i;
          if (pieceIdx < 9 && !currentPieces.includes(pieceIdx)) {
            currentPieces.push(pieceIdx);
            newPieces.push(pieceIdx);
          }
        }
      }
    }
    updateData.puzzlePieces = currentPieces;
  }

  await updateDoc(userRef, updateData);

  return {
    leveledUp: newLevel > oldLevel,
    newLevel,
    newPieces,
    totalQuestions: newTotalQuestions,
    totalTime: newTotalTime,
    puzzlePieces: updateData.puzzlePieces || data.puzzlePieces
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

// Admin only functions
export async function getAllUsers() {
  const q = query(collection(db, "users"), orderBy("totalQuestions", "desc"), limit(100));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
}

export async function getAllPracticeRecords(limitCount = 50) {
  const q = query(collection(db, "practice_records"), orderBy("timestamp", "desc"), limit(limitCount));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
}

export async function getUserPracticeRecords(uid, limitCount = 50) {
  const q = query(
    collection(db, "practice_records"), 
    where("uid", "==", uid)
  );
  const querySnapshot = await getDocs(q);
  const docs = querySnapshot.docs.map(doc => doc.data());
  
  // Sort locally to avoid needing a composite index in Firestore
  const getTime = t => t ? (t.toMillis ? t.toMillis() : (t.getTime ? t.getTime() : 0)) : 0;
  docs.sort((a, b) => getTime(b.timestamp) - getTime(a.timestamp));
  
  return docs.slice(0, limitCount);
}
