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
  { level: 1, name: '新手勇者', req: 0, piecesAwarded: 0 },
  { level: 2, name: '見習戰士', req: 20, piecesAwarded: 1 },
  { level: 3, name: '初級守護者', req: 60, piecesAwarded: 1 },
  { level: 4, name: '精銳衛兵', req: 120, piecesAwarded: 1 },
  { level: 5, name: '資深騎士', req: 200, piecesAwarded: 1 },
  { level: 6, name: '名譽百夫長', req: 300, piecesAwarded: 1 },
  { level: 7, name: '王國統領', req: 420, piecesAwarded: 1 },
  { level: 8, name: '神聖將軍', req: 560, piecesAwarded: 1 },
  { level: 9, name: '永恆之劍', req: 720, piecesAwarded: 1 },
  { level: 10, name: '傳奇英雄', req: 900, piecesAwarded: 2 },
  { level: 11, name: '聖域守望者', req: 1100, piecesAwarded: 1 },
  { level: 12, name: '大魔導士', req: 1320, piecesAwarded: 1 },
  { level: 13, name: '龍騎士', req: 1560, piecesAwarded: 1 },
  { level: 14, name: '光輝大元帥', req: 1820, piecesAwarded: 1 },
  { level: 15, name: '弒神者', req: 2100, piecesAwarded: 2 },
  { level: 16, name: '真·勇者', req: 2400, piecesAwarded: 1 },
  { level: 17, name: '位面旅者', req: 2720, piecesAwarded: 1 },
  { level: 18, name: '創世神徒', req: 3060, piecesAwarded: 1 },
  { level: 19, name: '無盡霸主', req: 3420, piecesAwarded: 1 },
  { level: 20, name: '萬古至尊', req: 3800, piecesAwarded: 5 }
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

export const TERRITORY_CONFIG = {
  unlockThreshold: 100, // Correct answers to unlock
  productionTime: 48 * 60 * 60 * 1000, // 48 hours in milliseconds
  synthesis: {
    pudding: { egg: 1, milk: 1, gold: 200, reward: 2000 },
    potion: { milk: 2, gold: 50, reward: 'heal_20' }
  },
  pawnShop: {
    egg: 5,
    milk: 5,
    pudding: 2000
  }
};

export const WARRIOR_SKILLS = [
  { name: "基礎斬擊", power: [5, 15], msg: "使出了俐落的斬擊！" },
  { name: "重磅打擊", power: [10, 20], msg: "發動了充滿力量的重擊！" },
  { name: "迴旋踢", power: [8, 12], msg: "使出華麗的迴旋踢！" },
  { name: "聖光裁決", power: [15, 25], msg: "召喚聖光進行審判！" },
  { name: "暗影突襲", power: [12, 28], msg: "從陰影中發動突襲！" },
  { name: "雷霆一擊", power: [20, 30], msg: "降下雷霆重創對手！" },
  { name: "烈焰風暴", power: [18, 26], msg: "召喚烈焰席捲戰場！" },
  { name: "冰封陵墓", power: [10, 30], msg: "將對手封印在冰霜中！" },
  { name: "幻影劍舞", power: [22, 28], msg: "揮舞出無數劍影！" },
  { name: "破軍升龍擊", power: [15, 25], msg: "強力的衝撞接續升龍斬！" },
  { name: "猛龍斷空斬", power: [20, 30], msg: "化身猛龍穿梭戰場！" },
  { name: "拔刀斬", power: [25, 30], msg: "極速的一閃，空間彷彿裂開！" },
  { name: "怒氣爆發", power: [10, 25], msg: "釋放積累的怒氣衝擊對手！" },
  { name: "嗜魂封魔斬", power: [15, 20], msg: "吸取靈魂並發動強力一擊！" },
  { name: "崩山裂地斬", power: [25, 30], msg: "躍起並重重劈向地面！" },
  { name: "地裂波動劍", power: [5, 15], msg: "在大地引發波動衝擊！" },
  { name: "修羅邪光斬", power: [18, 25], msg: "發出巨大的邪光波動！" },
  { name: "爆炎波動劍", power: [20, 28], msg: "噴射火熱的波動氣息！" },
  { name: "冰刃波動劍", power: [15, 22], msg: "射出極寒的冰霜之刃！" },
  { name: "不動明王陣", power: [25, 30], msg: "召喚法陣禁錮並摧毀對手！" }
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
    if (!data.skills || data.skills.length === 0) {
      data.skills = WARRIOR_SKILLS.slice(0, 3);
      await updateDoc(userRef, { skills: data.skills });
    }

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
      studentDept: '',
      gold: 0,
      inventory: { egg: 0, milk: 0, pudding: 0 },
      territory: {
        isUnlocked: false,
        lands: []
      }
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

  // Award new skill on level up
  if (newLevel > oldLevel) {
    const currentSkills = data.skills || WARRIOR_SKILLS.slice(0, 3);
    const availableSkills = WARRIOR_SKILLS.filter(s => !currentSkills.some(cs => cs.name === s.name));
    if (availableSkills.length > 0) {
      const newSkill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
      updateData.skills = [...currentSkills, newSkill];
    }
  }

  if (scoreOrUpdate && scoreOrUpdate.honorMessage !== undefined) {
    updateData.honorMessage = scoreOrUpdate.honorMessage.substring(0, 20);
  }

  // Territory Unlock Logic
  const currentTotalCorrect = updateData.totalQuestions || data.totalQuestions;
  const isUnlocked = data.territory ? data.territory.isUnlocked : false;
  
  if (currentTotalCorrect >= TERRITORY_CONFIG.unlockThreshold && !isUnlocked) {
    updateData.territory = {
      isUnlocked: true,
      lands: [
        { id: 'L1', type: 'farm', level: 1, lastHarvest: new Date() }
      ]
    };
  }

  await updateDoc(userRef, updateData);

  const leveledUp = newLevel > oldLevel;
  const territoryUnlocked = currentTotalCorrect >= TERRITORY_CONFIG.unlockThreshold && !isUnlocked;

  return {
    leveledUp,
    territoryUnlocked,
    newLevel,
    newPieces,
    totalQuestions: updateData.totalQuestions || data.totalQuestions,
    totalTime: updateData.totalTime || data.totalTime,
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

export async function processBattleResult(challengerUid, opponentUid, betAmount, isWin) {
  const challengerRef = doc(db, "users", challengerUid);
  const opponentRef = doc(db, "users", opponentUid);
  
  const challengerSnap = await getDoc(challengerRef);
  const opponentSnap = await getDoc(opponentRef);
  
  if (!challengerSnap.exists() || !opponentSnap.exists()) return;
  
  const challengerData = challengerSnap.data();
  const opponentData = opponentSnap.data();
  
  const bet = Number(betAmount);
  
  if (isWin) {
    // Challenger wins: gains 2x bet, Opponent loses 1x bet
    await updateDoc(challengerRef, { gold: (Number(challengerData.gold) || 0) + (bet * 2) });
    await updateDoc(opponentRef, { gold: Math.max(0, (Number(opponentData.gold) || 0) - bet) });
  } else {
    // Challenger loses: loses 1x bet, Opponent gains 1x bet
    await updateDoc(challengerRef, { gold: Math.max(0, (Number(challengerData.gold) || 0) - bet) });
    await updateDoc(opponentRef, { gold: (Number(opponentData.gold) || 0) + bet });
  }
}

export async function getUserProgress(uid) {
  const progressRef = doc(db, "user_progress", uid);
  const progressSnap = await getDoc(progressRef);
  if (progressSnap.exists()) {
    return progressSnap.data();
  } else {
    const defaultProgress = { scores: {} };
    await setDoc(progressRef, defaultProgress);
    return defaultProgress;
  }
}

export async function updateUserProgress(uid, progress) {
  const progressRef = doc(db, "user_progress", uid);
  await setDoc(progressRef, progress, { merge: true });
}
