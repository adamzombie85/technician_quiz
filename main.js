import { 
  auth, loginUser, registerUser, loginWithGoogle, loginWithGoogleRedirect, 
  handleRedirectResult, logoutUser, savePracticeRecord, getUserHistory, 
  getUserProfile, updateUserProfile, syncUserStats, getGlobalLeaderboard, 
  LEVEL_THRESHOLDS, PUZZLE_THEMES, TERRITORY_CONFIG, getAllUsers, 
  getAllPracticeRecords, getUserPracticeRecords, processBattleResult, 
  WARRIOR_SKILLS, checkUserAuthorization, getAllTeachers, addTeacher, 
  deleteTeacher, getStudentsOfTeacher, addStudent, deleteStudent, 
  submitUserFeedback, getAllFeedbacks, getFeedbacksOfUser, replyToFeedback 
} from './firebase_app.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import * as THREE from "three";
import { OrbitControls } from "https://unpkg.com/three@0.128.0/examples/jsm/controls/OrbitControls.js";
import { fetchMyTasks, saveRecordToGAS, saveTaskToGAS } from './api_sync.js';

// Main Application Logic
if (window.location.protocol === 'file:') {
    alert('偵測到您正以檔案模式 (file://) 開啟網頁。由於瀏覽器安全性限制，Firebase 與 ES 模組可能無法運作。建議使用 local server (如 VS Code Live Server) 開啟。');
}

const state = {
    currentUser: null,
    allQuestions: [],
    filteredQuestions: [],
    currentQuestionIndex: 0,
    score: 0,
    startTime: null,
    timerInterval: null,
    wrongQuestions: [],
    selectedSubject: '',
    config: {
        // 使用本地 JSON 檔案
        subjectMap: {
            'chinese_pasta': { name: '[丙級學科題庫] 中式麵食加工', file: '[丙級學科題庫] 中式麵食加工.json' },
            'beverage': { name: '[丙級學科題庫] 飲料調製', file: '[丙級學科題庫] 飲料調製.json' },
            'technical': { name: '（共同科目）技術士技能檢定', file: '技術士技能檢定學科測試共同題庫.json' },
            'food_safety': { name: '（共同科目）食品安全衛生', file: '[共同科目題庫] 食品安全衛生及營養相關職類.json' },
            'baking': { name: '[丙級學科題庫] 烘焙食品', file: '[丙級學科題庫] 烘焙食品.json' }
        }
    },
    cachedData: {}, // subjectKey -> questions
    userProfile: null,
    practicedQuestionIds: [],
    paintings: {
        '李奧納多·達文西「蒙娜麗莎」': { artist: '李奧納多·達文西', title: '蒙娜麗莎', file: '李奧納多·達文西「蒙娜麗莎」.jpg', value: 10000, ratio: '960/1431' },
        '陳澄波「淡水夕照」': { artist: '陳澄波', title: '淡水夕照', file: '陳澄波「淡水夕照」.jpg', value: 8000, ratio: '1/1' },
        '約翰尼斯·維梅爾「戴珍珠耳環的少女」': { artist: '約翰尼斯·維梅爾', title: '戴珍珠耳環的少女', file: '約翰尼斯·維梅爾「戴珍珠耳環的少女」.webp', value: 9000, ratio: '390/445' },
        '葛飾北齋「神奈川沖浪裏」': { artist: '葛飾北齋', title: '神奈川沖浪裏', file: '葛飾北齋「神奈川沖浪裏」.webp', value: 7500, ratio: '1600/1091' },
        '古斯塔夫·克林姆「吻」': { artist: '古斯塔夫·克林姆', title: '吻', file: '古斯塔夫·克林姆「吻」.jpg', value: 8500, ratio: '1/1' },
        '愛德華·孟克「吶喊」': { artist: '愛德華·孟克', title: '吶喊', file: '愛德華·孟克「吶喊」.jpg', value: 8200, ratio: '735/914' },
        '喬治·秀拉「大碗島的星期天下午」': { artist: '喬治·秀拉', title: '大碗島的星期天下午', file: '喬治·秀拉「大碗島的星期天下午」.jpg', value: 8800, ratio: '3072/2048' },
        '桑德羅·波提且利「維納斯的誕生」': { artist: '桑德羅·波提且利', title: '維納斯的誕生', file: '桑德羅·波提且利「維納斯的誕生」.jpg', value: 9500, ratio: '1728/1101' },
        '薩爾瓦多·達利「記憶的堅持」': { artist: '薩爾瓦多·達利', title: '記憶的堅持', file: '薩爾瓦多·達利「記憶的堅持」.jpg', value: 7800, ratio: '330/240' },
        '格蘭特·伍德「美國哥德式」': { artist: '格蘭特·伍德', title: '美國哥德式', file: '格蘭特·伍德「美國哥德式」.jpg', value: 7200, ratio: '633/768' },
        '傑克森·波洛克「融合」': { artist: '傑克森·波洛克', title: '融合', file: '傑克森·波洛克「融合」.jpg', value: 6500, ratio: '2430/1180' },
        '巴勃羅·畢卡索「格爾尼卡」': { artist: '巴勃羅·畢卡索', title: '格爾尼卡', file: '巴勃羅·畢卡索「格爾尼卡」.png', value: 12000, ratio: '776/349' }
    },
    lootPool: [
        { name: '生鏽的鐵劍', icon: '⚔️', price: 50 },
        { name: '破舊的皮盾', icon: '🛡️', price: 30 },
        { name: '魔力藥水', icon: '🧪', price: 100 },
        { name: '勇者披風', icon: '🧥', price: 200 },
        { name: '幸運護符', icon: '🧿', price: 150 },
        { name: '挑戰的鱗片', icon: '💎', price: 500 },
        { name: '古老的神像', icon: '🗿', price: 1000 }
    ],
    monsterPool: [
        { name: '邪惡巨龍', icon: 'fa-dragon', hp: 100, color: '#ef4444' },
        { name: '劇毒史萊姆', icon: 'fa-disease', hp: 50, color: '#10b981' },
        { name: '貪婪哥布林', icon: 'fa-hat-wizard', hp: 60, color: '#f59e0b' },
        { name: '不死骷髏', icon: 'fa-skull', hp: 80, color: '#94a3b8' },
        { name: '感染殭屍', icon: 'fa-biohazard', hp: 70, color: '#8b5cf6' }
    ],
    currentMonster: null,
    heroHp: 100,
    isRetryMode: false,
    goldPerQuestion: 0,
    leaderboardCache: null, // Memory cache for leaderboard
    battle: {
        isBattling: false,
        opponent: null,
        bet: 100
    },
    userProgress: { scores: {} },
    pendingProgressUpdates: false,
    territoryInterval: null,
    userRole: '', // 'admin', 'teacher', 'student'
    userAuthorized: false,
    three: {
        renderer: null,
        scene: null,
        camera: null,
        controls: null,
        tiles: [],          // 36 cell mesh array
        buildings: {},      // 'x_y' -> THREE.Group
        selectedCoords: { x: 2, y: 2 },
        selectionBox: null,
        isVisiting: false,
        visitedProfile: null,
        animatingHearts: []  // for 3D blessings
    }
};

// Unique Question ID Helper
function getQuestionId(q, index) {
    if (q.id && q.id !== null) return q.id;
    // Fallback: combination of category and a hash of the question text
    const cleanCat = (q.category || 'misc').replace(/[^a-zA-Z0-9]/g, '');
    const hash = q.question.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);
    return `${cleanCat}_${Math.abs(hash)}`;
}

// DOM Elements
const elements = {
    setupScreen: document.getElementById('setup-screen'),
    quizScreen: document.getElementById('quiz-screen'),
    resultScreen: document.getElementById('result-screen'),
    subjectSelect: document.getElementById('subject-select'),
    subOptions: document.getElementById('sub-options'),
    filterType: document.getElementById('filter-type'),
    filterValueContainer: document.getElementById('filter-value-container'),
    filterValueLabel: document.getElementById('filter-value-label'),
    filterValue: document.getElementById('filter-value'),
    questionCount: document.getElementById('question-count'),
    startBtn: document.getElementById('start-btn'),
    timer: document.getElementById('timer'),
    progress: document.getElementById('progress'),
    questionText: document.getElementById('question-text'),
    optionsContainer: document.getElementById('options-container'),
    dragonHp: document.getElementById('dragon-hp'),
    dragonHpText: document.getElementById('dragon-hp-text'),
    dragonSprite: document.getElementById('dragon-sprite'),
    heroSprite: document.getElementById('hero-sprite'),
    slashEffect: document.getElementById('slash-effect'),
    finalTime: document.getElementById('final-time'),
    finalScore: document.getElementById('final-score'),
    victoryMessage: document.getElementById('victory-message'),
    reviewList: document.getElementById('review-list'),
    retryWrongBtn: document.getElementById('retry-wrong-btn'),
    restartBtn: document.getElementById('restart-btn'),
    exportBtn: document.getElementById('export-btn'),
    keywordContainer: document.getElementById('keyword-search-container'),
    keywordInput: document.getElementById('keyword-input'),
    ttsBtn: document.getElementById('tts-btn'),
    a11yModal: document.getElementById('a11y-modal'),
    a11yFontsize: document.getElementById('a11y-fontsize'),
    a11yContrast: document.getElementById('a11y-contrast'),
    a11yFont: document.getElementById('a11y-font'),
    a11yTts: document.getElementById('a11y-tts'),
    authBtn: document.getElementById('auth-btn'),
    authModal: document.getElementById('auth-modal'),
    authTitle: document.getElementById('auth-title'),
    authGoogleBtn: document.getElementById('auth-google-btn'),
    leaderboardModal: document.getElementById('leaderboard-modal'),
    leaderboardBody: document.getElementById('leaderboard-body'),
    loadingOverlay: document.getElementById('loading-overlay'),
    userAvatarBtn: document.getElementById('user-avatar-btn'),
    profileModal: document.getElementById('profile-modal'),
    practiceMode: document.getElementById('practice-mode'),
    immediateExpContainer: document.getElementById('immediate-explanation-container'),
    immediateExpText: document.getElementById('immediate-explanation-text'),
    nextQuestionBtn: document.getElementById('next-question-btn'),
    giveUpBtn: document.getElementById('give-up-btn'),
    levelupModal: document.getElementById('levelup-modal'),
    newLevelText: document.getElementById('new-level-text'),
    newTreasureContainer: document.getElementById('new-treasure-container'),
    newTreasureIcon: document.getElementById('new-treasure-icon'),
    newTreasureName: document.getElementById('new-treasure-name'),
    adminBtn: document.getElementById('admin-btn'),
    teacherBtn: document.getElementById('teacher-btn'),
    openFeedbackBtn: document.getElementById('open-feedback-btn'),
    musicToggleBtn: document.getElementById('music-toggle-btn'),
    bgMusic: document.getElementById('bg-music'),
    musicTrackSelect: document.getElementById('music-track-select'),
    musicVolumeSlider: document.getElementById('music-volume-slider'),
    musicEnabledToggle: document.getElementById('music-enabled-toggle'),
    volumeValue: document.getElementById('volume-value'),
    openGalleryBtn: document.getElementById('open-gallery-btn'),
    openPawnBtn: document.getElementById('open-pawn-btn'),
    galleryModal: document.getElementById('gallery-modal'),
    pawnModal: document.getElementById('pawn-modal'),
    galleryContainer: document.getElementById('gallery-container'),
    pawnInventory: document.getElementById('pawn-inventory'),
    profileGold: document.getElementById('profile-gold'),
    paintingViewerModal: document.getElementById('painting-viewer-modal'),
    viewerImg: document.getElementById('viewer-img'),
    viewerTitle: document.getElementById('viewer-title'),
    viewerArtist: document.getElementById('viewer-artist'),
    battleResultModal: document.getElementById('battle-result-modal'),
    battleResultContent: document.getElementById('battle-result-content'),
    heroHpBar: document.getElementById('hero-hp'),
    heroHpText: document.getElementById('hero-hp-text'),
    monsterNameLabel: document.getElementById('monster-name-label'),
    territoryBtn: document.getElementById('territory-btn'),
    territoryModal: document.getElementById('territory-modal'),
    territoryGrid: document.getElementById('territory-grid'),
    kitchenRecipes: document.getElementById('kitchen-recipes'),
    territoryPawnInventory: document.getElementById('territory-pawn-inventory'),
    territoryGold: document.getElementById('territory-gold'),
    territoryEgg: document.getElementById('territory-egg'),
    territoryMilk: document.getElementById('territory-milk'),
    territoryPudding: document.getElementById('territory-pudding'),
    territoryMango: document.getElementById('territory-mango'),
    territoryMangoSeeds: document.getElementById('territory-mango-seeds'),
    threeCanvasContainer: document.getElementById('three-canvas-container'),
    threeLoading: document.getElementById('three-loading'),
    selectedCoords: document.getElementById('selected-coords'),
    selectedStatus: document.getElementById('selected-status'),
    selectedDesc: document.getElementById('selected-desc'),
    landmarkPhotoContainer: document.getElementById('landmark-photo-container'),
    landmarkPhotoImg: document.getElementById('landmark-photo-img'),
    cellActionButtons: document.getElementById('cell-action-buttons'),
    buildOptionsList: document.getElementById('build-options-list'),
    teacherBtn: document.getElementById('teacher-btn'),
    openFeedbackBtn: document.getElementById('open-feedback-btn'),
    feedbackModal: document.getElementById('feedback-modal'),
    teacherModal: document.getElementById('teacher-modal'),
    ttsSpeakSceneBtn: document.getElementById('tts-speak-scene-btn'),
    globalPreloader: document.getElementById('global-preloader'),
    preloaderBar: document.getElementById('preloader-bar'),
    preloaderStatus: document.getElementById('preloader-status'),
    challengeModal: document.getElementById('challenge-modal'),
    battleConsoleModal: document.getElementById('battle-console-modal'),
    dosLog: document.getElementById('dos-log'),
    betDisplay: document.getElementById('bet-display'),
    confirmChallengeBtn: document.getElementById('confirm-challenge-btn'),
    challengeOpponentName: document.getElementById('challenge-opponent-name'),
    challengeOpponentLevel: document.getElementById('challenge-opponent-level'),
    challengeOpponentAvatar: document.getElementById('challenge-opponent-avatar'),
    closeDosBtn: document.getElementById('close-dos-btn'),
    battleConsoleTimer: document.getElementById('battle-console-timer'),
    openChallengeListBtn: document.getElementById('open-challenge-list-btn'),
    challengeSelectionModal: document.getElementById('challenge-selection-modal'),
    challengeListContainer: document.getElementById('challenge-list-container'),
    masterySection: document.getElementById('mastery-section'),
    masteryStatsContainer: document.getElementById('mastery-stats-container'),
    questionStarsContainer: document.getElementById('question-stars-container')
};

let isLoginMode = true;
let selectedAvatarIcon = 'fa-cat';

// Initialize
elements.subjectSelect.addEventListener('change', handleSubjectChange);
elements.filterType.addEventListener('change', updateFilterOptions);
elements.filterValue.addEventListener('change', updateQuestionCountDropdown);
elements.keywordInput.addEventListener('input', updateQuestionCountDropdown);
elements.openChallengeListBtn?.addEventListener('click', openChallengeSelection);
document.getElementById('challenge-subject-select')?.addEventListener('change', handleChallengeSubjectChange);

// RPG System Listeners
elements.openGalleryBtn.addEventListener('click', () => {
    renderGallery();
    elements.galleryModal.classList.remove('hidden');
});

elements.openPawnBtn.addEventListener('click', () => {
    renderPawnShop();
    elements.pawnModal.classList.remove('hidden');
});

elements.openFeedbackBtn.addEventListener('click', async () => {
    document.getElementById('feedback-modal').classList.remove('hidden');
    await renderUserFeedbackHistory();
});

async function renderUserFeedbackHistory() {
    const historyDiv = document.getElementById('user-feedbacks-history');
    if (!historyDiv) return;
    historyDiv.innerHTML = '<p style="text-align: center; color: var(--text-dim);">載入中...</p>';
    
    try {
        const feedbacks = await getFeedbacksOfUser(state.currentUser.email);
        if (feedbacks.length === 0) {
            historyDiv.innerHTML = '<p style="text-align: center; color: var(--text-dim);">尚無任何建議回覆紀錄</p>';
            return;
        }
        
        historyDiv.innerHTML = feedbacks.map(f => {
            const time = f.timestamp ? (f.timestamp.toDate ? f.timestamp.toDate() : new Date(f.timestamp)) : new Date();
            const replyHtml = f.reply ? `
                <div style="background: rgba(76, 175, 80, 0.1); border-left: 2px solid var(--success); padding: 0.5rem; margin-top: 0.5rem; border-radius: 0.25rem; text-align: left;">
                    <div style="font-weight: bold; color: var(--success); font-size: 0.75rem;">管理者回覆：</div>
                    <div style="color: white; margin-top: 0.1rem;">${f.reply}</div>
                    <div style="font-size: 0.7rem; color: var(--text-dim); margin-top: 0.2rem;">${f.replyTime ? (f.replyTime.toDate ? f.replyTime.toDate() : new Date(f.replyTime)).toLocaleString() : ''}</div>
                </div>
            ` : `
                <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 0.25rem; font-style: italic; text-align: left;">等待管理者處理中...</div>
            `;
            
            return `
                <div class="glass-card" style="margin-bottom: 0.75rem; padding: 0.75rem; background: rgba(255,255,255,0.03);">
                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-dim); margin-bottom: 0.25rem;">
                        <span><i class="fas fa-clock"></i> ${time.toLocaleString()}</span>
                    </div>
                    <div style="color: var(--gold); text-align: left;">${f.content}</div>
                    ${replyHtml}
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error(e);
        historyDiv.innerHTML = '<p style="text-align: center; color: var(--danger);">載入歷史紀錄失敗</p>';
    }
}

window.closeBattleResult = async () => {
    const honorInput = document.getElementById('honor-message-input');
    if (honorInput && honorInput.value !== (state.userProfile.honorMessage || '')) {
        try {
            await syncUserStats(state.currentUser.uid, { honorMessage: honorInput.value });
            state.userProfile.honorMessage = honorInput.value;
        } catch (e) { console.error("Failed to save honor message", e); }
    }
    elements.battleResultModal.classList.add('hidden');
};

function migrateUserData() {
    if (!state.userProfile) return;
    
    // 1. Migrate old puzzlePieces to new paintings object
    if (state.userProfile.puzzlePieces && state.userProfile.puzzlePieces.length > 0) {
        if (!state.userProfile.paintings) {
            state.userProfile.paintings = {};
        }
        
        // Map old themes to new names
        const themeMap = {
            'mona_lisa': '李奧納多·達文西「蒙娜麗莎」'
        };
        
        const currentThemeId = state.userProfile.currentPuzzleId || 'mona_lisa';
        const newName = themeMap[currentThemeId];
        
        if (newName && !state.userProfile.paintings[newName]) {
            const fragments = new Array(9).fill(false);
            state.userProfile.puzzlePieces.forEach(idx => {
                if (idx >= 0 && idx < 9) fragments[idx] = true;
            });
            state.userProfile.paintings[newName] = fragments;
            
            console.log("已遷移成就進度:", newName, state.userProfile.puzzlePieces);
            
            // Sync immediately after migration
            syncUserStats(state.currentUser.uid, { 
                paintings: state.userProfile.paintings 
            });
        }
    }
}

// Background Music Logic
let isMusicMuted = localStorage.getItem('music_muted') === 'true';
let musicVolume = parseFloat(localStorage.getItem('music_volume') || '0.5');
let musicTrack = localStorage.getItem('music_track') || 'sounds/Final_Palace_Ascent.mp3';

function updateMusicSettings() {
    elements.bgMusic.src = musicTrack;
    elements.bgMusic.volume = musicVolume;
    
    // Update UI elements
    elements.musicTrackSelect.value = musicTrack;
    elements.musicVolumeSlider.value = musicVolume;
    elements.volumeValue.textContent = `${Math.round(musicVolume * 100)}%`;
    elements.musicEnabledToggle.checked = !isMusicMuted;
    
    // Update quick toggle button
    if (elements.musicToggleBtn) {
        elements.musicToggleBtn.innerHTML = isMusicMuted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-music"></i>';
        elements.musicToggleBtn.style.color = isMusicMuted ? 'var(--text-dim)' : 'var(--gold)';
    }
}

function toggleMusic(forceState) {
    if (typeof forceState === 'boolean') {
        isMusicMuted = !forceState;
    } else {
        isMusicMuted = !isMusicMuted;
    }
    
    localStorage.setItem('music_muted', isMusicMuted);
    if (isMusicMuted) {
        elements.bgMusic.pause();
    } else {
        elements.// bgMusic.play().catch(e => console.log("Music play blocked:", e));
    }
    updateMusicSettings();
}

// Listeners for music settings in Profile Modal
elements.musicTrackSelect.addEventListener('change', (e) => {
    musicTrack = e.target.value;
    localStorage.setItem('music_track', musicTrack);
    elements.bgMusic.src = musicTrack;
    if (!isMusicMuted) elements.// bgMusic.play().catch(e => console.log("Play failed:", e));
});

elements.musicVolumeSlider.addEventListener('input', (e) => {
    musicVolume = parseFloat(e.target.value);
    localStorage.setItem('music_volume', musicVolume);
    elements.bgMusic.volume = musicVolume;
    elements.volumeValue.textContent = `${Math.round(musicVolume * 100)}%`;
});

elements.musicEnabledToggle.addEventListener('change', (e) => {
    toggleMusic(e.target.checked);
});

if (elements.musicToggleBtn) {
    elements.musicToggleBtn.addEventListener('click', () => toggleMusic());
}

// Handle Autoplay Policy
document.body.addEventListener('click', () => {
    if (!isMusicMuted && elements.bgMusic.paused) {
        elements.// bgMusic.play().catch(e => console.log("Still blocked:", e));
    }
}, { once: true });

// Initial Load
updateMusicSettings();
if (!isMusicMuted) {
    elements.// bgMusic.play().catch(e => console.log("Initial play blocked:", e));
}
elements.startBtn.addEventListener('click', startQuiz);
elements.retryWrongBtn.addEventListener('click', retryWrongQuestions);
elements.exportBtn.addEventListener('click', exportToText);
elements.nextQuestionBtn.addEventListener('click', advanceToNextQuestion);
elements.giveUpBtn.addEventListener('click', () => {
    if (confirm('確定要放棄並結算目前成績嗎？返回首頁後將會記錄您剛才練習的題數。')) {
        endQuiz(true);
    }
});

// Refactored Restart to keep music playing (No Page Reload)
elements.restartBtn.addEventListener('click', () => {
    state.allQuestions = [];
    state.filteredQuestions = [];
    state.currentQuestionIndex = 0;
    state.score = 0;
    state.startTime = null;
    state.wrongQuestions = [];
    
    // UI Reset
    elements.resultScreen.classList.add('hidden');
    elements.setupScreen.classList.remove('hidden');
    elements.subjectSelect.value = '';
    elements.subOptions.classList.add('hidden');
    
    // Dragon Reset
    elements.dragonSprite.classList.remove('dragon-die', 'dragon-hit');
    elements.dragonSprite.classList.add('dragon-idle');
    elements.dragonHp.style.width = '100%';
    elements.dragonHpText.textContent = '100%';
    
    // Stop timers
    if (state.timerInterval) clearInterval(state.timerInterval);
});

document.getElementById('site-title').addEventListener('click', () => {
    if (confirm('確定要回到首頁嗎？如果您正在測驗中，未結算的進度將會遺失。')) {
        // Just reset screens instead of reloading to keep music
        elements.quizScreen.classList.add('hidden');
        elements.resultScreen.classList.add('hidden');
        elements.setupScreen.classList.remove('hidden');
        if (state.timerInterval) clearInterval(state.timerInterval);
    }
});

// Auth Setup
const devMode = new URLSearchParams(window.location.search).get('devMode') === 'true';
const mockUser = {
    uid: "dev_mock_user_123",
    email: "dev_mock@example.com",
    displayName: "開發者勇者"
};

async function setupUserSession(user) {
    state.currentUser = user;
    const reqElements = document.querySelectorAll('.auth-required');
    if (user) {
        // 1. School Domain Validation Constraint
        const normalizedEmail = user.email ? user.email.trim().toLowerCase() : '';
        if (!devMode && normalizedEmail !== "adamzombie85@gmail.com" && !normalizedEmail.endsWith("@apps.ycvs.tn.edu.tw")) {
            alert("登入失敗：本網站僅限使用管理者信箱或學校網域信箱 (@apps.ycvs.tn.edu.tw) 進行登入！");
            state.currentUser = null;
            await logoutUser();
            return;
        }

        try {
            // 2. check teacher/student authorization
            let authStatus;
            if (devMode) {
                authStatus = { authorized: true, role: "admin" };
            } else {
                authStatus = await checkUserAuthorization(user.email);
            }

            if (!authStatus.authorized) {
                alert(`您的帳號 (${user.email}) 尚未在授權的名單內。\n\n如果您是學生，請向任課教師申請將您的 Email 加入班級學生名冊！`);
                state.currentUser = null;
                await logoutUser();
                return;
            }

            state.userRole = authStatus.role;
            state.userAuthorized = true;
            
            state.userProfile = await getUserProfile(user.uid, user.email);
            
            // Self-Healing for corrupted stats (NaN)
            if (isNaN(state.userProfile.totalQuestions) || state.userProfile.totalQuestions === null) {
                state.userProfile.totalQuestions = 0;
            }
            if (isNaN(state.userProfile.totalTime) || state.userProfile.totalTime === null) {
                state.userProfile.totalTime = 0;
            }
            if (isNaN(state.userProfile.level) || state.userProfile.level === null) {
                state.userProfile.level = 1;
            }
            if (isNaN(state.userProfile.gold) || state.userProfile.gold === null) {
                state.userProfile.gold = 0;
            }

            // Mock profile setup complete for devMode
            if (devMode) {
                state.userProfile.profileCompleted = true;
                state.userProfile.gold = Math.max(state.userProfile.gold, 2000); // Give plenty of gold to bet!
                state.userProfile.nickname = "開發者勇者";
            }

            // Migration for old puzzle data to new painting system
            migrateUserData();
            
            renderProfileAvatar();
            elements.userAvatarBtn.classList.remove('hidden');
            elements.authBtn.classList.add('hidden');
            
            // Mandatory Profile Setup Check
            if (!state.userProfile.profileCompleted) {
                setTimeout(() => {
                    window.toggleProfileModal();
                    // Hide close button if profile is incomplete
                    const closeBtn = document.getElementById('close-profile-modal');
                    if (closeBtn) closeBtn.style.display = 'none';
                }, 1000);
            } else {
                const closeBtn = document.getElementById('close-profile-modal');
                if (closeBtn) closeBtn.style.display = 'block';
            }
        } catch(e) {
            console.error("Failed to load profile:", e);
            // Fallback for when Firestore connection or permissions fail
            state.userProfile = {
                uid: user.uid,
                email: user.email,
                nickname: user.email ? user.email.split('@')[0] : '訪客勇者',
                avatar: 'male_1.png',
                level: 1,
                gold: 0,
                totalQuestions: 0,
                totalTime: 0,
                profileCompleted: true
            };
            
            renderProfileAvatar();
            elements.userAvatarBtn.classList.remove('hidden');
            elements.authBtn.classList.add('hidden');
            
            // Show alert for offline mode
            setTimeout(() => {
                const isOfflineMsgShown = sessionStorage.getItem('offlineMsgShown');
                if (!isOfflineMsgShown) {
                    alert('無法連線到資料庫讀取您的進度，系統目前以離線/訪客模式運行。這通常是因為資料庫權限已過期。');
                    sessionStorage.setItem('offlineMsgShown', 'true');
                }
            }, 1000);
        }
        
        // Show/hide buttons based on role
        if (state.userRole === 'admin') {
            elements.adminBtn.classList.remove('hidden');
            elements.teacherBtn.classList.add('hidden');
            elements.openFeedbackBtn.classList.remove('hidden');
        } else if (state.userRole === 'teacher') {
            elements.adminBtn.classList.add('hidden');
            elements.teacherBtn.classList.remove('hidden');
            elements.openFeedbackBtn.classList.remove('hidden');
        } else if (state.userRole === 'student') {
            elements.adminBtn.classList.add('hidden');
            elements.teacherBtn.classList.add('hidden');
            elements.openFeedbackBtn.classList.remove('hidden');
        }

        // Check for Territory Unlock
        if (state.userProfile.territory && state.userProfile.territory.isUnlocked) {
            elements.territoryBtn.classList.remove('hidden');
        } else {
            elements.territoryBtn.classList.add('hidden');
        }

        reqElements.forEach(el => el.classList.remove('hidden'));
    } else {
        state.userProfile = null;
        state.userRole = '';
        state.userAuthorized = false;
        elements.userAvatarBtn.classList.add('hidden');
        elements.authBtn.classList.remove('hidden');
        elements.adminBtn.classList.add('hidden');
        elements.teacherBtn.classList.add('hidden');
        elements.openFeedbackBtn.classList.add('hidden');
        reqElements.forEach(el => el.classList.add('hidden'));
    }
    // Always refresh leaderboard
    renderHomepageLeaderboard();

    // Load Mastery Progress
    if (user) {
        try {
            const { getUserProgress } = await import('./firebase_app.js');
            state.userProgress = await getUserProgress(user.uid);
            if (state.selectedSubject) renderMasteryStats();
            
            // Load Teacher Tasks from GAS
            await renderMyTasks(user.email);
        } catch (e) {
            console.error("Failed to load user progress:", e);
        }
    } else {
        state.userProgress = { scores: {} };
        const tasksList = document.getElementById('my-tasks-list');
        if (tasksList) tasksList.innerHTML = '<div style="text-align: center; color: var(--text-dim);">請先登入以查看任務</div>';
    }
}

async function renderMyTasks(email) {
    const tasksList = document.getElementById('my-tasks-list');
    if (!tasksList) return;
    
    tasksList.innerHTML = '<div style="text-align: center; color: var(--text-dim);">任務載入中...</div>';
    
    try {
        const tasks = await fetchMyTasks(email);
        if (tasks && tasks.length > 0) {
            let html = '';
            tasks.forEach(task => {
                html += `
                <div style="background: var(--card-bg); border-radius: 0.5rem; padding: 1rem; box-shadow: var(--shadow); border-left: 4px solid var(--success);">
                    <h4 style="margin: 0 0 0.5rem 0; color: var(--text-dark);">${task.subject}</h4>
                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem; color: var(--text-dim);">
                        <span><i class="far fa-calendar-alt"></i> ${task.startDate.split('T')[0]} ~ ${task.endDate.split('T')[0]}</span>
                        <span style="color: var(--success); font-weight: bold;">獎勵加倍中</span>
                    </div>
                </div>`;
            });
            tasksList.innerHTML = html;
        } else {
            tasksList.innerHTML = '<div style="text-align: center; color: var(--text-dim);">目前沒有指派任務</div>';
        }
    } catch (e) {
        console.error("Error rendering tasks:", e);
        tasksList.innerHTML = '<div style="text-align: center; color: var(--danger);">載入任務失敗</div>';
    }
}

if (devMode) {
    console.log("Dev Mode enabled. Mocking user session...");
    setupUserSession(mockUser);
} else {
    onAuthStateChanged(auth, setupUserSession);
}

// Check for redirect result on load
handleRedirectResult().then((result) => {
    if (result) {
        elements.authModal.classList.add('hidden');
        console.log("Redirect login success:", result.user);
    }
}).catch((err) => {
    console.error("Redirect login error:", err);
    elements.authError.textContent = 'Google 登入失敗：' + err.message;
    elements.authModal.classList.add('hidden');
});

window.toggleAuthModal = () => {
    if (state.currentUser) {
        logoutUser();
    } else {
        elements.authModal.classList.remove('hidden');
    }
};

elements.authGoogleBtn.addEventListener('click', async () => {
    try {
        // Detect if we are in a mobile webview (LINE, FB, etc.)
        const ua = navigator.userAgent || navigator.vendor || window.opera;
        const isWebView = /Line|FBAN|FBAV|Instagram/i.test(ua);

        if (isWebView) {
            await loginWithGoogleRedirect();
        } else {
            await loginWithGoogle();
            elements.authModal.classList.add('hidden');
        }
    } catch (err) {
        if (err.code === 'auth/popup-blocked') {
            alert('Google 登入失敗：瀏覽器攔截了彈窗，請點擊網址列右側允許彈窗，或更換瀏覽器。');
        } else {
            alert('Google 登入失敗：' + err.message);
        }
        console.error(err);
    } finally {
        elements.authGoogleBtn.disabled = false;
    }
});

// Helper function to parse CSV row (handles quotes)
function parseCSVLine(line) {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                cur += '"'; i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
        } else {
            cur += char;
        }
    }
    result.push(cur.trim());
    return result;
}

async function handleSubjectChange() {
    const val = elements.subjectSelect.value;
    if (!val) {
        elements.subOptions.classList.add('hidden');
        return;
    }

    state.selectedSubject = val;
    const subjectConfig = state.config.subjectMap[val];

    try {
        // 1. 檢查記憶體快取
        if (state.cachedData[val]) {
            state.allQuestions = state.cachedData[val];
            finishLoadingSubject();
            return;
        }

        // 2. 檢查 LocalStorage 持久化快取 (加上版本號以強制更新)
        const CACHE_VERSION = 'v4'; 
        const localCacheKey = `quiz_cache_${val}_${CACHE_VERSION}`;
        const savedData = localStorage.getItem(localCacheKey);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                state.cachedData[val] = parsed;
                state.allQuestions = parsed;
                finishLoadingSubject();
                return;
            } catch (e) {
                console.warn("Local storage cache corrupted, refetching...");
            }
        }

        // 3. 從網路下載 (分主題下載，減輕慢速網路負擔)
        showLoadingOverlay(true);
        elements.startBtn.disabled = true;
        elements.startBtn.textContent = '勇者下載中...';

        const response = await fetchWithRetry(encodeURIComponent(subjectConfig.file));
        const data = await response.json();

        // 存入記憶體與 LocalStorage
        state.cachedData[val] = data;
        state.allQuestions = data;
        localStorage.setItem(localCacheKey, JSON.stringify(data));

        finishLoadingSubject();
    } catch (err) {
        console.error('Failed to load questions:', err);
        alert('載入題庫失敗，請檢查網路連接。');
        elements.startBtn.disabled = false;
        elements.startBtn.innerHTML = '<i class="fas fa-sword"></i> 開始練習';
    } finally {
        showLoadingOverlay(false);
    }
}

function renderMasteryStats() {
    if (!state.selectedSubject || !state.allQuestions.length || !state.currentUser) {
        elements.masterySection.classList.add('hidden');
        return;
    }
    
    elements.masterySection.classList.remove('hidden');
    elements.masteryStatsContainer.innerHTML = '';
    
    // Group questions by category
    const categories = {};
    state.allQuestions.forEach(q => {
        const cat = q.category || '未分類';
        if (!categories[cat]) categories[cat] = { total: 0, earned: 0 };
        categories[cat].total++;
        
        // Get earned stars from userProgress
        const qId = getQuestionId(q);
        const score = (state.userProgress.scores[state.selectedSubject] && 
                      state.userProgress.scores[state.selectedSubject][cat] && 
                      state.userProgress.scores[state.selectedSubject][cat][qId]) || 0;
        categories[cat].earned += score;
    });
    
    const entries = Object.entries(categories).sort();
    if (entries.length === 0) {
        elements.masteryStatsContainer.innerHTML = '<div style="text-align: center; color: var(--text-dim); width: 100%;">暫無工作項目資料</div>';
        return;
    }

    // Render each category
    entries.forEach(([name, data]) => {
        const percent = Math.min(100, Math.round((data.earned / (data.total * 3)) * 100));
        
        const item = document.createElement('div');
        item.className = 'mastery-item';
        item.innerHTML = `
            <div class="mastery-info">
                <span class="mastery-label" title="${name}">${name}</span>
                <span class="mastery-percent">${percent}%</span>
            </div>
            <div class="mastery-bar-bg">
                <div class="mastery-bar-fill" style="width: ${percent}%"></div>
            </div>
            <div style="font-size: 0.65rem; color: var(--text-dim); margin-top: 0.4rem; text-align: right; display: flex; justify-content: space-between;">
                <span>${data.total} 題</span>
                <span>熟練度: ${data.earned} / ${data.total * 3} ⭐</span>
            </div>
        `;
        elements.masteryStatsContainer.appendChild(item);
    });
}

function finishLoadingSubject() {
    elements.subOptions.classList.remove('hidden');
    elements.startBtn.disabled = false;
    elements.startBtn.innerHTML = '<i class="fas fa-sword"></i> 開始練習';
    updateFilterOptions();
    renderMasteryStats();
}

// 支援重試機制的 Fetch (優化慢速網路)
async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response;
        } catch (e) {
            if (i === retries - 1) throw e;
            console.warn(`Fetch failed, retrying... (${i + 1}/${retries})`);
            await new Promise(r => setTimeout(r, 1000 * (i + 1))); // 指數退避
        }
    }
}

function showLoadingOverlay(show) {
    if (show) {
        elements.loadingOverlay.classList.remove('hidden');
    } else {
        elements.loadingOverlay.classList.add('hidden');
    }
}

function updateFilterOptions() {
    const type = elements.filterType.value;
    elements.filterValueContainer.classList.add('hidden');
    elements.keywordContainer.classList.add('hidden');

    if (type === 'random') return;

    if (type === 'keyword') {
        elements.keywordContainer.classList.remove('hidden');
        return;
    }

    const key = type === 'category' ? 'category' : 'knowledge_tag';
    elements.filterValueLabel.textContent = type === 'category' ? '工作項目' : '知識類別';

    const counts = {};
    state.allQuestions.forEach(q => {
        const val = q[key];
        if (val) counts[val] = (counts[val] || 0) + 1;
    });

    const options = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([val, count]) => `<option value="${val}">${val} (${count})</option>`);

    elements.filterValue.innerHTML = options.join('');
    elements.filterValueContainer.classList.remove('hidden');
    updateQuestionCountDropdown();
}

function updateQuestionCountDropdown() {
    let poolSize = state.allQuestions.length;
    const type = elements.filterType.value;
    
    if (type === 'keyword') {
        const kw = elements.keywordInput.value.trim().toLowerCase();
        if (kw) {
            poolSize = state.allQuestions.filter(q => (q.keyword_tag && q.keyword_tag.toLowerCase().includes(kw)) || q.question.toLowerCase().includes(kw)).length;
        }
    } else if (type !== 'random') {
        const val = elements.filterValue.value;
        const key = type === 'category' ? 'category' : 'knowledge_tag';
        poolSize = state.allQuestions.filter(q => q[key] === val).length;
    }

    elements.questionCount.innerHTML = '';
    const options = [5];
    for (let i = 20; i <= poolSize; i += 20) {
        options.push(i);
    }
    
    options.forEach(i => {
        const label = i === 5 ? `${i} 題 (測試用)` : `${i} 題`;
        elements.questionCount.innerHTML += `<option value="${i}">${label}</option>`;
    });
    elements.questionCount.innerHTML += `<option value="all">所有題目 (${poolSize} 題)</option>`;
    
    if (poolSize === 0) {
        elements.questionCount.innerHTML = `<option value="0">無相關題目</option>`;
        elements.startBtn.disabled = true;
    } else {
        elements.startBtn.disabled = false;
    }
}

function startQuiz() {
    const type = elements.filterType.value;
    const countStr = elements.questionCount.value;

    let pool = [...state.allQuestions];
    if (type === 'keyword') {
        const kw = elements.keywordInput.value.trim().toLowerCase();
        if (!kw) { alert('請輸入關鍵字！'); return; }
        pool = pool.filter(q => (q.keyword_tag && q.keyword_tag.toLowerCase().includes(kw)) || q.question.toLowerCase().includes(kw));
    } else if (type !== 'random') {
        const val = elements.filterValue.value;
        const key = type === 'category' ? 'category' : 'knowledge_tag';
        pool = pool.filter(q => q[key] === val);
    }

    const count = countStr === 'all' ? pool.length : parseInt(countStr) || 20;

    // Weighted Sort based on practice count
    if (state.userProfile && state.userProfile.questionStats) {
        const stats = state.userProfile.questionStats;
        pool.sort((a, b) => {
            const keyA = `${state.selectedSubject}_${a.id}`;
            const keyB = `${state.selectedSubject}_${b.id}`;
            const countA = stats[keyA] || 0;
            const countB = stats[keyB] || 0;
            if (countA !== countB) return countA - countB;
            return Math.random() - 0.5;
        });
    } else {
        pool.sort(() => Math.random() - 0.5);
    }

    state.filteredQuestions = pool.slice(0, count);

    if (state.filteredQuestions.length === 0) {
        alert('此類別下無題目！');
        return;
    }

    state.currentQuestionIndex = 0;
    state.score = 0;
    state.wrongQuestions = [];
    state.practicedQuestionIds = [];
    state.startTime = Date.now();
    state.isRetryMode = false;
    const totalGoldPool = state.filteredQuestions.length === 5 ? 50 : 500;
    state.goldPerQuestion = totalGoldPool / state.filteredQuestions.length;
    
    // Pick random monster
    state.currentMonster = { ...state.monsterPool[Math.floor(Math.random() * state.monsterPool.length)] };
    state.heroHp = 100;

    // Update Monster UI
    elements.monsterNameLabel.innerHTML = `<i class="fas ${state.currentMonster.icon}"></i> ${state.currentMonster.name}`;
    elements.dragonSprite.innerHTML = `<i class="fas ${state.currentMonster.icon}"></i>`;
    elements.dragonSprite.style.color = state.currentMonster.color;
    // Apply a custom colored glow matching the monster's color
    elements.dragonSprite.style.filter = `drop-shadow(0 0 15px ${state.currentMonster.color}80)`; // 80 is 50% opacity in hex
    elements.dragonHp.style.width = '100%';
    elements.dragonHpText.textContent = '100%';
    
    // Update Hero UI
    elements.heroHpBar.style.width = '100%';
    elements.heroHpText.textContent = '100%';

    elements.setupScreen.classList.add('hidden');
    elements.quizScreen.classList.remove('hidden');

    updateTimer();
    state.timerInterval = setInterval(updateTimer, 1000);
    showQuestion();
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    elements.timer.innerHTML = `<i class="fas fa-clock"></i> ${m}:${s}`;
}

function updateStars(score) {
    elements.questionStarsContainer.innerHTML = '';
    for (let i = 1; i <= 3; i++) {
        const star = document.createElement('i');
        star.className = i <= score ? 'fas fa-star star-filled' : 'far fa-star star-empty';
        elements.questionStarsContainer.appendChild(star);
    }
}

function showQuestion() {
    const q = state.filteredQuestions[state.currentQuestionIndex];
    const qId = getQuestionId(q);
    const cat = q.category || '未分類';
    
    // Add to practiced list for stats
    const qKey = `${state.selectedSubject}_${qId}`;
    if (!state.practicedQuestionIds.includes(qKey)) {
        state.practicedQuestionIds.push(qKey);
    }

    elements.progress.textContent = `題目 ${state.currentQuestionIndex + 1} / ${state.filteredQuestions.length}`;
    elements.questionText.textContent = q.question;

    // Show stars
    const currentScore = (state.userProgress.scores[state.selectedSubject] && 
                          state.userProgress.scores[state.selectedSubject][cat] && 
                          state.userProgress.scores[state.selectedSubject][cat][qId]) || 0;
    updateStars(currentScore);

    elements.immediateExpContainer.classList.add('hidden');
    elements.optionsContainer.innerHTML = '';
    
    // Ensure we always have 4 options
    let paddedOptions = [...q.options];
    while (paddedOptions.length < 4) {
        paddedOptions.push("(無文字選項)");
    }
    
    // Create an array mapping text to original indices (1-based)
    const optionsWithIndices = paddedOptions.map((opt, i) => ({ 
        text: (opt === "無選項" || !opt) ? "(無文字選項)" : opt, 
        originalIndex: i + 1 
    }));
    
    // Fisher-Yates shuffle for true randomness
    for (let i = optionsWithIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [optionsWithIndices[i], optionsWithIndices[j]] = [optionsWithIndices[j], optionsWithIndices[i]];
    }

    optionsWithIndices.forEach((optObj, i) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.dataset.originalIndex = optObj.originalIndex; // Store true index for checking
        // The display number is the shuffled visual order, but the logic relies on originalIndex
        btn.textContent = `${i + 1}. ${optObj.text}`;
        btn.onclick = () => handleAnswer(optObj.originalIndex, btn);
        elements.optionsContainer.appendChild(btn);
    });
}

function playCorrectSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, ctx.currentTime);
        gain1.gain.setValueAtTime(0, ctx.currentTime);
        gain1.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
        gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc1.connect(gain1); gain1.connect(ctx.destination);
        osc1.start(ctx.currentTime); osc1.stop(ctx.currentTime + 0.2);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1108.73, ctx.currentTime + 0.1);
        gain2.gain.setValueAtTime(0, ctx.currentTime + 0.1);
        gain2.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc2.connect(gain2); gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime + 0.1); osc2.stop(ctx.currentTime + 0.5);
    } catch(e) { console.error(e); }
}

function playWrongSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
    } catch(e) { console.error(e); }
}

function handleAnswer(choice, btn) {
    // 停止正在朗讀的語音
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }

    const q = state.filteredQuestions[state.currentQuestionIndex];
    const isCorrect = choice === q.answer;
    const btns = elements.optionsContainer.querySelectorAll('.option-btn');

    btns.forEach(b => b.disabled = true);

    if (isCorrect) {
        state.score++;
        btn.classList.add('correct');
        playCorrectSound();
        
        // Mastery System: Increment star if not in retry mode and < 3
        if (!state.isRetryMode && state.currentUser) {
            const currentQ = state.filteredQuestions[state.currentQuestionIndex];
            const currentQId = getQuestionId(currentQ);
            const currentCat = currentQ.category || '未分類';
            
            if (!state.userProgress.scores[state.selectedSubject]) state.userProgress.scores[state.selectedSubject] = {};
            if (!state.userProgress.scores[state.selectedSubject][currentCat]) state.userProgress.scores[state.selectedSubject][currentCat] = {};
            
            let currentScore = state.userProgress.scores[state.selectedSubject][currentCat][currentQId] || 0;
            if (currentScore < 3) {
                state.userProgress.scores[state.selectedSubject][currentCat][currentQId] = currentScore + 1;
                state.pendingProgressUpdates = true;
                updateStars(currentScore + 1);
            }
        }

        triggerHitEffect();
        
        // Damage Monster - dealt proportionally to total questions
        const damagePerCorrect = 100 / (state.filteredQuestions.length);
        const currentMonsterHp = parseFloat(elements.dragonHp.style.width) || 100;
        const newMonsterHp = Math.max(0, currentMonsterHp - damagePerCorrect);
        elements.dragonHp.style.width = `${newMonsterHp}%`;
        elements.dragonHpText.textContent = `${Math.round(newMonsterHp)}%`;
    } else {
        btn.classList.add('wrong');
        // Find the button that holds the correct original index
        const correctBtn = Array.from(btns).find(b => parseInt(b.dataset.originalIndex) === q.answer);
        if (correctBtn) correctBtn.classList.add('correct');
        
        playWrongSound();
        state.wrongQuestions.push({
            ...q,
            userChoice: choice
        });
        
        // Damage Hero - proportional to total questions in the current pool
        const heroDamage = 100 / state.filteredQuestions.length;
        state.heroHp = Math.max(0, state.heroHp - heroDamage);
        elements.heroHpBar.style.width = `${state.heroHp}%`;
        elements.heroHpText.textContent = `${Math.round(state.heroHp)}%`;
        
        // Hero hit animation
        elements.heroSprite.classList.add('hero-hit-anim');
        setTimeout(() => elements.heroSprite.classList.remove('hero-hit-anim'), 500);

        if (state.heroHp <= 0) {
            setTimeout(() => {
                alert(`勇者倒下了！體力耗盡，本次修煉在第 ${state.currentQuestionIndex + 1} 題提前結束。`);
                endQuiz();
            }, 600);
            return;
        }
    }

    const mode = elements.practiceMode.value;
    
    if (mode === 'novice' && !isCorrect) {
        // Stop timer for this question in novice mode until they click next
        clearInterval(state.timerInterval);
        elements.immediateExpText.innerHTML = `
            <strong><i class="fas fa-exclamation-circle"></i> 答錯了！</strong><br>
            您的回答：<span style="color: var(--danger)">${q.options[choice - 1]}</span><br>
            正確答案：<span style="color: var(--success)">${q.options[q.answer - 1]}</span><br>
            <div style="margin-top:0.5rem; font-size:0.9rem;">${q.explanation || '暫無詳解'}</div>
        `;
        elements.immediateExpContainer.classList.remove('hidden');
    } else {
        setTimeout(() => {
            advanceToNextQuestion();
        }, 1000);
    }
}

function advanceToNextQuestion() {
    // Resume timer if it was stopped
    if (elements.practiceMode.value === 'novice' && !elements.immediateExpContainer.classList.contains('hidden')) {
        state.timerInterval = setInterval(updateTimer, 1000);
    }
    
    state.currentQuestionIndex++;
    if (state.currentQuestionIndex < state.filteredQuestions.length) {
        showQuestion();
    } else {
        endQuiz();
    }
}

function triggerHitEffect() {
    // 勇者攻擊動畫
    elements.heroSprite.classList.add('hero-attack');
    
    // 延遲播放挑戰受擊與劍光 (配合揮劍的時機點)
    setTimeout(() => {
        elements.dragonSprite.classList.remove('dragon-idle');
        elements.dragonSprite.classList.add('dragon-hit');
        
        elements.slashEffect.classList.remove('hidden');
        elements.slashEffect.classList.add('slash-animate');
        
        setTimeout(() => {
            elements.dragonSprite.classList.remove('dragon-hit');
            elements.dragonSprite.classList.add('dragon-idle');
            elements.slashEffect.classList.remove('slash-animate');
            elements.slashEffect.classList.add('hidden');
        }, 300);
    }, 200);
    
    // 移除勇者攻擊動畫 class
    setTimeout(() => {
        elements.heroSprite.classList.remove('hero-attack');
    }, 500);
}

async function endQuiz(isGiveUp = false) {
    if (state.currentMonster && state.currentMonster.tileCoords) {
        clearInterval(state.timerInterval);
        const totalToGrade = isGiveUp ? state.currentQuestionIndex : state.filteredQuestions.length;
        const scorePercent = Math.round((state.score / totalToGrade) * 100) || 0;
        
        elements.quizScreen.classList.add('hidden');
        elements.setupScreen.classList.remove('hidden');

        // Reset dragon sprites
        elements.dragonSprite.classList.remove('dragon-die');
        elements.dragonSprite.classList.add('dragon-idle');
        elements.dragonHp.style.width = '100%';
        elements.dragonHpText.textContent = '100%';

        const damageDealt = state.score * 20;
        const remainingHp = Math.max(0, state.currentMonster.hp - damageDealt);

        if (remainingHp <= 0 && totalToGrade > 0) {
            // Defeated!
            await processMonsterBattleDefeated();
        } else {
            showLoadingOverlay(true);
            try {
                const { x, y } = state.currentMonster.tileCoords;
                const lands = [...state.userProfile.territory.lands];
                const idx = lands.findIndex(l => l.x === x && l.y === y);
                if (idx !== -1) {
                    lands[idx].monsterHp = remainingHp;
                    await updateUserProfile(state.currentUser.uid, { "territory.lands": lands });
                    state.userProfile.territory.lands = lands;
                }
                alert(`戰鬥結束！你對野怪造成了 ${damageDealt} 點傷害，但野怪頑強抵抗，目前仍剩餘 ${remainingHp} 生命值。請繼續修煉並再度挑戰！`);
            } catch (e) {
                console.error(e);
            } finally {
                showLoadingOverlay(false);
            }
        }
        state.currentMonster = null;
        return;
    }

    clearInterval(state.timerInterval);
    const elapsedSecs = Math.floor((Date.now() - state.startTime) / 1000);
    const m = Math.floor(elapsedSecs / 60).toString().padStart(2, '0');
    const s = (elapsedSecs % 60).toString().padStart(2, '0');
    const elapsed = `${m}:${s}`;
    
    const questionsAnswered = state.currentQuestionIndex;
    
    if (isGiveUp && questionsAnswered === 0) {
        alert('尚未作答任何題目，返回首頁。');
        elements.quizScreen.classList.add('hidden');
        elements.setupScreen.classList.remove('hidden');
        return;
    }

    const totalToGrade = isGiveUp ? questionsAnswered : state.filteredQuestions.length;
    const scorePercent = Math.round((state.score / totalToGrade) * 100) || 0;

    if (state.currentUser) {
        // Show loading overlay while syncing
        elements.loadingOverlay.classList.remove('hidden');
        
        try {
            // 1. Save historical record
            await savePracticeRecord({
                uid: state.currentUser.uid,
                email: state.currentUser.email,
                nickname: state.userProfile?.nickname || state.currentUser.email.split('@')[0],
                subject: state.config.subjectMap[state.selectedSubject] || '綜合練習',
                mode: elements.filterType.options[elements.filterType.selectedIndex].text + (isGiveUp ? ' (中途放棄)' : ''),
                count: totalToGrade,
                correctCount: state.score,
                score: scorePercent,
                timeElapsed: elapsed
            });
            console.log("Practice record saved successfully.");
        } catch (e) {
            console.error('紀錄儲存失敗:', e);
            alert('練習紀錄儲存失敗，請檢查網路連線。');
        }

        try {
            // 2. Sync user global stats (level, exp, etc.)
            const statsResult = await syncUserStats(
                state.currentUser.uid, 
                scorePercent, 
                state.score, // Correct answers only
                elapsedSecs, 
                state.practicedQuestionIds
            );
            
            if (statsResult) {
                // Update local profile state immediately
                state.userProfile.totalQuestions = statsResult.totalQuestions;
                state.userProfile.totalTime = statsResult.totalTime;
                state.userProfile.level = statsResult.newLevel;
                state.userProfile.puzzlePieces = statsResult.puzzlePieces;
                state.userProfile.gold = statsResult.gold || state.userProfile.gold;
                
                // Merge question stats
                state.practicedQuestionIds.forEach(id => {
                    if (!state.userProfile.questionStats) state.userProfile.questionStats = {};
                    state.userProfile.questionStats[id] = (state.userProfile.questionStats[id] || 0) + 1;
                });
                
                console.log("User stats synced successfully:", statsResult);

                // Show level up modal if leveled up
                if (statsResult.leveledUp) {
                    elements.newLevelText.textContent = `LV ${statsResult.newLevel}`;
                    if (statsResult.newPieces && statsResult.newPieces.length > 0) {
                        const theme = PUZZLE_THEMES.find(t => t.id === state.userProfile.currentPuzzleId) || PUZZLE_THEMES[0];
                        const pieceIdx = statsResult.newPieces[0];
                        elements.newTreasureIcon.innerHTML = `<img src="${theme.imagePrefix}${pieceIdx}.png" style="width: 80px; height: 80px; border-radius: 8px; border: 2px solid var(--gold);">`;
                        elements.newTreasureName.textContent = `獲得拼圖碎片 #${pieceIdx + 1}`;
                        elements.newTreasureContainer.classList.remove('hidden');
                    } else {
                        elements.newTreasureContainer.classList.add('hidden');
                    }
                    elements.levelupModal.classList.remove('hidden');
                }

                // Show Territory Unlock Celebration
                if (statsResult.territoryUnlocked) {
                    alert('🎉 恭喜勇者！您已累積答對 100 題，領地系統已正式解鎖！第一座農場已贈送給您，快去「我的領地」收成吧！');
                    elements.territoryBtn.classList.remove('hidden');
                    // Initialize territory in local state
                    state.userProfile.territory = {
                        isUnlocked: true,
                        lands: [{ id: 'L1', type: 'farm', level: 1, lastHarvest: new Date() }]
                    };
                }
            }

            // 3. Sync Mastery Progress (Stars)
            if (state.pendingProgressUpdates) {
                const { updateUserProgress } = await import('./firebase_app.js');
                await updateUserProgress(state.currentUser.uid, state.userProgress);
                state.pendingProgressUpdates = false;
                console.log("Mastery progress synced successfully.");
                renderMasteryStats(); // Refresh homepage stats
            }
        } catch (e) {
            console.error('個人資料同步失敗:', e);
            alert('個人資料同步失敗：' + e.message);
        } finally {
            elements.loadingOverlay.classList.add('hidden');
        }
    }

    elements.quizScreen.classList.add('hidden');

    if (isGiveUp) {
        alert(`已放棄本次測驗。\n本次作答 ${totalToGrade} 題，花費時間 ${elapsed}，正確率 ${scorePercent}%。\n紀錄已儲存，返回首頁。`);
        elements.setupScreen.classList.remove('hidden');
        
        // Reset dragon
        elements.dragonSprite.classList.remove('dragon-die');
        elements.dragonSprite.classList.add('dragon-idle');
        elements.dragonHp.style.width = '100%';
        elements.dragonHpText.textContent = '100%';
    } else {
        elements.resultScreen.classList.remove('hidden');

        elements.finalTime.textContent = elapsed;
        elements.finalScore.textContent = `${scorePercent}%`;

        const resultAnimContainer = document.getElementById('result-animation-container');
        const resultAnimImg = document.getElementById('result-animation');

        if (scorePercent >= 80) {
            elements.victoryMessage.innerHTML = `<span style="color: var(--success)">恭喜勇者！你成功討伐了挑戰！</span>`;
            elements.dragonSprite.classList.add('dragon-die');
            if (resultAnimContainer && resultAnimImg) {
                resultAnimImg.src = 'motion/win.webp';
                resultAnimContainer.classList.remove('hidden');
            }
        } else {
            elements.victoryMessage.innerHTML = `<span style="color: var(--danger)">戰敗了... 挑戰的力量太強，再修煉一下吧！</span>`;
            if (resultAnimContainer && resultAnimImg) {
                resultAnimImg.src = 'motion/lose.webp';
                resultAnimContainer.classList.remove('hidden');
            }
        }

        renderReview();
        
        // RPG Rewards
        await awardRewards(scorePercent, state.filteredQuestions.length);
    }
}

async function awardRewards(scorePercent, questionCount) {
    if (!state.userProfile) return;
    
    // 1. Award Gold (Based on proportional economy)
    const goldEarned = Math.round(state.score * state.goldPerQuestion);
    state.userProfile.gold = (state.userProfile.gold || 0) + goldEarned;
    
    let loot = null;
    let newPiece = null;

    // Only allow loot/fragment drops in fresh quizzes (not retry mode) to prevent exploiting
    if (!state.isRetryMode) {
        // 2. Random Loot (50% chance if victory)
        if (scorePercent >= 80 && Math.random() < 0.5) {
            loot = state.lootPool[Math.floor(Math.random() * state.lootPool.length)];
            state.userProfile.inventory = state.userProfile.inventory || [];
            state.userProfile.inventory.push({ ...loot, id: Date.now() });
        }
        
        // 3. Painting Fragment (30% chance if victory)
        if (scorePercent >= 80 && Math.random() < 0.3) {
            const paintingNames = Object.keys(state.paintings);
            const paintingName = paintingNames[Math.floor(Math.random() * paintingNames.length)];
            const fragIndex = Math.floor(Math.random() * 9);
            
            state.userProfile.paintings = state.userProfile.paintings || {};
            if (!state.userProfile.paintings[paintingName]) {
                state.userProfile.paintings[paintingName] = new Array(9).fill(false);
            }
            
            if (!state.userProfile.paintings[paintingName][fragIndex]) {
                state.userProfile.paintings[paintingName][fragIndex] = true;
                newPiece = { name: paintingName, index: fragIndex };
            } else {
                state.userProfile.gold += 50;
                newPiece = false; // Flag for duplicate
            }
        }
    }
    
    // Show custom modal
    let resultHtml = `<div style="text-align: left; background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 0.5rem; border: 1px solid rgba(251, 191, 36, 0.2);">`;
    resultHtml += `<div><i class="fas fa-coins" style="color: var(--gold);"></i> 獲得芒果幣: <span style="color: var(--gold); font-weight: bold;">${goldEarned}</span></div>`;
    
    if (loot) {
        resultHtml += `<div><i class="fas fa-box-open" style="color: #60a5fa;"></i> 獲得寶物: <span style="color: #60a5fa;">${loot.icon} ${loot.name}</span></div>`;
    }
    
    if (newPiece) {
        resultHtml += `<div><i class="fas fa-puzzle-piece" style="color: var(--success);"></i> 獲得成就碎片: <span style="color: var(--success);">${newPiece.name} (碎片 ${newPiece.index + 1})</span></div>`;
    } else if (newPiece === false) {
        resultHtml += `<div><i class="fas fa-redo" style="color: var(--text-dim);"></i> 獲得重複碎片，已轉化為 <span style="color: var(--gold);">50G</span></div>`;
    }
    resultHtml += `</div>`;
    
    if (scorePercent >= 80) {
        resultHtml += `<div style="margin-top: 1rem; color: var(--success); font-weight: bold; border-top: 1px solid rgba(16, 185, 129, 0.2); padding-top: 0.5rem;"><i class="fas fa-trophy"></i> 成功擊敗了 ${state.currentMonster.name}！</div>`;
    } else {
        resultHtml += `<div style="margin-top: 1rem; color: var(--danger); font-weight: bold; border-top: 1px solid rgba(239, 68, 68, 0.2); padding-top: 0.5rem;"><i class="fas fa-skull-crossbones"></i> ${state.currentMonster.name} 依然肆虐... 再修煉一下吧！</div>`;
    }
    
    // Check rank for Top 3 message
    let isTopThree = false;
    try {
        const leaderboard = await getGlobalLeaderboard();
        const userRank = leaderboard.findIndex(u => u.uid === state.currentUser.uid) + 1;
        if (userRank > 0 && userRank <= 3) {
            isTopThree = true;
        }
    } catch (e) { console.error("Rank check failed", e); }

    const honorMessageContainer = document.getElementById('honor-message-container');
    const honorMessageInput = document.getElementById('honor-message-input');
    if (isTopThree && honorMessageContainer && honorMessageInput) {
        honorMessageContainer.classList.remove('hidden');
        honorMessageInput.value = state.userProfile.honorMessage || '';
    } else if (honorMessageContainer) {
        honorMessageContainer.classList.add('hidden');
    }

    elements.battleResultContent.innerHTML = resultHtml;
    elements.battleResultModal.classList.remove('hidden');

    updateUserProfileDisplay();
    syncUserStats(state.currentUser.uid, { 
        goldDelta: goldEarned, // Use increment to prevent stale state overwriting
        inventory: state.userProfile.inventory,
        paintings: state.userProfile.paintings
    });
}

function renderGallery() {
    elements.galleryContainer.innerHTML = '';
    
    Object.entries(state.paintings).forEach(([name, info]) => {
        const fragments = (state.userProfile.paintings && state.userProfile.paintings[name]) || new Array(9).fill(false);
        const collectedCount = fragments.filter(p => p).length;
        
        const card = document.createElement('div');
        card.className = 'painting-card';
        card.style.setProperty('--painting-ratio', info.ratio || '1/1');
        card.onclick = () => openPaintingViewer(name);
        
        card.innerHTML = `
            <div class="painting-display">
                ${fragments.map((collected, i) => {
                    const x = (i % 3) * 50;
                    const y = Math.floor(i / 3) * 50;
                    return `<div class="painting-fragment ${collected ? 'collected' : ''}" 
                            style="background-image: url('jigsaw puzzles/${info.file}'); background-position: ${x}% ${y}%"></div>`;
                }).join('')}
            </div>
            <div class="painting-info">
                <div class="painting-title">${info.title}</div>
                <div class="painting-artist">${info.artist}</div>
                <div class="painting-value">收集進度: ${collectedCount}/9</div>
                <div style="font-size: 0.8rem; color: var(--success); margin-top: 5px;">預估收購價: ${info.value}G</div>
            </div>
        `;
        elements.galleryContainer.appendChild(card);
    });
}

function openPaintingViewer(name) {
    const info = state.paintings[name];
    elements.viewerImg.src = `jigsaw puzzles/${info.file}`;
    elements.viewerTitle.textContent = info.title;
    elements.viewerArtist.textContent = info.artist;
    elements.paintingViewerModal.classList.remove('hidden');
}

function renderPawnShop() {
    elements.pawnInventory.innerHTML = '';
    
    // 1. Show Loot Items
    const inventory = state.userProfile.inventory || [];
    if (inventory.length === 0) {
        elements.pawnInventory.innerHTML = '<div style="text-align:center; color:var(--text-dim);">背囊空空如也...</div>';
    }
    
    inventory.forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = 'pawn-item';
        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:1rem;">
                <div class="loot-icon">${item.icon}</div>
                <div>
                    <div style="font-weight:bold;">${item.name}</div>
                    <div style="font-size:0.8rem; color:var(--text-dim);">收購價: ${item.price}G</div>
                </div>
            </div>
            <button class="btn btn-primary" onclick="sellLootItem(${idx})">賣出</button>
        `;
        elements.pawnInventory.appendChild(div);
    });
    
    // 2. Show Completed Paintings
    const userPaintings = state.userProfile.paintings || {};
    Object.entries(userPaintings).forEach(([name, fragments]) => {
        const isComplete = fragments.every(f => f);
        if (isComplete) {
            const info = state.paintings[name];
            const div = document.createElement('div');
            div.className = 'pawn-item';
            div.style.borderColor = 'var(--gold)';
            div.innerHTML = `
                <div style="display:flex; align-items:center; gap:1rem;">
                    <div class="loot-icon">🖼️</div>
                    <div>
                        <div style="font-weight:bold; color:var(--gold);">${info.title} (完好)</div>
                        <div style="font-size:0.8rem; color:var(--text-dim);">大師之作！收購價: ${info.value}G</div>
                    </div>
                </div>
                <button class="btn btn-primary" style="background:var(--gold); color:black;" onclick="sellPainting('${name}')">出讓給博物館</button>
            `;
            elements.pawnInventory.appendChild(div);
        }
    });
}

window.sellLootItem = (idx) => {
    const item = state.userProfile.inventory[idx];
    state.userProfile.gold = (Number(state.userProfile.gold) || 0) + Number(item.price);
    state.userProfile.inventory.splice(idx, 1);
    renderPawnShop();
    updateUserProfileDisplay();
    syncUserStats(state.currentUser.uid, { gold: state.userProfile.gold, inventory: state.userProfile.inventory });
};

window.sellPainting = (name) => {
    const info = state.paintings[name];
    state.userProfile.gold = (Number(state.userProfile.gold) || 0) + Number(info.value);
    delete state.userProfile.paintings[name];
    renderPawnShop();
    updateUserProfileDisplay();
    syncUserStats(state.currentUser.uid, { gold: state.userProfile.gold, paintings: state.userProfile.paintings });
};

function updateUserProfileDisplay() {
    if (!state.userProfile) return;
    
    // Basic Info
    const nicknameInput = document.getElementById('profile-nickname');
    if (nicknameInput) nicknameInput.value = state.userProfile.nickname || '';
    
    const levelBadge = document.getElementById('profile-level-badge');
    if (levelBadge) levelBadge.textContent = `LV ${state.userProfile.level || 1} ${state.userProfile.title || '新手勇者'}`;

    // RPG Stats
    if (elements.profileGold) elements.profileGold.textContent = state.userProfile.gold || 0;

    // EXP Bar
    const expText = document.getElementById('profile-exp-text');
    const expBar = document.getElementById('profile-exp-bar');
    if (expText && expBar) {
        const currentLevel = state.userProfile.level || 1;
        const totalQ = state.userProfile.totalQuestions || 0;
        
        // Find next level info
        const nextLevelInfo = LEVEL_THRESHOLDS.find(t => t.level === currentLevel + 1);
        const req = nextLevelInfo ? nextLevelInfo.req : (currentLevel * 100);
        
        expText.textContent = `${totalQ} / ${req}`;
        expBar.style.width = `${Math.min(100, (totalQ / req) * 100)}%`;
    }

    // Stats
    const totalQElement = document.getElementById('profile-total-questions');
    const totalTElement = document.getElementById('profile-total-time');
    if (totalQElement) totalQElement.textContent = state.userProfile.totalQuestions || 0;
    if (totalTElement) totalTElement.textContent = `${Math.floor((state.userProfile.totalTime || 0) / 60)}m`;

    // Role Fields
    const roleSelect = document.getElementById('profile-role');
    if (roleSelect) {
        roleSelect.value = state.userProfile.role || '';
        const teacherFields = document.getElementById('teacher-fields');
        const studentFields = document.getElementById('student-fields');
        if (teacherFields) teacherFields.classList.toggle('hidden', state.userProfile.role !== 'teacher');
        if (studentFields) studentFields.classList.toggle('hidden', state.userProfile.role !== 'student');
        
        if (state.userProfile.role === 'teacher') {
            document.getElementById('profile-teacher-name').value = state.userProfile.realName || '';
            document.getElementById('profile-teacher-school').value = state.userProfile.school || '';
            document.getElementById('profile-teacher-subject').value = state.userProfile.subject || '';
        } else if (state.userProfile.role === 'student') {
            document.getElementById('profile-student-name').value = state.userProfile.realName || '';
            document.getElementById('profile-student-school').value = state.userProfile.school || '';
            document.getElementById('profile-student-dept').value = state.userProfile.department || '';
        }
    }

    // Territory Unlock Hint
    const unlockHintContainer = document.getElementById('territory-unlock-hint');
    const unlockTitle = document.getElementById('territory-unlock-title');
    const unlockProgressBar = document.getElementById('territory-unlock-progress-fill');
    const unlockText = document.getElementById('territory-unlock-text');
    
    if (unlockHintContainer && unlockTitle && unlockProgressBar && unlockText) {
        unlockHintContainer.classList.remove('hidden');
        const userTotalQ = state.userProfile.totalQuestions || 0;
        if (userTotalQ >= 100) {
            unlockTitle.innerHTML = '<span style="color: var(--success);"><i class="fas fa-unlock"></i> 已解鎖專屬領地與農場系統！</span>';
            unlockProgressBar.style.width = '100%';
            unlockProgressBar.style.backgroundColor = 'var(--success)';
            unlockText.textContent = `目前進度: ${userTotalQ} / 100 (已達標)`;
        } else {
            unlockTitle.innerHTML = '<i class="fas fa-lock"></i> <span>解鎖專屬領地：累積練習 100 題</span>';
            unlockProgressBar.style.width = `${Math.min(100, userTotalQ)}%`;
            unlockProgressBar.style.backgroundColor = 'var(--gold)';
            unlockText.textContent = `目前進度: ${userTotalQ} / 100`;
        }
    }
}

function renderReview() {
    elements.reviewList.innerHTML = '';
    state.wrongQuestions.forEach((q, idx) => {
        const item = document.createElement('div');
        item.className = 'review-item';
        item.innerHTML = `
            <div class="review-question">${idx + 1}. ${q.question}</div>
            <div class="review-meta">
                <span>您的回答: <span style="color: var(--danger)">${q.options[q.userChoice - 1]}</span></span>
                <span>正確答案: <span style="color: var(--success)">${q.options[q.answer - 1]}</span></span>
            </div>
            <button class="btn btn-outline btn-small" style="margin-top: 1rem;" onclick="toggleExplanation(this)">
                看詳解
            </button>
            <div class="explanation-box hidden">${q.explanation || '暫無詳解'}</div>
        `;
        elements.reviewList.appendChild(item);
    });

    elements.retryWrongBtn.classList.toggle('hidden', state.wrongQuestions.length === 0);
}

window.toggleExplanation = (btn) => {
    const box = btn.nextElementSibling;
    box.classList.toggle('hidden');
    btn.textContent = box.classList.contains('hidden') ? '看詳解' : '收起詳解';
};

function retryWrongQuestions() {
    state.allQuestions = state.wrongQuestions;
    state.filteredQuestions = [...state.wrongQuestions];
    state.currentQuestionIndex = 0;
    state.score = 0;
    state.wrongQuestions = [];
    state.practicedQuestionIds = [];
    state.startTime = Date.now();
    state.isRetryMode = true;

    elements.resultScreen.classList.add('hidden');
    
    // Hide animation
    const resultAnimContainer = document.getElementById('result-animation-container');
    if (resultAnimContainer) {
        resultAnimContainer.classList.add('hidden');
    }

    // Pick random monster
    state.currentMonster = { ...state.monsterPool[Math.floor(Math.random() * state.monsterPool.length)] };
    state.heroHp = 100;

    // Update Monster UI
    elements.monsterNameLabel.innerHTML = `<i class="fas ${state.currentMonster.icon}"></i> ${state.currentMonster.name}`;
    elements.dragonSprite.innerHTML = `<i class="fas ${state.currentMonster.icon}"></i>`;
    elements.dragonSprite.style.color = state.currentMonster.color;
    elements.dragonSprite.style.filter = `drop-shadow(0 0 15px ${state.currentMonster.color}80)`;
    elements.dragonHp.style.width = '100%';
    elements.dragonHpText.textContent = '100%';
    elements.dragonSprite.classList.remove('dragon-die', 'dragon-hit');
    elements.dragonSprite.classList.add('dragon-idle');
    
    // Update Hero UI
    elements.heroHpBar.style.width = '100%';
    elements.heroHpText.textContent = '100%';

    elements.quizScreen.classList.remove('hidden');

    updateTimer();
    state.timerInterval = setInterval(updateTimer, 1000);
    showQuestion();
}

function exportToText() {
    try {
        let content = "丙級檢定練習 - 錯題彙整\n\n";
        
        state.wrongQuestions.forEach((q, i) => {
            content += `第 ${i + 1} 題：${q.question}\n`;
            q.options.forEach((opt, oi) => {
                content += `(${oi + 1}) ${opt}\n`;
            });
            content += `\n正確答案：(${q.answer})\n`;
            content += `詳解：${q.explanation || '無'}\n`;
            content += `------------------------\n\n`;
        });

        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        saveAs(blob, "錯題練習單.txt");
        alert("匯出成功！");
    } catch (error) {
        console.error("Text export failed:", error);
        alert("匯出失敗，請確認網路連線或更換瀏覽器。");
    }
}

// A11y Functions
window.toggleA11yModal = () => {
    elements.a11yModal.classList.toggle('hidden');
};

window.applyA11y = () => {
    const size = elements.a11yFontsize.value;
    const contrast = elements.a11yContrast.value;
    const font = elements.a11yFont.value;
    const tts = elements.a11yTts.value;

    document.body.classList.remove('a11y-font-large', 'a11y-font-xlarge', 'a11y-contrast-high', 'a11y-font-dyslexia');
    
    if (size === 'large') document.body.classList.add('a11y-font-large');
    if (size === 'xlarge') document.body.classList.add('a11y-font-xlarge');
    if (contrast === 'high') document.body.classList.add('a11y-contrast-high');
    if (font === 'dyslexia') document.body.classList.add('a11y-font-dyslexia');
    
    if (tts === 'on') {
        elements.ttsBtn.classList.remove('hidden');
    } else {
        elements.ttsBtn.classList.add('hidden');
    }
};

window.readQuestionAloud = () => {
    if (!('speechSynthesis' in window)) {
        alert("您的瀏覽器不支援語音朗讀功能");
        return;
    }
    const q = state.filteredQuestions[state.currentQuestionIndex];
    const textToRead = `題目：${q.question}。 選項一：${q.options[0]}。 選項二：${q.options[1]}。 選項三：${q.options[2]}。 選項四：${q.options[3]}。`;
    
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'zh-TW';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
};

async function renderHomepageLeaderboard() {
    const body = document.getElementById('homepage-leaderboard-body');
    if (!body) return;

    // 1. Show Skeleton if no cache
    if (!state.leaderboardCache) {
        body.innerHTML = Array(5).fill(0).map(() => `
            <tr class="skeleton-row">
                <td><div class="skeleton-box" style="width: 20px;"></div></td>
                <td><div class="skeleton-avatar"></div></td>
                <td><div class="skeleton-box" style="width: 100px;"></div></td>
                <td><div class="skeleton-box" style="width: 40px;"></div></td>
                <td><div class="skeleton-box" style="width: 60px;"></div></td>
            </tr>
        `).join('');
    } else {
        // Immediate render from cache
        renderLeaderboardRows(body, state.leaderboardCache);
    }

    try {
        const topUsers = await getGlobalLeaderboard();
        state.leaderboardCache = topUsers; // Update cache
        renderLeaderboardRows(body, topUsers);
    } catch (e) {
        console.error("Leaderboard error:", e);
        if (!state.leaderboardCache) {
            body.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--danger); padding: 20px;">榮譽榜載入失敗，無法連線至資料庫<br><small style="color: #666;">（可能是資料庫權限過期）</small></td></tr>';
        }
    }
}

function renderLeaderboardRows(container, users) {
    if (users.length === 0) {
        container.innerHTML = '<tr><td colspan="5" style="text-align: center;">尚未有任何勇者紀錄</td></tr>';
        return;
    }

    container.innerHTML = users.slice(0, 20).map((u, idx) => {
        let avatarHtml = '';
        if (u.avatar && typeof u.avatar === 'string' && u.avatar.includes('.png')) {
            avatarHtml = `<img src="assets/avatars/${u.avatar}" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--gold); object-fit: cover;">`;
        } else {
            avatarHtml = `<div style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--gold); display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.1);"><i class="fas ${u.avatar || 'fa-user-ninja'}" style="font-size: 0.8rem; color: var(--gold);"></i></div>`;
        }
        
        const isMe = state.currentUser && u.uid === state.currentUser.uid;
        
        return `
            <tr style="${isMe ? 'background: rgba(251, 191, 36, 0.1);' : ''}">
                <td>${idx === 0 ? '<i class="fas fa-crown" style="color:var(--gold);"></i> 1' : idx === 1 ? '<i class="fas fa-medal" style="color:silver;"></i> 2' : idx === 2 ? '<i class="fas fa-medal" style="color:#cd7f32;"></i> 3' : idx + 1}</td>
                <td>${avatarHtml}</td>
                <td style="color: ${isMe ? 'var(--gold)' : 'var(--text-light)'}; font-weight: bold;">
                    ${u.nickname || '無名勇者'}
                    ${isMe ? ' (我)' : ''}
                </td>
                <td>LV ${u.level || 1}</td>
                <td style="color: var(--gold); font-weight:bold;">
                    ${u.totalQuestions || 0}
                    ${(u.honorMessage && idx < 3) ? `
                    <div class="honor-marquee-container" style="margin-top: 4px;">
                        <div class="honor-marquee-text">${u.honorMessage}</div>
                    </div>` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

// Initial render
renderHomepageLeaderboard();

window.showLeaderboard = async () => {
    try {
        const topUsers = await getGlobalLeaderboard();
        if (!elements.leaderboardBody) return;
        
        if (topUsers.length === 0) {
            elements.leaderboardBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">尚未有任何勇者紀錄</td></tr>';
        } else {
            elements.leaderboardBody.innerHTML = topUsers.map((u, idx) => {
                let avatarHtml = '';
                if (u.avatar && u.avatar.includes('.png')) {
                    avatarHtml = `<img src="assets/avatars/${u.avatar}" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--gold); object-fit: cover;">`;
                } else {
                    avatarHtml = `<div style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--gold); display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.1);"><i class="fas ${u.avatar || 'fa-user-ninja'}" style="font-size: 0.8rem; color: var(--gold);"></i></div>`;
                }

                return `
                <tr>
                    <td>${idx === 0 ? '<i class="fas fa-crown" style="color:var(--gold);"></i> 1' : idx === 1 ? '<i class="fas fa-medal" style="color:silver;"></i> 2' : idx === 2 ? '<i class="fas fa-medal" style="color:#cd7f32;"></i> 3' : idx + 1}</td>
                    <td>${avatarHtml}</td>
                    <td>${u.nickname || '無名勇者'}</td>
                    <td>LV ${u.level || 1}</td>
                    <td style="color: var(--gold); font-weight:bold;">
                        ${u.totalQuestions || 0}
                        ${u.honorMessage ? `
                        <div class="honor-marquee-container" style="margin-top: 4px;">
                            <div class="honor-marquee-text">${u.honorMessage}</div>
                        </div>` : ''}
                    </td>
                </tr>
            `}).join('');
        }
        elements.leaderboardModal.classList.remove('hidden');
    } catch (e) {
        alert('讀取榮譽榜失敗: ' + e.message);
        console.error(e);
    }
};

document.getElementById('show-leaderboard-result-btn')?.addEventListener('click', window.showLeaderboard);

// --- Profile Modal Logic ---

window.toggleProfileModal = () => {
    if (!state.currentUser) {
        toggleAuthModal();
        return;
    }
    
    updateUserProfileDisplay();
    elements.profileModal.classList.remove('hidden');
};

document.querySelectorAll('.avatar-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedAvatarIcon = btn.dataset.icon;
        document.getElementById('profile-current-avatar').innerHTML = `<img src="assets/avatars/${selectedAvatarIcon}" style="width: 64px; height: 64px; border-radius: 50%; border: 2px solid var(--gold); object-fit: cover; display: block;">`;
    });
});

document.getElementById('profile-role').addEventListener('change', (e) => {
    updateRoleFields(e.target.value);
});

function updateRoleFields(role) {
    const tFields = document.getElementById('teacher-fields');
    const sFields = document.getElementById('student-fields');
    if (role === 'teacher') {
        tFields.classList.remove('hidden');
        sFields.classList.add('hidden');
    } else if (role === 'student') {
        sFields.classList.remove('hidden');
        tFields.classList.add('hidden');
    } else {
        tFields.classList.add('hidden');
        sFields.classList.add('hidden');
    }
}

document.getElementById('save-profile-btn').addEventListener('click', async () => {
    if (!state.currentUser) return;
    const nickname = document.getElementById('profile-nickname').value.trim();
    const role = document.getElementById('profile-role').value;
    
    if (!nickname || !role) {
        alert('請填寫完整基本資料（暱稱與身份別）！');
        return;
    }

    let profileData = {
        nickname: nickname,
        role: role,
        avatar: selectedAvatarIcon,
        profileCompleted: true
    };

    if (role === 'teacher') {
        profileData.realName = document.getElementById('profile-teacher-name').value.trim();
        profileData.school = document.getElementById('profile-teacher-school').value.trim();
        profileData.subject = document.getElementById('profile-teacher-subject').value.trim();
    } else {
        profileData.realName = document.getElementById('profile-student-name').value.trim();
        profileData.school = document.getElementById('profile-student-school').value.trim();
        profileData.department = document.getElementById('profile-student-dept').value;
    }

    // Basic validation
    if (!profileData.realName || !profileData.school) {
        alert('請填寫真實姓名與學校！');
        return;
    }
    
    try {
        await updateUserProfile(state.currentUser.uid, profileData);
        Object.assign(state.userProfile, profileData);
        renderProfileAvatar();
        elements.profileModal.classList.add('hidden');
        const closeBtn = document.getElementById('close-profile-modal');
        if (closeBtn) closeBtn.style.display = 'block';
        alert('資料已儲存！勇者冒險開始！');
    } catch (e) {
        alert('儲存失敗: ' + e.message);
    }
});

document.getElementById('profile-logout-btn').addEventListener('click', () => {
    logoutUser();
    elements.profileModal.classList.add('hidden');
});

// --- Admin Management Logic ---

window.toggleAdminModal = async () => {
    if (state.currentUser?.email !== 'adamzombie85@gmail.com') return;
    
    document.getElementById('admin-modal').classList.remove('hidden');
    switchAdminTab('users');
};

window.switchAdminTab = async (tab) => {
    const usersTab = document.getElementById('admin-tab-users');
    const recordsTab = document.getElementById('admin-tab-records');
    const teachersTab = document.getElementById('admin-tab-teachers');
    const feedbacksTab = document.getElementById('admin-tab-feedbacks');
    const detailTab = document.getElementById('admin-tab-detail');
    const tabsContainer = document.getElementById('admin-tabs-container');
    
    const usersBtn = document.getElementById('admin-tab-users-btn');
    const recordsBtn = document.getElementById('admin-tab-records-btn');
    const teachersBtn = document.getElementById('admin-tab-teachers-btn');
    const feedbacksBtn = document.getElementById('admin-tab-feedbacks-btn');

    usersTab.classList.add('hidden');
    recordsTab.classList.add('hidden');
    teachersTab.classList.add('hidden');
    feedbacksTab.classList.add('hidden');
    detailTab.classList.add('hidden');
    tabsContainer.classList.remove('hidden');
    
    usersBtn.classList.remove('btn-primary');
    recordsBtn.classList.remove('btn-primary');
    teachersBtn.classList.remove('btn-primary');
    feedbacksBtn.classList.remove('btn-primary');

    if (tab === 'users') {
        usersTab.classList.remove('hidden');
        usersBtn.classList.add('btn-primary');
        const users = await getAllUsers();
        document.getElementById('admin-users-body').innerHTML = users.map(u => {
            const avatarImg = u.avatar ? `<img src="assets/avatars/${u.avatar}" style="width: 32px; height: 32px; border-radius: 4px; border: 1px solid var(--gold);">` : `<i class="fas fa-user-ninja" style="font-size: 1.5rem;"></i>`;
            return `
            <tr>
                <td onclick="viewUserProfile('${u.uid}')" style="cursor:pointer;" title="點擊查看詳細資料">
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        ${avatarImg}
                        <div>
                            <div style="font-weight:bold; color:var(--gold); text-decoration:underline;">${u.nickname || '未命名'}</div>
                            <div style="font-size:0.75rem; color:var(--text-dim);">${u.email}</div>
                        </div>
                    </div>
                </td>
                <td>LV ${u.level || 1}</td>
                <td style="color: var(--gold); font-weight: bold;">${u.totalQuestions || 0}</td>
                <td>${Math.floor((u.totalTime || 0) / 60)}m</td>
                <td>
                    <button class="btn btn-outline btn-small" onclick="viewUserDetail('${u.uid}', '${u.nickname || u.email.split('@')[0]}')">觀看紀錄</button>
                </td>
            </tr>
        `}).join('');
    } else if (tab === 'records') {
        recordsTab.classList.remove('hidden');
        recordsBtn.classList.add('btn-primary');
        const records = await getAllPracticeRecords();
        document.getElementById('admin-records-body').innerHTML = records.map(r => {
            const date = r.timestamp ? (r.timestamp.toDate ? r.timestamp.toDate() : new Date(r.timestamp)) : new Date();
            const countDisplay = r.correctCount !== undefined ? `${r.correctCount}/${r.count}` : r.count;
            return `
                <tr>
                    <td>${date.toLocaleString()}</td>
                    <td>${r.email}</td>
                    <td>${r.subject.name || r.subject}</td>
                    <td>${countDisplay}</td>
                    <td style="color:${r.score >= 80 ? 'var(--success)' : 'var(--danger)'}">${r.score}%</td>
                </tr>
            `;
        }).join('');
    } else if (tab === 'teachers') {
        teachersTab.classList.remove('hidden');
        teachersBtn.classList.add('btn-primary');
        await renderAdminTeachers();
    } else if (tab === 'feedbacks') {
        feedbacksTab.classList.remove('hidden');
        feedbacksBtn.classList.add('btn-primary');
        await renderAdminFeedbacks();
    }
};

window.viewUserDetail = async (uid, nickname) => {
    const usersTab = document.getElementById('admin-tab-users');
    const recordsTab = document.getElementById('admin-tab-records');
    const detailTab = document.getElementById('admin-tab-detail');
    const tabsContainer = document.getElementById('admin-tabs-container');

    usersTab.classList.add('hidden');
    recordsTab.classList.add('hidden');
    tabsContainer.classList.add('hidden');
    document.getElementById('admin-tab-userprofile').classList.add('hidden');
    detailTab.classList.remove('hidden');

    document.getElementById('admin-detail-name').textContent = `勇者詳情：${nickname}`;
    document.getElementById('admin-detail-body').innerHTML = '<tr><td colspan="4" style="text-align:center;">載入紀錄中...</td></tr>';

    try {
        const records = await getUserPracticeRecords(uid);
        if (records.length === 0) {
            document.getElementById('admin-detail-body').innerHTML = '<tr><td colspan="4" style="text-align:center;">尚無練習紀錄</td></tr>';
        } else {
            document.getElementById('admin-detail-body').innerHTML = records.map(r => {
                const date = r.timestamp ? (r.timestamp.toDate ? r.timestamp.toDate() : new Date(r.timestamp)) : new Date();
                const countDisplay = r.correctCount !== undefined ? `${r.correctCount}/${r.count}` : r.count;
                return `
                    <tr>
                        <td>${date.toLocaleString()}</td>
                        <td>${r.subject.name || r.subject}</td>
                        <td>${countDisplay}</td>
                        <td style="color:${r.score >= 80 ? 'var(--success)' : 'var(--danger)'}">${r.score}%</td>
                    </tr>
                `;
            }).join('');
        }
    } catch (e) {
        console.error(e);
        document.getElementById('admin-detail-body').innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--danger);">載入失敗</td></tr>';
    }
};

window.viewUserProfile = async (uid) => {
    const usersTab = document.getElementById('admin-tab-users');
    const recordsTab = document.getElementById('admin-tab-records');
    const detailTab = document.getElementById('admin-tab-detail');
    const profileTab = document.getElementById('admin-tab-userprofile');
    const tabsContainer = document.getElementById('admin-tabs-container');

    usersTab.classList.add('hidden');
    recordsTab.classList.add('hidden');
    tabsContainer.classList.add('hidden');
    detailTab.classList.add('hidden');
    profileTab.classList.remove('hidden');

    const contentDiv = document.getElementById('admin-userprofile-content');
    contentDiv.innerHTML = '<div style="text-align:center;">載入中...</div>';

    try {
        const users = await getAllUsers();
        const user = users.find(u => u.uid === uid);
        if (!user) {
            contentDiv.innerHTML = '<div style="color:var(--danger);">找不到該勇者資料。</div>';
            return;
        }

        const roleText = user.role === 'teacher' ? '老師' : (user.role === 'student' ? '學生' : '未設定');
        
        contentDiv.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div><strong style="color:var(--gold);">勇者暱稱：</strong> ${user.nickname || '未設定'}</div>
                <div><strong style="color:var(--gold);">帳號信箱：</strong> ${user.email}</div>
                <div><strong style="color:var(--gold);">身份別：</strong> ${roleText}</div>
                <div><strong style="color:var(--gold);">真實姓名：</strong> ${user.realName || '未填寫'}</div>
                <div><strong style="color:var(--gold);">學校名稱：</strong> ${user.school || '未填寫'}</div>
                <div><strong style="color:var(--gold);">任教科目：</strong> ${user.teacherSubject || '未填寫'}</div>
                <div><strong style="color:var(--gold);">持有芒果幣：</strong> ${user.gold || 0} G</div>
                <div><strong style="color:var(--gold);">上榜感言：</strong> ${user.honorMessage || '未設定'}</div>
            </div>
            <div style="margin-top: 1.5rem; display: flex; gap: 0.5rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem;">
                <button class="btn btn-outline btn-small" onclick="adminClearHonorMessage('${user.uid}')" style="border-color: #f87171; color: #f87171;">
                    <i class="fas fa-eraser"></i> 清除上榜感言
                </button>
                <button class="btn btn-outline btn-small" onclick="adminDeductGold('${user.uid}')" style="border-color: #f87171; color: #f87171;">
                    <i class="fas fa-coins"></i> 扣除 500 芒果幣 (處罰)
                </button>
            </div>
        `;
    } catch (e) {
        console.error(e);
        contentDiv.innerHTML = '<div style="color:var(--danger);">載入失敗。</div>';
    }
};

window.adminClearHonorMessage = async (uid) => {
    if (!confirm('確定要清除此勇者的上榜感言嗎？')) return;
    try {
        await syncUserStats(uid, { honorMessage: '' });
        alert('感言已清除。');
        viewUserProfile(uid); // Refresh
        renderHomepageLeaderboard(); // Refresh global cache
    } catch (e) { alert('操作失敗: ' + e.message); }
};

window.adminDeductGold = async (uid) => {
    if (!confirm('確定要對此勇者扣除 500 芒果幣作為處罰嗎？')) return;
    try {
        await syncUserStats(uid, { goldDelta: -500 });
        alert('芒果幣已扣除。');
        viewUserProfile(uid); // Refresh
    } catch (e) { alert('操作失敗: ' + e.message); }
};

// --- Teacher and Feedback Front-End Management ---

const renderAdminTeachers = async () => {
    const tbody = document.getElementById('admin-teachers-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">載入中...</td></tr>';
    
    try {
        const teachers = await getAllTeachers();
        if (teachers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">尚未建立任何教師資料</td></tr>';
            return;
        }
        
        tbody.innerHTML = teachers.map(t => `
            <tr>
                <td><strong style="color: var(--gold);">${t.name}</strong></td>
                <td>${t.email}</td>
                <td>
                    <button class="btn btn-outline btn-small" onclick="deleteTeacherAction('${t.email}')" style="border-color: #f87171; color: #f87171;">
                        <i class="fas fa-trash-can"></i> 刪除
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--danger);">載入失敗</td></tr>';
    }
};
window.renderAdminTeachers = renderAdminTeachers;

const toggleAddTeacherManual = () => {
    const form = document.getElementById('manual-teacher-form');
    if (form) form.classList.toggle('hidden');
};
window.toggleAddTeacherManual = toggleAddTeacherManual;

const addTeacherManualSubmit = async () => {
    const nameEl = document.getElementById('new-teacher-name');
    const emailEl = document.getElementById('new-teacher-email');
    if (!nameEl || !emailEl) return;
    
    const name = nameEl.value.trim();
    const email = emailEl.value.trim().toLowerCase();
    
    if (!name || !email) {
        alert('姓名與 Email 皆為必填！');
        return;
    }
    
    // Warning domain check
    if (!email.endsWith('@apps.ycvs.tn.edu.tw') && email !== 'adamzombie85@gmail.com') {
        if (!confirm('提示：非學校網域信箱 (@apps.ycvs.tn.edu.tw) 可能無法直接註冊登入。是否確定要新增？')) {
            return;
        }
    }
    
    showLoadingOverlay(true);
    try {
        await addTeacher(name, email);
        alert('教師新增成功！');
        nameEl.value = '';
        emailEl.value = '';
        const form = document.getElementById('manual-teacher-form');
        if (form) form.classList.add('hidden');
        await renderAdminTeachers();
    } catch (e) {
        console.error(e);
        alert('新增失敗: ' + e.message);
    } finally {
        showLoadingOverlay(false);
    }
};
window.addTeacherManualSubmit = addTeacherManualSubmit;

const deleteTeacherAction = async (email) => {
    if (!confirm(`確定要刪除教師 (${email}) 嗎？其授權權限將會被收回。`)) return;
    
    showLoadingOverlay(true);
    try {
        await deleteTeacher(email);
        alert('已成功刪除該教師！');
        await renderAdminTeachers();
    } catch (e) {
        console.error(e);
        alert('刪除失敗: ' + e.message);
    } finally {
        showLoadingOverlay(false);
    }
};
window.deleteTeacherAction = deleteTeacherAction;

const importTeachersCSV = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target.result;
        const lines = text.split('\n');
        let successCount = 0;
        let failCount = 0;
        
        showLoadingOverlay(true);
        for (let line of lines) {
            line = line.trim();
            if (!line) continue;
            // Handle simple CSV splitting
            const parts = parseCSVLine(line);
            if (parts.length >= 2) {
                const name = parts[0].trim();
                const email = parts[1].trim().toLowerCase();
                if (email && name) {
                    try {
                        await addTeacher(name, email);
                        successCount++;
                    } catch (err) {
                        console.error("Failed to import teacher:", name, email, err);
                        failCount++;
                    }
                }
            }
        }
        showLoadingOverlay(false);
        alert(`批次匯入完成！\n成功：${successCount} 筆\n失敗：${failCount} 筆`);
        renderAdminTeachers();
        event.target.value = ''; // Reset input
    };
    reader.readAsText(file);
};
window.importTeachersCSV = importTeachersCSV;

const renderAdminFeedbacks = async () => {
    const tbody = document.getElementById('admin-feedbacks-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">載入中...</td></tr>';
    
    try {
        const feedbacks = await getAllFeedbacks();
        if (feedbacks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">目前尚無建議與回饋紀錄</td></tr>';
            return;
        }
        
        tbody.innerHTML = feedbacks.map(f => {
            const time = f.timestamp ? (f.timestamp.toDate ? f.timestamp.toDate() : new Date(f.timestamp)) : new Date();
            const replySection = f.reply ? `
                <div style="font-size: 0.8rem; color: var(--success); margin-top: 0.25rem;">
                    <strong>回覆：</strong> ${f.reply}
                    <div style="font-size: 0.7rem; color: var(--text-dim);">${f.replyTime ? (f.replyTime.toDate ? f.replyTime.toDate() : new Date(f.replyTime)).toLocaleString() : ''}</div>
                </div>
            ` : `<span style="color: var(--danger); font-style: italic;">尚未回覆</span>`;
            
            const replyBtn = !f.reply ? `
                <button class="btn btn-outline btn-small" onclick="replyFeedbackPrompt('${f.id}')"><i class="fas fa-reply"></i> 回覆</button>
            ` : '';
            
            return `
                <tr>
                    <td>${f.email}</td>
                    <td style="max-width: 280px; word-break: break-all; text-align: left; padding: 0.75rem;">${f.content}</td>
                    <td>${time.toLocaleString()}</td>
                    <td>${replySection}</td>
                    <td>${replyBtn}</td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--danger);">載入失敗</td></tr>';
    }
};
window.renderAdminFeedbacks = renderAdminFeedbacks;

const replyFeedbackPrompt = async (id) => {
    const replyText = prompt('請輸入對該回饋的回覆內容：');
    if (replyText === null) return;
    const trimmed = replyText.trim();
    if (!trimmed) {
        alert('回覆內容不可為空！');
        return;
    }
    
    showLoadingOverlay(true);
    try {
        await replyToFeedback(id, trimmed, state.currentUser.email);
        alert('回覆成功！');
        await renderAdminFeedbacks();
    } catch (e) {
        console.error(e);
        alert('回覆失敗：' + e.message);
    } finally {
        showLoadingOverlay(false);
    }
};
window.replyFeedbackPrompt = replyFeedbackPrompt;

// --- Teacher Dashboard and Students Management ---

const toggleTeacherModal = async () => {
    if (state.userRole !== 'teacher' && state.userRole !== 'admin') return;
    
    document.getElementById('teacher-modal').classList.remove('hidden');
    switchTeacherTab('students');
};
window.toggleTeacherModal = toggleTeacherModal;

const switchTeacherTab = async (tab) => {
    const studentsTab = document.getElementById('teacher-tab-students');
    const statsTab = document.getElementById('teacher-tab-stats');
    const tasksTab = document.getElementById('teacher-tab-tasks');
    const studentsBtn = document.getElementById('teacher-tab-students-btn');
    const statsBtn = document.getElementById('teacher-tab-stats-btn');
    const tasksBtn = document.getElementById('teacher-tab-tasks-btn');
    
    studentsTab.classList.add('hidden');
    statsTab.classList.add('hidden');
    if(tasksTab) tasksTab.classList.add('hidden');
    
    studentsBtn.classList.remove('btn-primary');
    statsBtn.classList.remove('btn-primary');
    if(tasksBtn) tasksBtn.classList.remove('btn-primary');
    
    if (tab === 'students') {
        studentsTab.classList.remove('hidden');
        studentsBtn.classList.add('btn-primary');
        await renderTeacherStudents();
    } else if (tab === 'stats') {
        statsTab.classList.remove('hidden');
        statsBtn.classList.add('btn-primary');
        await renderTeacherStats();
    } else if (tab === 'tasks') {
        if(tasksTab) tasksTab.classList.remove('hidden');
        if(tasksBtn) tasksBtn.classList.add('btn-primary');
        await renderTeacherTasksDropdown();
    }
};
window.switchTeacherTab = switchTeacherTab;

const renderTeacherStudents = async () => {
    const tbody = document.getElementById('teacher-students-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">載入中...</td></tr>';
    
    try {
        const students = await getStudentsOfTeacher(state.currentUser.email);
        if (students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">尚未建立任何學生名單</td></tr>';
            return;
        }
        
        tbody.innerHTML = students.map(s => `
            <tr>
                <td>${s.className}</td>
                <td><strong style="color: var(--gold);">${s.name}</strong></td>
                <td>${s.email}</td>
                <td>
                    <button class="btn btn-outline btn-small" onclick="deleteStudentAction('${s.email}')" style="border-color: #f87171; color: #f87171;">
                        <i class="fas fa-user-minus"></i> 移除
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--danger);">載入失敗</td></tr>';
    }
};
window.renderTeacherStudents = renderTeacherStudents;

const toggleAddStudentManual = () => {
    const form = document.getElementById('manual-student-form');
    if (form) form.classList.toggle('hidden');
};
window.toggleAddStudentManual = toggleAddStudentManual;

const addStudentManualSubmit = async () => {
    const classEl = document.getElementById('new-student-class');
    const nameEl = document.getElementById('new-student-name');
    const emailEl = document.getElementById('new-student-email');
    if (!classEl || !nameEl || !emailEl) return;
    
    const className = classEl.value.trim();
    const name = nameEl.value.trim();
    const email = emailEl.value.trim().toLowerCase();
    
    if (!className || !name || !email) {
        alert('班級、姓名與 Email 皆為必填欄位！');
        return;
    }
    
    // Warning domain check
    if (!email.endsWith('@apps.ycvs.tn.edu.tw')) {
        alert('注意：學生僅限使用學校信箱 (@apps.ycvs.tn.edu.tw)！');
        return;
    }
    
    showLoadingOverlay(true);
    try {
        await addStudent(className, name, email, state.currentUser.email);
        alert('學生新增成功！');
        classEl.value = '';
        nameEl.value = '';
        emailEl.value = '';
        const form = document.getElementById('manual-student-form');
        if (form) form.classList.add('hidden');
        await renderTeacherStudents();
    } catch (e) {
        console.error(e);
        alert('新增失敗: ' + e.message);
    } finally {
        showLoadingOverlay(false);
    }
};
window.addStudentManualSubmit = addStudentManualSubmit;

const deleteStudentAction = async (email) => {
    if (!confirm(`確定要將此學生 (${email}) 自您的班級學生名冊中移除嗎？其授權將會被收回。`)) return;
    
    showLoadingOverlay(true);
    try {
        await deleteStudent(email);
        alert('已成功移除該學生！');
        await renderTeacherStudents();
    } catch (e) {
        console.error(e);
        alert('移除失敗: ' + e.message);
    } finally {
        showLoadingOverlay(false);
    }
};
window.deleteStudentAction = deleteStudentAction;

const renderTeacherTasksDropdown = async () => {
    const select = document.getElementById('task-student-select');
    if (!select) return;
    
    try {
        const students = await getStudentsOfTeacher(state.currentUser.email);
        select.innerHTML = '<option value="">請選擇學生...</option>' + 
            students.map(s => `<option value='${JSON.stringify(s)}'>${s.className} - ${s.name} (${s.email})</option>`).join('');
    } catch (error) {
        console.error("Error loading students for tasks", error);
    }
};

const handleAssignTask = async (event) => {
    event.preventDefault();
    if (!state.currentUser) return;

    const studentJson = document.getElementById('task-student-select').value;
    const subject = document.getElementById('task-subject-select').value;
    const startDate = document.getElementById('task-start-date').value;
    const endDate = document.getElementById('task-end-date').value;

    if (!studentJson || !subject || !startDate || !endDate) {
        alert('請填寫完整任務資訊');
        return;
    }

    const student = JSON.parse(studentJson);
    const taskData = {
        email: student.email,
        className: student.className,
        name: student.name,
        subject: subject,
        startDate: startDate,
        endDate: endDate
    };

    showLoadingOverlay(true);
    const success = await saveTaskToGAS(taskData);
    showLoadingOverlay(false);

    if (success) {
        alert('任務指派成功並已同步至 Google Sheet！');
        document.getElementById('assign-task-form').reset();
    } else {
        alert('任務同步至 Google Sheet 失敗，請稍後再試。');
    }
};
window.handleAssignTask = handleAssignTask;

const downloadStudentTemplate = () => {
    const ws_name = "學生名單範本";
    const wb = XLSX.utils.book_new();
    const ws_data = [
        ["班級", "姓名", "Email"],
        ["資科三", "王小明", "student@apps.ycvs.tn.edu.tw"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, ws_name);
    XLSX.writeFile(wb, "學生名單匯入範本.xlsx");
};
window.downloadStudentTemplate = downloadStudentTemplate;

const importStudentsFile = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const extension = file.name.split('.').pop().toLowerCase();
    
    const processData = async (dataArray) => {
        let successCount = 0;
        let failCount = 0;
        
        showLoadingOverlay(true);
        for (let parts of dataArray) {
            if (parts.length >= 3) {
                const className = (parts[0] || '').toString().trim();
                const name = (parts[1] || '').toString().trim();
                const email = (parts[2] || '').toString().trim().toLowerCase();
                if (className && name && email && className !== '班級') {
                    try {
                        await addStudent(className, name, email, state.currentUser.email);
                        successCount++;
                    } catch (err) {
                        console.error("Failed to import student:", className, name, email, err);
                        failCount++;
                    }
                }
            }
        }
        showLoadingOverlay(false);
        alert(`批次匯入完成！\n成功：${successCount} 筆\n失敗：${failCount} 筆`);
        renderTeacherStudents();
        event.target.value = '';
    };

    if (extension === 'csv') {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target.result;
            const lines = text.split('\n');
            const dataArray = lines.map(line => parseCSVLine(line.trim())).filter(parts => parts.length > 0);
            await processData(dataArray);
        };
        reader.readAsText(file);
    } else if (extension === 'xlsx' || extension === 'xls') {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, {header: 1});
            await processData(json);
        };
        reader.readAsArrayBuffer(file);
    } else {
        alert("不支援的檔案格式，請上傳 CSV 或 Excel 檔案");
        event.target.value = '';
    }
};
window.importStudentsFile = importStudentsFile;

window.renderTeacherStats = async () => {
    const tbody = document.getElementById('teacher-stats-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">載入中...</td></tr>';
    
    try {
        const students = await getStudentsOfTeacher(state.currentUser.email);
        if (students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">尚無任何學生的統計資料</td></tr>';
            return;
        }
        
        const allUsers = await getAllUsers();
        
        tbody.innerHTML = students.map(s => {
            const userProfile = allUsers.find(u => u.email === s.email);
            const level = userProfile ? (userProfile.level || 1) : 1;
            const totalQuestions = userProfile ? (userProfile.totalQuestions || 0) : 0;
            const totalTime = userProfile ? (userProfile.totalTime || 0) : 0;
            const mins = Math.floor(totalTime / 60);
            
            const detailBtn = userProfile ? `
                <button class="btn btn-outline btn-small" onclick="viewStudentDetail('${userProfile.uid}', '${s.name}')"><i class="fas fa-eye"></i> 觀看紀錄</button>
            ` : `<span style="font-size: 0.8rem; color: var(--text-dim); font-style: italic;">學生尚未註冊</span>`;
            
            return `
                <tr>
                    <td>${s.className}</td>
                    <td><strong style="color: var(--gold);">${s.name}</strong></td>
                    <td>LV ${level}</td>
                    <td style="color: var(--gold); font-weight: bold;">${totalQuestions}</td>
                    <td>${mins} 分鐘</td>
                    <td>${detailBtn}</td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--danger);">載入失敗</td></tr>';
    }
};

window.viewStudentDetail = async (uid, nickname) => {
    document.getElementById('teacher-modal').classList.add('hidden');
    document.getElementById('admin-modal').classList.remove('hidden');
    switchAdminTab('users'); // Reset admin view tabs first
    viewUserDetail(uid, nickname);
    
    // Add custom back handler to admin modal back button to return to teacher modal if needed
    const backBtn = document.querySelector('#admin-tab-detail button');
    if (backBtn) {
        const originalOnClick = backBtn.getAttribute('onclick');
        backBtn.onclick = () => {
            document.getElementById('admin-modal').classList.add('hidden');
            document.getElementById('teacher-modal').classList.remove('hidden');
            switchTeacherTab('stats');
            // restore standard onclick
            backBtn.onclick = null;
            backBtn.setAttribute('onclick', originalOnClick);
        };
    }
};

function renderProfileAvatar() {
    if (!state.userProfile) return;
    const avatar = state.userProfile.avatar || 'male_1.png';
    const avatarPath = `assets/avatars/${avatar}`;
    
    elements.userAvatarBtn.innerHTML = `<img src="${avatarPath}" style="width: 100%; height: 100%; object-fit: cover; display: block;">`;
    const profileAvatar = document.getElementById('profile-current-avatar');
    if (profileAvatar) {
        profileAvatar.innerHTML = `<img src="${avatarPath}" style="width: 64px; height: 64px; border-radius: 50%; border: 2px solid var(--gold); object-fit: cover; display: block;">`;
    }
    updateProfileDisplay();
}

// --- Story Prologue Logic ---

async function showPrologue() {
    const modal = document.getElementById('prologue-modal');
    const textContainer = document.getElementById('prologue-text');
    const skipBtn = document.getElementById('skip-prologue-btn');
    const storyText = "古老的王國傳說著... 邪惡的挑戰奪走了世界上所有的珍貴成就，將它們撕碎並藏在深淵之中。\n\n身為勇者，你必須通過『丙級檢定』的試煉，在練習中磨練心智，在戰鬥中擊敗挑戰，奪回失去的拼圖碎片，重現成就的光輝！";
    
    modal.classList.remove('hidden');
    
    let i = 0;
    function type() {
        if (i < storyText.length) {
            textContainer.innerHTML = storyText.substring(0, i + 1).replace(/\n/g, '<br>') + '<span class="typing-cursor"></span>';
            i++;
            setTimeout(type, 30);
        } else {
            textContainer.innerHTML = storyText.replace(/\n/g, '<br>');
            skipBtn.classList.remove('hidden');
        }
    }
    
    setTimeout(type, 300);
    
    skipBtn.onclick = () => {
        modal.classList.add('hidden');
        localStorage.setItem('prologue_shown', 'true');
        // Let user audio trigger safely on skip click
        const bgMusic = document.getElementById('bg-music');
        if (bgMusic && bgMusic.paused) {
            // bgMusic.play().catch(e => console.log("Music play blocked:", e));
        }
    };
}

async function preloadAllQuizData() {
    const subjects = Object.keys(state.config.subjectMap);
    const total = subjects.length;
    let loaded = 0;

    console.log("開始並行預載入題庫資料...");
    
    const updateProgress = () => {
        const percent = Math.round((loaded / total) * 100);
        if (elements.preloaderBar) elements.preloaderBar.style.width = `${percent}%`;
        if (elements.preloaderStatus) elements.preloaderStatus.textContent = `正在獲取勇者卷軸 (${percent}%)`;
    };

    updateProgress();

    const promises = subjects.map(async (subKey) => {
        try {
            if (!state.cachedData[subKey]) {
                const response = await fetch(state.config.subjectMap[subKey].file);
                state.cachedData[subKey] = await response.json();
                console.log(`預載入成功: ${subKey}`);
            }
            loaded++;
            updateProgress();
        } catch (e) {
            console.warn(`預載入失敗: ${subKey}`, e);
            loaded++;
            updateProgress();
        }
    });

    await Promise.all(promises);
    console.log("題庫預載入完成");
}

async function initApp() {
    try {
        await preloadAllQuizData();
        setTimeout(() => {
            if (elements.globalPreloader) {
                elements.globalPreloader.classList.add('fade-out');
            }
            showPrologue();
        }, 800);
    } catch (err) {
        console.error("Initialization failed:", err);
        if (elements.globalPreloader) elements.globalPreloader.classList.add('fade-out');
    }
}

initApp();

window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        if (e.target.id === 'auth-modal' || e.target.id === 'levelup-modal' || e.target.id === 'prologue-modal') return;
        e.target.classList.add('hidden');
    }
});

let idleTimer;
const IDLE_LIMIT = 2 * 60 * 60 * 1000;

function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    if (state.currentUser) {
        idleTimer = setTimeout(() => {
            handleIdleLogout();
        }, IDLE_LIMIT);
    }
}

async function handleIdleLogout() {
    if (state.currentUser) {
        await logoutUser();
        alert('您已閒置超過 2 小時，系統已自動登出以保護帳號安全。');
        window.location.reload();
    }
}

['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll'].forEach(evt => {
    window.addEventListener(evt, resetIdleTimer);
});

resetIdleTimer();
// --- 3D Yujing Accessibility Kingdom Builder & Admin Features ---

const BUILDING_TYPES = {
    mango_orchard: { name: '玉井芒果園', cost: 100, desc: '種植甜美的愛文芒果。定期生產「玉井芒果」與「芒果種子」。', icon: 'fa-lemon' },
    orchard_native: { name: '土芒果園', cost: 100, desc: '特化土芒果園。100%生產「土芒果」與「土芒果種子」。需要5顆土芒果或通用種子。', icon: 'fa-lemon' },
    orchard_irwin: { name: '愛文芒果園', cost: 150, desc: '特化愛文芒果園。100%生產「愛文芒果」與「愛文芒果種子」。需要5顆愛文種子。', icon: 'fa-lemon' },
    orchard_jinhuang: { name: '金煌芒果園', cost: 200, desc: '特化金煌芒果園。100%生產「金煌芒果」與「金煌芒果種子」。需要5顆金煌種子。', icon: 'fa-lemon' },
    orchard_yuwen: { name: '玉文芒果園', cost: 250, desc: '特化玉文芒果園。100%生產「玉文芒果」與「玉文芒果種子」。需要5顆玉文種子。', icon: 'fa-lemon' },
    house: { name: '皇家住宅', cost: 150, desc: '增加王國的人口上限，定期生產少量芒果幣。', icon: 'fa-house' },
    windmill: { name: '皇家風車', cost: 200, desc: '引導微風運轉，定期生產「牛奶」。', icon: 'fa-wind' },
    watchtower: { name: '王國暸望塔', cost: 250, desc: '防禦領土，提供對戰防守力加成。', icon: 'fa-shield-halved' },
    library: { name: '皇家圖書館', cost: 400, desc: '累積學識。使您在答對題目時獲得的芒果幣 +10%。', icon: 'fa-book' },
    goldmine: { name: '金礦山', cost: 500, desc: '開採地底金礦。定期產生「芒果幣」。', icon: 'fa-coins' },
    castle: { name: '玉井皇家城堡', cost: 1000, desc: '王國核心，解鎖各種在地特色地標。', icon: 'fa-fort-awesome' },
    
    // Yujing Local Landmarks
    yujing_sugar: { name: '玉井糖廠', cost: 600, desc: '懷舊的紅磚煙囪地標。定期產生大量芒果幣。', photo: 'local pictures/玉井糖廠.jpg', icon: 'fa-industry' },
    yujing_school: { name: '玉井工商 (YCVS)', cost: 800, desc: '培育技術人才的學習殿堂。答題獲得的經驗值 +20%。', photo: 'local pictures/玉井工商.jpg', icon: 'fa-school' },
    yujing_fruit_market: { name: '玉井青果集貨場', cost: 700, desc: '全台最大芒果批發市場。芒果物資收購價 +15%。', photo: 'local pictures/玉井青果集貨場.jpg', icon: 'fa-store' },
    yujing_police: { name: '玉井警察局', cost: 500, desc: '維護地方治安。答題遭遇野怪機率減半。', photo: 'local pictures/玉井警察局.jpeg', icon: 'fa-building-shield' },
    yujing_temple: { name: '玉井北極殿', cost: 900, desc: '三百多年信仰中心。每日可在此免費祈福隨機獲得物資。', photo: 'local pictures/玉井北極殿.jpg', icon: 'fa-gopuram' },
    yujing_roundabout: { name: '玉井圓環', cost: 400, desc: '市區交通樞紐，中央設有美麗的噴水池。', photo: 'local pictures/玉井圓環.jpg', icon: 'fa-circle-dot' },
    yujing_landmark: { name: '玉井芒果地標', cost: 300, desc: '圓環的巨型愛文芒果雕像。象徵芒果之鄉！', photo: 'local pictures/玉井地標.jpg', icon: 'fa-lemon' },
    yujing_fire_station: { name: '玉井消防隊', cost: 500, desc: '守護家園安全，避免意外損失。', photo: 'local pictures/玉井消防隊.jpg', icon: 'fa-fire-extinguisher' }
};

// Material helper supporting High Contrast mode
function getMaterial(color, isEmissive = false) {
    const isHighContrast = document.body.classList.contains('a11y-contrast-high');
    if (isHighContrast) {
        let hcColor = color;
        if (color === '#4caf50' || color === '#388e3c') hcColor = '#00ff00'; // Neon green
        else if (color === '#7f1d1d' || color === '#ef4444') hcColor = '#ff0000'; // Neon red
        else if (color === '#1e293b' || color === '#5a4d41') hcColor = '#000000'; // Black
        else if (color === '#fbbf24') hcColor = '#ffff00'; // Bright yellow
        else if (color === '#3b82f6') hcColor = '#0000ff'; // Bright blue
        else if (color === '#ffffff') hcColor = '#ffffff';
        return new THREE.MeshBasicMaterial({ color: hcColor });
    } else {
        return new THREE.MeshStandardMaterial({
            color: color,
            flatShading: true,
            roughness: 0.8,
            metalness: 0.15,
            emissive: isEmissive ? color : '#000000',
            emissiveIntensity: isEmissive ? 0.5 : 0
        });
    }
}

// Procedural 3D model generator
function createProceduralModel(type, level) {
    const group = new THREE.Group();
    group.name = type;

    switch (type) {
        case 'mango_orchard':
        case 'orchard_native':
        case 'orchard_irwin':
        case 'orchard_jinhuang':
        case 'orchard_yuwen':
            // Trunk
            const trunkGeom = new THREE.CylinderGeometry(0.08, 0.1, 0.4, 6);
            const trunkMat = getMaterial('#78350f');
            const trunk = new THREE.Mesh(trunkGeom, trunkMat);
            trunk.position.y = 0.2;
            group.add(trunk);
            
            // Foliage & Mango Colors based on variety
            let foliageColor = '#16a34a';
            let mangoColor = '#f59e0b';
            
            if (type === 'orchard_native') {
                foliageColor = '#16a34a';
                mangoColor = '#4caf50'; // 青綠色
            } else if (type === 'orchard_irwin') {
                foliageColor = '#15803d'; // 翠綠
                mangoColor = '#ea580c'; // 橘紅色
            } else if (type === 'orchard_jinhuang') {
                foliageColor = '#166534'; // 暗綠
                mangoColor = '#facc15'; // 鮮黃色
            } else if (type === 'orchard_yuwen') {
                foliageColor = '#14532d'; // 墨綠
                mangoColor = '#db2777'; // 桃紅色
            }
            
            // Foliage
            const foliageGeom = new THREE.SphereGeometry(0.28, 8, 8);
            const foliageMat = getMaterial(foliageColor);
            const foliage = new THREE.Mesh(foliageGeom, foliageMat);
            foliage.position.y = 0.45;
            group.add(foliage);
            // Hanging Mangoes
            for (let i = 0; i < 3; i++) {
                const mangoGeom = new THREE.SphereGeometry(0.05, 4, 4);
                mangoGeom.scale(0.8, 1.2, 0.8);
                const mangoMat = getMaterial(mangoColor);
                const mango = new THREE.Mesh(mangoGeom, mangoMat);
                const angle = (i * Math.PI * 2) / 3;
                mango.position.set(Math.cos(angle) * 0.18, 0.35, Math.sin(angle) * 0.18);
                group.add(mango);
            }
            break;
            
        case 'house':
            // Base
            const houseGeom = new THREE.BoxGeometry(0.4, 0.35, 0.4);
            const houseMat = getMaterial('#ffffff');
            const house = new THREE.Mesh(houseGeom, houseMat);
            house.position.y = 0.175;
            group.add(house);
            // Roof
            const roofGeom = new THREE.ConeGeometry(0.35, 0.25, 4);
            roofGeom.rotateY(Math.PI / 4);
            const roofMat = getMaterial('#dc2626');
            const roof = new THREE.Mesh(roofGeom, roofMat);
            roof.position.y = 0.45;
            group.add(roof);
            break;

        case 'windmill':
            // Tower
            const windGeom = new THREE.CylinderGeometry(0.12, 0.2, 0.5, 6);
            const windMat = getMaterial('#e2e8f0');
            const wind = new THREE.Mesh(windGeom, windMat);
            wind.position.y = 0.25;
            group.add(wind);
            // Dome
            const domeGeom = new THREE.SphereGeometry(0.13, 6, 6);
            const domeMat = getMaterial('#b91c1c');
            const dome = new THREE.Mesh(domeGeom, domeMat);
            dome.position.y = 0.5;
            group.add(dome);
            // Sails Group (so we can rotate it)
            const sailsGroup = new THREE.Group();
            sailsGroup.name = "sails";
            sailsGroup.position.set(0, 0.45, 0.15);
            // Cross sails
            const crossMat = getMaterial('#475569');
            for (let i = 0; i < 4; i++) {
                const bladeGeom = new THREE.BoxGeometry(0.04, 0.4, 0.01);
                const blade = new THREE.Mesh(bladeGeom, crossMat);
                blade.rotation.z = (i * Math.PI) / 2;
                blade.position.y = 0.15;
                const singleBladeGroup = new THREE.Group();
                singleBladeGroup.rotation.z = (i * Math.PI) / 2;
                blade.position.set(0, 0.15, 0);
                singleBladeGroup.add(blade);
                sailsGroup.add(singleBladeGroup);
            }
            group.add(sailsGroup);
            break;

        case 'watchtower':
            // Columns
            const towerGeom = new THREE.CylinderGeometry(0.18, 0.2, 0.6, 6);
            const towerMat = getMaterial('#64748b');
            const tower = new THREE.Mesh(towerGeom, towerMat);
            tower.position.y = 0.3;
            group.add(tower);
            // Platform
            const platGeom = new THREE.BoxGeometry(0.45, 0.05, 0.45);
            const platMat = getMaterial('#78350f');
            const platform = new THREE.Mesh(platGeom, platMat);
            platform.position.y = 0.6;
            group.add(platform);
            // Roof
            const topConeGeom = new THREE.ConeGeometry(0.3, 0.2, 4);
            const topConeMat = getMaterial('#475569');
            const topCone = new THREE.Mesh(topConeGeom, topConeMat);
            topCone.position.y = 0.75;
            group.add(topCone);
            break;

        case 'library':
            // Main structure
            const libGeom = new THREE.BoxGeometry(0.5, 0.3, 0.5);
            const libMat = getMaterial('#1e3a8a');
            const library = new THREE.Mesh(libGeom, libMat);
            library.position.y = 0.15;
            group.add(library);
            // Portico Columns
            const colMat = getMaterial('#ffffff');
            for (let xOffset of [-0.2, 0, 0.2]) {
                const colGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.28, 4);
                const col = new THREE.Mesh(colGeom, colMat);
                col.position.set(xOffset, 0.14, 0.24);
                group.add(col);
            }
            // Triangular Pediment Roof
            const triGeom = new THREE.ConeGeometry(0.4, 0.18, 4);
            triGeom.rotateY(Math.PI / 4);
            const triMat = getMaterial('#3b82f6');
            const pediment = new THREE.Mesh(triGeom, triMat);
            pediment.position.y = 0.38;
            group.add(pediment);
            break;

        case 'goldmine':
            // Rock base
            const rockGeom = new THREE.DodecahedronGeometry(0.25);
            const rockMat = getMaterial('#475569');
            const rock = new THREE.Mesh(rockGeom, rockMat);
            rock.position.y = 0.2;
            group.add(rock);
            // Gold crystals
            for (let i = 0; i < 4; i++) {
                const goldCrystGeom = new THREE.BoxGeometry(0.06, 0.06, 0.06);
                const goldMat = getMaterial('#fbbf24', true);
                const crystal = new THREE.Mesh(goldCrystGeom, goldMat);
                crystal.rotation.set(Math.random(), Math.random(), Math.random());
                crystal.position.set(
                    (Math.random() - 0.5) * 0.2,
                    0.2 + (Math.random() * 0.15),
                    (Math.random() - 0.5) * 0.2
                );
                group.add(crystal);
            }
            break;

        case 'castle':
            // Main structure
            const castleGeom = new THREE.BoxGeometry(0.55, 0.4, 0.55);
            const castleMat = getMaterial('#475569');
            const mainKeep = new THREE.Mesh(castleGeom, castleMat);
            mainKeep.position.y = 0.2;
            group.add(mainKeep);
            // Corner Towers
            const tOffset = 0.25;
            for (let dx of [-tOffset, tOffset]) {
                for (let dz of [-tOffset, tOffset]) {
                    const ctGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.55, 6);
                    const ct = new THREE.Mesh(ctGeom, castleMat);
                    ct.position.set(dx, 0.275, dz);
                    group.add(ct);
                    // Tower roofs
                    const crGeom = new THREE.ConeGeometry(0.12, 0.2, 6);
                    const crMat = getMaterial('#dc2626');
                    const cr = new THREE.Mesh(crGeom, crMat);
                    cr.position.set(dx, 0.65, dz);
                    group.add(cr);
                }
            }
            break;

        // --- 8 Yujing Local Landmarks ---
        case 'yujing_sugar':
            // Factory hangar
            const hangarGeom = new THREE.BoxGeometry(0.5, 0.25, 0.4);
            const hangarMat = getMaterial('#4b5563');
            const hangar = new THREE.Mesh(hangarGeom, hangarMat);
            hangar.position.set(-0.1, 0.125, 0);
            group.add(hangar);
            // Red-brick tall chimney
            const chimneyGeom = new THREE.CylinderGeometry(0.06, 0.1, 0.8, 8);
            const chimneyMat = getMaterial('#b91c1c');
            const chimney = new THREE.Mesh(chimneyGeom, chimneyMat);
            chimney.position.set(0.18, 0.4, 0.05);
            group.add(chimney);
            // Chimney black rim top
            const rimGeom = new THREE.CylinderGeometry(0.065, 0.065, 0.05, 8);
            const rimMat = getMaterial('#1f2937');
            const rim = new THREE.Mesh(rimGeom, rimMat);
            rim.position.set(0.18, 0.825, 0.05);
            group.add(rim);
            break;

        case 'yujing_school':
            // Main blue and white school block
            const baseSchoolGeom = new THREE.BoxGeometry(0.65, 0.35, 0.35);
            const baseSchoolMat = getMaterial('#ffffff');
            const schoolBase = new THREE.Mesh(baseSchoolGeom, baseSchoolMat);
            schoolBase.position.y = 0.175;
            group.add(schoolBase);
            // Blue accents & windows
            const accentGeom = new THREE.BoxGeometry(0.67, 0.05, 0.05);
            const accentMat = getMaterial('#2563eb');
            const accentLine = new THREE.Mesh(accentGeom, accentMat);
            accentLine.position.set(0, 0.28, 0.16);
            group.add(accentLine);
            // Micro YCVS sign gate
            const gateGeom = new THREE.BoxGeometry(0.2, 0.18, 0.05);
            const gateMat = getMaterial('#e2e8f0');
            const gate = new THREE.Mesh(gateGeom, gateMat);
            gate.position.set(0, 0.09, 0.19);
            group.add(gate);
            break;

        case 'yujing_fruit_market':
            // Structural pillars (4 columns)
            const columnMat = getMaterial('#15803d');
            for (let dx of [-0.25, 0.25]) {
                for (let dz of [-0.2, 0.2]) {
                    const cGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.32, 4);
                    const col = new THREE.Mesh(cGeom, columnMat);
                    col.position.set(dx, 0.16, dz);
                    group.add(col);
                }
            }
            // Green flat sheet warehouse roof
            const marketRoofGeom = new THREE.BoxGeometry(0.6, 0.04, 0.55);
            const marketRoofMat = getMaterial('#16a34a');
            const mRoof = new THREE.Mesh(marketRoofGeom, marketRoofMat);
            mRoof.position.y = 0.34;
            group.add(mRoof);
            // Stack of tiny mango crates below
            for (let i = 0; i < 3; i++) {
                const crateGeom = new THREE.BoxGeometry(0.12, 0.08, 0.12);
                const crateMat = getMaterial('#d97706'); // Wooden crate
                const crate = new THREE.Mesh(crateGeom, crateMat);
                crate.position.set((i - 1) * 0.15, 0.04, 0);
                group.add(crate);
                
                // Yellow dots inside representing mangoes
                const mGeom = new THREE.BoxGeometry(0.04, 0.04, 0.04);
                const mMat = getMaterial('#fbbf24');
                const fruit = new THREE.Mesh(mGeom, mMat);
                fruit.position.set((i - 1) * 0.15, 0.08, 0);
                group.add(fruit);
            }
            break;

        case 'yujing_police':
            // High security blue/white headquarters block
            const polGeom = new THREE.BoxGeometry(0.45, 0.45, 0.45);
            const polMat = getMaterial('#ffffff');
            const polBase = new THREE.Mesh(polGeom, polMat);
            polBase.position.y = 0.225;
            group.add(polBase);
            // Blue shield front stripes
            const polStripGeom = new THREE.BoxGeometry(0.47, 0.12, 0.47);
            const polStripMat = getMaterial('#1e3a8a');
            const stripe = new THREE.Mesh(polStripGeom, polStripMat);
            stripe.position.y = 0.3;
            group.add(stripe);
            // Red-blue tiny sirens on roof
            const redSireGeom = new THREE.SphereGeometry(0.03, 4, 4);
            const redSireMat = getMaterial('#ef4444', true);
            const redSiren = new THREE.Mesh(redSireGeom, redSireMat);
            redSiren.position.set(-0.1, 0.47, 0.1);
            group.add(redSiren);
            const blueSireMat = getMaterial('#3b82f6', true);
            const blueSiren = new THREE.Mesh(redSireGeom, blueSireMat);
            blueSiren.position.set(0.1, 0.47, 0.1);
            group.add(blueSiren);
            break;

        case 'yujing_temple':
            // Red sanctuary base
            const tempBaseGeom = new THREE.BoxGeometry(0.55, 0.28, 0.55);
            const tempBaseMat = getMaterial('#b91c1c');
            const tempBase = new THREE.Mesh(tempBaseGeom, tempBaseMat);
            tempBase.position.y = 0.14;
            group.add(tempBase);
            // Double-tiered golden curved roofs
            for (let i = 0; i < 2; i++) {
                const trGeom = new THREE.ConeGeometry(0.48 - (i * 0.12), 0.16, 4);
                trGeom.rotateY(Math.PI / 4);
                trGeom.scale(1.2, 0.8, 1.2); // stretch to make curved profile
                const trMat = getMaterial('#d97706'); // Gold/orange
                const tRoof = new THREE.Mesh(trGeom, trMat);
                tRoof.position.y = 0.28 + (i * 0.18);
                group.add(tRoof);
            }
            // Tiny incense burner in front
            const burnerGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.08, 6);
            const burnerMat = getMaterial('#fbbf24');
            const burner = new THREE.Mesh(burnerGeom, burnerMat);
            burner.position.set(0, 0.04, 0.32);
            group.add(burner);
            break;

        case 'yujing_roundabout':
            // Circular base pavement
            const circleGeom = new THREE.CylinderGeometry(0.48, 0.48, 0.05, 12);
            const circleMat = getMaterial('#64748b');
            const circle = new THREE.Mesh(circleGeom, circleMat);
            circle.position.y = 0.025;
            group.add(circle);
            // Inner lawn circular island
            const lawnGeom = new THREE.CylinderGeometry(0.38, 0.38, 0.06, 12);
            const lawnMat = getMaterial('#22c55e');
            const lawn = new THREE.Mesh(lawnGeom, lawnMat);
            lawn.position.y = 0.055;
            group.add(lawn);
            // Central fountain column
            const fColGeom = new THREE.CylinderGeometry(0.03, 0.05, 0.2, 6);
            const fColMat = getMaterial('#ffffff');
            const fCol = new THREE.Mesh(fColGeom, fColMat);
            fCol.position.y = 0.18;
            group.add(fCol);
            // Translucent water spray
            const waterGeom = new THREE.SphereGeometry(0.08, 6, 6);
            const waterMat = getMaterial('#93c5fd', true); // Ice/water glow
            const water = new THREE.Mesh(waterGeom, waterMat);
            water.position.y = 0.28;
            group.add(water);
            break;

        case 'yujing_landmark':
            // Landmark stone pedestal
            const pedGeom = new THREE.CylinderGeometry(0.12, 0.15, 0.28, 6);
            const pedMat = getMaterial('#94a3b8');
            const pedestal = new THREE.Mesh(pedGeom, pedMat);
            pedestal.position.y = 0.14;
            group.add(pedestal);
            // Giant red-yellow mango
            const gMangoGeom = new THREE.SphereGeometry(0.18, 12, 12);
            gMangoGeom.scale(1.3, 0.9, 0.9); // mango asymmetric shape
            const gMangoMat = getMaterial('#fbbf24', true); // luminous golden yellow
            const giantMango = new THREE.Mesh(gMangoGeom, gMangoMat);
            giantMango.rotation.set(0.2, 0.1, 0.4);
            giantMango.position.set(0, 0.38, 0);
            group.add(giantMango);
            break;

        case 'yujing_fire_station':
            // Bright red rescue headquarters block
            const fireGeom = new THREE.BoxGeometry(0.5, 0.45, 0.45);
            const fireMat = getMaterial('#b91c1c');
            const fireBase = new THREE.Mesh(fireGeom, fireMat);
            fireBase.position.y = 0.225;
            group.add(fireBase);
            // Grey roll doors representation
            const door1Geom = new THREE.BoxGeometry(0.18, 0.26, 0.02);
            const doorMat = getMaterial('#cbd5e1');
            const door1 = new THREE.Mesh(door1Geom, doorMat);
            door1.position.set(-0.12, 0.13, 0.23);
            group.add(door1);
            const door2 = new THREE.Mesh(door1Geom, doorMat);
            door2.position.set(0.12, 0.13, 0.23);
            group.add(door2);
            // Flashing yellow warning lamp
            const lampGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.06, 6);
            const lampMat = getMaterial('#fbbf24', true);
            const lamp = new THREE.Mesh(lampGeom, lampMat);
            lamp.position.set(0, 0.47, 0.15);
            group.add(lamp);
            break;
    }

    // Apply level label or minor visual scaling
    const scale = 0.9 + (level * 0.1);
    group.scale.set(scale, scale, scale);

    // Enable shadows for all meshes inside the group
    group.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    return group;
}

// Global Three.js Initialization function
function initThreeJS() {
    if (state.three.renderer) return; // Already initialized

    const container = elements.threeCanvasContainer;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 450;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f172a'); // Midnight dark theme matching style.css
    // Subtle star field background (particle system)
    const starGeom = new THREE.BufferGeometry();
    const starCount = 300;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
        starPositions[i] = (Math.random() - 0.5) * 40;
        starPositions[i+1] = Math.random() * 20;
        starPositions[i+2] = (Math.random() - 0.5) * 40;
    }
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: '#ffffff', size: 0.15, sizeAttenuation: true });
    const stars = new THREE.Points(starGeom, starMat);
    scene.add(stars);
    state.three.scene = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 5, 6.5);
    state.three.camera = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Clear spinner
    elements.threeLoading.classList.add('hidden');
    container.appendChild(renderer.domElement);
    state.three.renderer = renderer;

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.bias = -0.002;
    scene.add(dirLight);

    // 5. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.1; // Don't allow camera to go below ground
    controls.minDistance = 3;
    controls.maxDistance = 12;
    controls.target.set(0, 0, 0);
    state.three.controls = controls;

    // 6. 3D Selection Box Outline
    const wireGeom = new THREE.BoxGeometry(1.05, 0.22, 1.05);
    const edges = new THREE.EdgesGeometry(wireGeom);
    const lineMat = new THREE.LineBasicMaterial({ color: '#fbbf24', linewidth: 3 });
    const selectionBox = new THREE.LineSegments(edges, lineMat);
    selectionBox.position.set(0, 0.05, 0);
    scene.add(selectionBox);
    state.three.selectionBox = selectionBox;

    // 7. Raycaster Setup for click handling
    container.addEventListener('click', onCanvasClick);

    // Keyboard focus navigation visual support
    container.addEventListener('focus', () => {
        lineMat.color.set('#f59e0b');
    });
    container.addEventListener('blur', () => {
        lineMat.color.set('#fbbf24');
    });

    // Event listener for keyboard navigation
    container.addEventListener('keydown', onCanvasKeyDown);

    // 8. Animation loop
    let clock = new THREE.Clock();
    function animate() {
        requestAnimationFrame(animate);
        
        // Dynamic rotation of Windmill sails
        scene.traverse(node => {
            if (node.name === "sails") {
                node.rotation.z += 0.02;
            }
            if (node.name.startsWith("monster_group")) {
                // Hover floating animation
                node.position.y = 0.22 + Math.sin(clock.getElapsedTime() * 2.5 + node.userData.x * 2) * 0.06;
                node.rotation.y += 0.01;
            }
        });

        // Blessing heart floating animation
        for (let i = state.three.animatingHearts.length - 1; i >= 0; i--) {
            const heart = state.three.animatingHearts[i];
            heart.position.y += 0.015;
            heart.scale.multiplyScalar(0.97);
            if (heart.scale.x < 0.1) {
                scene.remove(heart);
                state.three.animatingHearts.splice(i, 1);
            }
        }

        // Damping and Lerping look targets
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    // RWD resizing canvas using ResizeObserver
    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0) {
                if (state.three.renderer && state.three.camera) {
                    state.three.camera.aspect = width / height;
                    state.three.camera.updateProjectionMatrix();
                    state.three.renderer.setSize(width, height);
                }
            }
        }
    });
    resizeObserver.observe(container);
}

// Smoothly move 3D selection box
function moveSelectionBox(x, y) {
    const xPos = (x - 2.5) * 1.1;
    const zPos = (y - 2.5) * 1.1;
    
    // Animate position smoothly (or jump immediately for quick feedback)
    state.three.selectionBox.position.set(xPos, 0.05, zPos);
    
    // Gently focus controls target to look at the cell
    state.three.controls.target.set(xPos * 0.6, 0, zPos * 0.6);
}

// Raycast Click Selection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onCanvasClick(event) {
    const container = elements.threeCanvasContainer;
    const rect = container.getBoundingClientRect();
    
    // Normalize coordinates
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, state.three.camera);
    const intersects = raycaster.intersectObjects(state.three.tiles);

    if (intersects.length > 0) {
        const hitTile = intersects[0].object;
        if (hitTile.userData && typeof hitTile.userData.x === 'number') {
            const { x, y } = hitTile.userData;
            const lands = getActiveLandsList();
            const land = lands.find(l => l.x === x && l.y === y);
            if (land) {
                state.three.selectedCoords = { x, y };
                moveSelectionBox(x, y);
                updateActiveCellInfo();
                if (elements.a11yTts.value === 'on') {
                    readSceneStatusAloud();
                }
            }
        }
    }
}

// Keyboard Navigation Keydown handler
function onCanvasKeyDown(event) {
    const key = event.key;
    let dx = 0;
    let dy = 0;

    if (key === 'ArrowUp' || key === 'w' || key === 'W') dx = -1;
    else if (key === 'ArrowDown' || key === 's' || key === 'S') dx = 1;
    else if (key === 'ArrowLeft' || key === 'a' || key === 'A') dy = -1;
    else if (key === 'ArrowRight' || key === 'd' || key === 'D') dy = 1;
    else if (key === 'Enter' || key === ' ') {
        // Trigger default primary button of the selected cell
        event.preventDefault();
        const primaryBtn = elements.cellActionButtons.querySelector('.btn-primary, .btn-gold');
        if (primaryBtn && !primaryBtn.disabled) {
            primaryBtn.click();
        }
        return;
    } else if (key === 'Escape') {
        event.preventDefault();
        toggleTerritoryModal();
        return;
    } else {
        return; // Let other keys proceed
    }

    event.preventDefault(); // Prevent scroll on arrow keys
    
    const nextX = Math.max(0, Math.min(5, state.three.selectedCoords.x + dx));
    const nextY = Math.max(0, Math.min(5, state.three.selectedCoords.y + dy));
    
    // Check if tile is defined in active lands
    const lands = getActiveLandsList();
    const targetLand = lands.find(l => l.x === nextX && l.y === nextY);
    if (targetLand) {
        state.three.selectedCoords = { x: nextX, y: nextY };
        moveSelectionBox(nextX, nextY);
        updateActiveCellInfo();
        
        // Auto announce keyboard movement via speech if turned on
        if (elements.a11yTts.value === 'on') {
            readSceneStatusAloud();
        }
    }
}

// Retrieve active lands array based on visiting/owner state
function getActiveLandsList() {
    if (state.three.isVisiting && state.three.visitedProfile) {
        return (state.three.visitedProfile.territory && state.three.visitedProfile.territory.lands) || [];
    }
    return (state.userProfile.territory && state.userProfile.territory.lands) || [];
}

// Main 3D Territory Grid Generator
function renderTerritoryMap() {
    initThreeJS(); // Make sure Three is initialized

    const scene = state.three.scene;
    const lands = getActiveLandsList();

    // 1. Clear previous dynamic meshes (excluding selectionBox and background stars)
    const objectsToRemove = [];
    scene.traverse(node => {
        if (node !== scene && node !== state.three.selectionBox && node !== scene.children[0] && !node.isLight) {
            // Only remove children added dynamically (we check parents)
            if (node.parent === scene) {
                objectsToRemove.push(node);
            }
        }
    });
    objectsToRemove.forEach(obj => scene.remove(obj));

    state.three.tiles = [];
    state.three.buildings = {};

    // 2. Build Layered Mudstone floating island base structure
    const baseGroup = new THREE.Group();
    // Stepped layers for badlands mudstone look
    const layerColors = ['#5a4d41', '#4a3f35', '#3d332a'];
    for (let l = 0; l < 3; l++) {
        const size = 6.4 - (l * 0.4);
        const thick = 0.5 - (l * 0.1);
        const lGeom = new THREE.BoxGeometry(size, thick, size);
        const lMat = getMaterial(layerColors[l]);
        const layer = new THREE.Mesh(lGeom, lMat);
        layer.position.y = -thick/2 - (l * 0.3) - 0.08;
        layer.receiveShadow = true;
        baseGroup.add(layer);
    }
    scene.add(baseGroup);

    // 3. Render 36 individual tiles
    lands.forEach(land => {
        const xPos = (land.x - 2.5) * 1.1;
        const zPos = (land.y - 2.5) * 1.1;

        // Ground Mesh
        const groundGeom = new THREE.BoxGeometry(0.95, 0.15, 0.95);
        let color = '#388e3c'; // Green grass
        if (land.type === 'locked') {
            color = '#1e293b'; // Slate grey for locked
        } else if (land.isMonster) {
            color = '#7f1d1d'; // Crimson dark red for wild monster
        }
        
        const groundMat = getMaterial(color);
        const tile = new THREE.Mesh(groundGeom, groundMat);
        tile.position.set(xPos, -0.05, zPos);
        tile.userData = { x: land.x, y: land.y };
        tile.receiveShadow = true;
        scene.add(tile);
        state.three.tiles.push(tile); // Add to hit-test pool

        // If locked, render small grey borders
        if (land.type === 'locked') {
            const wireGeom = new THREE.BoxGeometry(0.98, 0.18, 0.98);
            const edges = new THREE.EdgesGeometry(wireGeom);
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: '#475569', opacity: 0.4 }));
            line.position.set(xPos, -0.05, zPos);
            scene.add(line);
        }

        // Render Building structure
        if (land.type !== 'empty' && land.type !== 'locked') {
            const bModel = createProceduralModel(land.type, land.level);
            bModel.position.set(xPos, 0.02, zPos);
            scene.add(bModel);
            state.three.buildings[land.x + "_" + land.y] = bModel;
        }

        // Render Wild Monster mesh
        if (land.isMonster && land.monsterHp > 0) {
            const mGroup = new THREE.Group();
            mGroup.name = `monster_group_${land.x}_${land.y}`;
            mGroup.userData = { x: land.x, y: land.y };

            // Draw low-poly slime / threat monster shape
            const mBodyGeom = new THREE.SphereGeometry(0.18, 6, 6);
            const mBodyMat = getMaterial('#ef4444', true);
            const mBody = new THREE.Mesh(mBodyGeom, mBodyMat);
            mBody.scale.set(1, 0.8, 1);
            mGroup.add(mBody);

            // Red glowing eyes
            for (let eyeX of [-0.06, 0.06]) {
                const eyeGeom = new THREE.BoxGeometry(0.04, 0.04, 0.04);
                const eyeMat = getMaterial('#ffff00', true);
                const eye = new THREE.Mesh(eyeGeom, eyeMat);
                eye.position.set(eyeX, 0.04, 0.15);
                mGroup.add(eye);
            }

            mGroup.position.set(xPos, 0.22, zPos);
            scene.add(mGroup);
        }
    });

    // 4. Update coordinates view and side panel
    moveSelectionBox(state.three.selectedCoords.x, state.three.selectedCoords.y);
    updateActiveCellInfo();
    renderBuildShop();
}

// Side Control Panel: Cell Details Render
function isTileAdjacentToOwned(x, y) {
    const lands = getActiveLandsList();
    const dirs = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 }
    ];
    for (const dir of dirs) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        if (nx >= 0 && nx < 6 && ny >= 0 && ny < 6) {
            const adjLand = lands.find(l => l.x === nx && l.y === ny);
            if (adjLand && adjLand.type !== 'locked' && !adjLand.isMonster) {
                return true;
            }
        }
    }
    return false;
}

function updateActiveCellInfo() {
    const { x, y } = state.three.selectedCoords;
    elements.selectedCoords.textContent = `座標：(${x + 1}, ${y + 1})`;
    
    const lands = getActiveLandsList();
    const land = lands.find(l => l.x === x && l.y === y);

    if (!land) {
        elements.selectedStatus.textContent = '未知';
        elements.selectedDesc.textContent = '無法獲取該地塊的資料。';
        elements.cellActionButtons.innerHTML = '';
        elements.landmarkPhotoContainer.classList.add('hidden');
        return;
    }

    let status = '空地';
    let desc = '一片空曠的綠意草地，您可以在此建造各種玉井生產地標。';
    let photo = null;

    if (land.type === 'locked') {
        status = '未解鎖';
        const indexInLands = y * 6 + x;
        // Unlocking requirements: scale with grid coordinates distance
        const threshold = 50 + (x + y) * 35;
        desc = `尚未開發的未知土地。解鎖此地塊需要累積答對至少 ${threshold} 題。`;
        elements.selectedStatus.textContent = status;
        elements.selectedStatus.style.background = 'rgba(239, 68, 68, 0.15)';
        elements.selectedStatus.style.color = '#f87171';
        elements.selectedDesc.textContent = desc;
        elements.landmarkPhotoContainer.classList.add('hidden');

        // Action button for unlocking
        if (state.three.isVisiting) {
            elements.cellActionButtons.innerHTML = '<p class="cell-desc" style="color: var(--text-dim); text-align: center;">唯讀參觀模式中</p>';
        } else {
            const currentCorrect = state.userProfile.totalQuestions || 0;
            const canUnlock = currentCorrect >= threshold;
            elements.cellActionButtons.innerHTML = `
                <button class="btn btn-primary" ${canUnlock ? '' : 'disabled'} onclick="unlockGridCell(${x}, ${y}, ${threshold})">
                    <i class="fas fa-key"></i> 解鎖地塊 (需要 ${threshold} 題，當前 ${currentCorrect} 題)
                </button>
            `;
        }
        return;
    }

    if (land.isMonster) {
        status = '野怪領地';
        desc = `警告！此地塊被野怪「${land.monsterName || '芒果小偷'}」佔領了！\n野怪血量：${land.monsterHp} / ${land.maxMonsterHp}。\n您可以挑戰攻打它，答對題目扣除其生命，擊敗可將其收復為空地並獲得高額芒果種子與芒果幣獎勵！`;
        elements.selectedStatus.textContent = status;
        elements.selectedStatus.style.background = 'rgba(239, 68, 68, 0.2)';
        elements.selectedStatus.style.color = '#ef4444';
        elements.selectedDesc.textContent = desc;
        elements.landmarkPhotoContainer.classList.add('hidden');

        if (state.three.isVisiting) {
            elements.cellActionButtons.innerHTML = '<p class="cell-desc" style="color: var(--text-dim); text-align: center;">唯讀參觀模式中</p>';
        } else {
            const isAdjacent = isTileAdjacentToOwned(x, y);
            elements.cellActionButtons.innerHTML = `
                <button class="btn btn-outline" style="border-color: #ef4444; color: #ef4444; font-weight: bold;" 
                        ${isAdjacent ? '' : 'disabled'} 
                        onclick="triggerMonsterBattle(${x}, ${y})">
                    <i class="fas fa-swords"></i> 攻打挑戰野怪
                </button>
                ${isAdjacent ? '' : '<p style="color: #f87171; font-size: 0.75rem; text-align: center; margin-top: 0.5rem; width: 100%;">領地未接壤，無法攻打</p>'}
            `;
        }
        return;
    }

    if (land.type !== 'empty') {
        const bConfig = BUILDING_TYPES[land.type];
        if (bConfig) {
            status = `${bConfig.name} (等級 ${land.level})`;
            desc = bConfig.desc;
            photo = bConfig.photo;
        }
    }

    elements.selectedStatus.textContent = status;
    elements.selectedStatus.style.background = 'rgba(16, 185, 129, 0.15)';
    elements.selectedStatus.style.color = '#34d399';
    elements.selectedDesc.textContent = desc;

    // Load actual local pictures if defined
    if (photo) {
        elements.landmarkPhotoImg.src = photo;
        elements.landmarkPhotoImg.alt = `實景照片：${status}`;
        elements.landmarkPhotoContainer.classList.remove('hidden');
    } else {
        elements.landmarkPhotoContainer.classList.add('hidden');
    }

    // Dynamic actions buttons based on building state
    if (state.three.isVisiting) {
        // Visitor interactions
        elements.cellActionButtons.innerHTML = `
            <button class="btn btn-gold" onclick="sendBlessingToHost()">
                <i class="fas fa-heart"></i> 給予祝福 (+50 芒果幣)
            </button>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.5rem;">
                <button class="btn btn-outline btn-small" onclick="sendGiftToHost('egg')" title="贈送雞蛋"><i class="fas fa-egg"></i> 送蛋</button>
                <button class="btn btn-outline btn-small" onclick="sendGiftToHost('milk')" title="贈送牛奶"><i class="fas fa-prescription-bottle-medical"></i> 送奶</button>
            </div>
        `;
    } else {
        if (land.type === 'empty') {
            elements.cellActionButtons.innerHTML = '<p style="font-size: 0.75rem; text-align: center; color: var(--text-dim);">請在下方的建築工坊中點選想要建造的地標。</p>';
        } else {
            // Upgrade and harvest
            const lastHarvest = land.lastHarvest || 0;
            const elapsed = Date.now() - lastHarvest;
            const Q = Math.floor(elapsed / TERRITORY_CONFIG.productionTime);
            const canHarvest = Q > 0;
            const progressPct = Math.min(100, (elapsed / TERRITORY_CONFIG.productionTime) * 100);
            
            // Upgrade costs
            const upgradeCost = land.level * 200;
            const canUpgrade = (state.userProfile.gold || 0) >= upgradeCost;

            let harvestText = '';
            if (land.type === 'mango_orchard') harvestText = `收成芒果 (可收成: ${Q} 個)`;
            else if (land.type === 'windmill') harvestText = `收集牛奶 (可收成: ${Q} 瓶)`;
            else if (land.type === 'farm') harvestText = `收集雞蛋 (可收成: ${Q} 顆)`;
            else if (land.type === 'goldmine' || land.type === 'yujing_sugar') harvestText = `開採芒果幣 (可收成: ${Q * 50} 芒果幣)`;
            else harvestText = '收取資源';

            elements.cellActionButtons.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.75rem; color: var(--text-dim);">
                        <span>生產進度：${Math.floor(progressPct)}%</span>
                        <span>剩餘時間：${Math.max(0, Math.ceil((TERRITORY_CONFIG.productionTime - (elapsed % TERRITORY_CONFIG.productionTime)) / 60000))} 分鐘</span>
                    </div>
                    <div class="farm-progress-container" style="width: 100%; margin: 0; background: rgba(0,0,0,0.5);">
                        <div class="farm-progress-fill" style="width: ${progressPct}%"></div>
                    </div>
                    
                    <button class="btn btn-gold" ${canHarvest ? '' : 'disabled'} onclick="harvestGridCell(${x}, ${y})">
                        <i class="fas fa-basket-shopping"></i> ${harvestText}
                    </button>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.25rem;">
                        <button class="btn btn-outline btn-small" ${canUpgrade ? '' : 'disabled'} onclick="upgradeGridCell(${x}, ${y}, ${upgradeCost})">
                            <i class="fas fa-circle-arrow-up"></i> 升級 (需要 ${upgradeCost} 芒果幣)
                        </button>
                        <button class="btn btn-outline btn-small" style="color: var(--danger); border-color: rgba(239, 68, 68, 0.3);" onclick="demolishGridCell(${x}, ${y})">
                            <i class="fas fa-trash-can"></i> 拆除
                        </button>
                    </div>
                </div>
            `;
        }
    }
}

// Side Control Panel: Build Shop Rendering
function renderBuildShop() {
    elements.buildOptionsList.innerHTML = '';
    
    if (state.three.isVisiting) {
        elements.buildOptionsList.innerHTML = '<p style="grid-column: span 2; text-align: center; color: var(--text-dim); font-size: 0.75rem; padding: 1rem 0;">參觀模式下無法建造</p>';
        return;
    }

    const { x, y } = state.three.selectedCoords;
    const lands = getActiveLandsList();
    const land = lands.find(l => l.x === x && l.y === y);

    if (!land || land.type !== 'empty') {
        elements.buildOptionsList.innerHTML = '<p style="grid-column: span 2; text-align: center; color: var(--text-dim); font-size: 0.75rem; padding: 1rem 0;">目前選取位置非空地，無法建造</p>';
        return;
    }

    // Verify if castle built to unlock Yujing landmarks
    const hasCastle = lands.some(l => l.type === 'castle');

    Object.entries(BUILDING_TYPES).forEach(([key, b]) => {
        const gold = state.userProfile.gold || 0;
        const inv = state.userProfile.inventory || {};
        const canAfford = gold >= b.cost;
        let seedCheckPass = true;
        let seedMsg = '';

        if (key === 'orchard_native') {
            const hasSeeds = (inv.seed_native || 0) + (inv.mango_seeds || 0);
            if (hasSeeds < 5) {
                seedCheckPass = false;
                seedMsg = '(需5顆土/通用種子)';
            }
        } else if (key === 'orchard_irwin') {
            const hasSeeds = inv.seed_irwin || 0;
            if (hasSeeds < 5) {
                seedCheckPass = false;
                seedMsg = '(需5顆愛文種子)';
            }
        } else if (key === 'orchard_jinhuang') {
            const hasSeeds = inv.seed_jinhuang || 0;
            if (hasSeeds < 5) {
                seedCheckPass = false;
                seedMsg = '(需5顆金煌種子)';
            }
        } else if (key === 'orchard_yuwen') {
            const hasSeeds = inv.seed_yuwen || 0;
            if (hasSeeds < 5) {
                seedCheckPass = false;
                seedMsg = '(需5顆玉文種子)';
            }
        }
        
        // Hide Yujing Landmarks unless Castle is built (lock validation)
        const isYujingLandmark = key.startsWith('yujing_');
        const lockedByCastle = isYujingLandmark && !hasCastle;

        const btn = document.createElement('button');
        btn.className = 'build-btn';
        btn.disabled = !canAfford || lockedByCastle || !seedCheckPass;
        btn.innerHTML = `
            <span style="font-size: 1.25rem; margin-bottom: 2px;"><i class="fas ${b.icon}"></i></span>
            <strong style="font-size: 0.75rem;">${b.name}</strong>
            <span class="btn-cost">${b.cost} 芒果幣</span>
            ${lockedByCastle ? '<span style="font-size: 0.55rem; color: #f87171; margin-top: 2px;">(需要城堡)</span>' : ''}
            ${seedMsg ? `<span style="font-size: 0.55rem; color: #f87171; margin-top: 2px;">${seedMsg}</span>` : ''}
        `;
        btn.onclick = () => buildStructure(key, b.cost);
        elements.buildOptionsList.appendChild(btn);
    });
}

// Action: Build Structure on Tile
async function buildStructure(type, cost) {
    if (!state.currentUser || !state.userProfile) return;
    const { x, y } = state.three.selectedCoords;
    const gold = state.userProfile.gold || 0;
    const inv = state.userProfile.inventory || {};

    if (gold < cost) {
        showToast('芒果幣不足，無法建造！', 'error');
        return;
    }

    let invUpdate = { ...inv };
    if (type === 'orchard_native') {
        const nativeSeeds = inv.seed_native || 0;
        const commonSeeds = inv.mango_seeds || 0;
        if (nativeSeeds + commonSeeds < 5) {
            showToast('種子不足，無法建造！', 'error');
            return;
        }
        if (nativeSeeds >= 5) {
            invUpdate.seed_native = nativeSeeds - 5;
        } else {
            invUpdate.seed_native = 0;
            invUpdate.mango_seeds = commonSeeds - (5 - nativeSeeds);
        }
    } else if (type === 'orchard_irwin') {
        const seeds = inv.seed_irwin || 0;
        if (seeds < 5) {
            showToast('愛文芒果種子不足，無法建造！', 'error');
            return;
        }
        invUpdate.seed_irwin = seeds - 5;
    } else if (type === 'orchard_jinhuang') {
        const seeds = inv.seed_jinhuang || 0;
        if (seeds < 5) {
            showToast('金煌芒果種子不足，無法建造！', 'error');
            return;
        }
        invUpdate.seed_jinhuang = seeds - 5;
    } else if (type === 'orchard_yuwen') {
        const seeds = inv.seed_yuwen || 0;
        if (seeds < 5) {
            showToast('玉文芒果種子不足，無法建造！', 'error');
            return;
        }
        invUpdate.seed_yuwen = seeds - 5;
    }

    showLoadingOverlay(true);
    try {
        const lands = [...state.userProfile.territory.lands];
        const idx = lands.findIndex(l => l.x === x && l.y === y);
        if (idx !== -1 && lands[idx].type === 'empty') {
            lands[idx].type = type;
            lands[idx].level = 1;
            lands[idx].lastHarvest = Date.now();

            const newGold = gold - cost;
            await updateUserProfile(state.currentUser.uid, {
                "territory.lands": lands,
                gold: newGold,
                inventory: invUpdate
            });

            state.userProfile.territory.lands = lands;
            state.userProfile.gold = newGold;
            state.userProfile.inventory = invUpdate;

            showToast(`建造 ${BUILDING_TYPES[type].name} 成功！`, 'success');
            updateTerritoryAssets();
            renderTerritoryMap();
        }
    } catch (e) {
        console.error(e);
        showToast('建造失敗。', 'error');
    } finally {
        showLoadingOverlay(false);
    }
}

// Action: Upgrade Structure
async function upgradeGridCell(x, y, cost) {
    if (!state.currentUser || !state.userProfile) return;
    const gold = state.userProfile.gold || 0;

    if (gold < cost) {
        showToast('芒果幣不足，無法升級！', 'error');
        return;
    }

    showLoadingOverlay(true);
    try {
        const lands = [...state.userProfile.territory.lands];
        const idx = lands.findIndex(l => l.x === x && l.y === y);
        if (idx !== -1 && lands[idx].type !== 'empty') {
            lands[idx].level += 1;
            lands[idx].lastHarvest = Date.now(); // Reset production timer on upgrade

            const newGold = gold - cost;
            await updateUserProfile(state.currentUser.uid, {
                "territory.lands": lands,
                gold: newGold
            });

            state.userProfile.territory.lands = lands;
            state.userProfile.gold = newGold;

            showToast('升級成功！生產效率提升。', 'success');
            renderTerritoryMap();
        }
    } catch (e) {
        console.error(e);
        showToast('升級失敗。', 'error');
    } finally {
        showLoadingOverlay(false);
    }
}

// Action: Demolish Structure
async function demolishGridCell(x, y) {
    if (!state.currentUser || !state.userProfile) return;
    const lands = state.userProfile.territory.lands;
    const idx = lands.findIndex(l => l.x === x && l.y === y);
    if (idx === -1 || lands[idx].type === 'empty') return;

    const bName = BUILDING_TYPES[lands[idx].type]?.name || '建築';
    if (!confirm(`確定要拆除 ${bName} 嗎？拆除將退還 50% 的建造芒果幣。`)) return;

    showLoadingOverlay(true);
    try {
        const returnGold = Math.floor((BUILDING_TYPES[lands[idx].type]?.cost || 0) * 0.5);
        lands[idx].type = 'empty';
        lands[idx].level = 0;
        lands[idx].lastHarvest = Date.now();

        const newGold = (state.userProfile.gold || 0) + returnGold;
        await updateUserProfile(state.currentUser.uid, {
            "territory.lands": lands,
            gold: newGold
        });

        state.userProfile.territory.lands = lands;
        state.userProfile.gold = newGold;

        showToast('拆除成功。', 'info');
        renderTerritoryMap();
    } catch (e) {
        console.error(e);
        showToast('拆除失敗。', 'error');
    } finally {
        showLoadingOverlay(false);
    }
}

// Action: Unlock New Coordinate Tile
async function unlockGridCell(x, y, threshold) {
    if (!state.currentUser || !state.userProfile) return;
    const currentCorrect = state.userProfile.totalQuestions || 0;
    if (currentCorrect < threshold) return;

    if (!confirm(`確認要解鎖座標 (${x + 1}, ${y + 1}) 的地塊嗎？`)) return;

    showLoadingOverlay(true);
    try {
        const lands = [...state.userProfile.territory.lands];
        const idx = lands.findIndex(l => l.x === x && l.y === y);
        if (idx !== -1 && lands[idx].type === 'locked') {
            lands[idx].type = 'empty';
            lands[idx].level = 0;
            lands[idx].lastHarvest = Date.now();

            await updateUserProfile(state.currentUser.uid, {
                "territory.lands": lands
            });

            state.userProfile.territory.lands = lands;
            showToast('地塊解鎖成功！', 'success');
            renderTerritoryMap();
        }
    } catch (e) {
        console.error(e);
        showToast('解鎖失敗，請稍後重試。', 'error');
    } finally {
        showLoadingOverlay(false);
    }
}

// Action: Harvest Resources from Structure
async function harvestGridCell(x, y) {
    if (!state.currentUser || !state.userProfile) return;
    const lands = state.userProfile.territory.lands;
    const idx = lands.findIndex(l => l.x === x && l.y === y);
    if (idx === -1) return;

    const land = lands[idx];
    const elapsed = Date.now() - (land.lastHarvest || 0);
    const Q = Math.floor(elapsed / TERRITORY_CONFIG.productionTime);

    if (Q <= 0) return;

    showLoadingOverlay(true);
    try {
        let invUpdate = { ...(state.userProfile.inventory || {}) };
        let goldUpdate = state.userProfile.gold || 0;
        let msg = '';

        if (land.type === 'mango_orchard' || land.type === 'orchard_native' || land.type === 'orchard_irwin' || land.type === 'orchard_jinhuang' || land.type === 'orchard_yuwen') {
            const mangoAmount = Q * land.level;
            const seedAmount = Q;
            
            const harvestMap = {
                native: { mango: 0, seed: 0 },
                irwin: { mango: 0, seed: 0 },
                jinhuang: { mango: 0, seed: 0 },
                yuwen: { mango: 0, seed: 0 }
            };

            if (land.type === 'mango_orchard') {
                for (let i = 0; i < mangoAmount; i++) {
                    const r = Math.random();
                    if (r < 0.4) harvestMap.native.mango++;
                    else if (r < 0.7) harvestMap.irwin.mango++;
                    else if (r < 0.9) harvestMap.jinhuang.mango++;
                    else harvestMap.yuwen.mango++;
                }
                for (let i = 0; i < seedAmount; i++) {
                    const r = Math.random();
                    if (r < 0.4) harvestMap.native.seed++;
                    else if (r < 0.7) harvestMap.irwin.seed++;
                    else if (r < 0.9) harvestMap.jinhuang.seed++;
                    else harvestMap.yuwen.seed++;
                }
            } else if (land.type === 'orchard_native') {
                harvestMap.native.mango = mangoAmount;
                harvestMap.native.seed = seedAmount;
            } else if (land.type === 'orchard_irwin') {
                harvestMap.irwin.mango = mangoAmount;
                harvestMap.irwin.seed = seedAmount;
            } else if (land.type === 'orchard_jinhuang') {
                harvestMap.jinhuang.mango = mangoAmount;
                harvestMap.jinhuang.seed = seedAmount;
            } else if (land.type === 'orchard_yuwen') {
                harvestMap.yuwen.mango = mangoAmount;
                harvestMap.yuwen.seed = seedAmount;
            }

            invUpdate.mango_native = (invUpdate.mango_native || 0) + harvestMap.native.mango;
            invUpdate.seed_native = (invUpdate.seed_native || 0) + harvestMap.native.seed;
            invUpdate.mango_irwin = (invUpdate.mango_irwin || 0) + harvestMap.irwin.mango;
            invUpdate.seed_irwin = (invUpdate.seed_irwin || 0) + harvestMap.irwin.seed;
            invUpdate.mango_jinhuang = (invUpdate.mango_jinhuang || 0) + harvestMap.jinhuang.mango;
            invUpdate.seed_jinhuang = (invUpdate.seed_jinhuang || 0) + harvestMap.jinhuang.seed;
            invUpdate.mango_yuwen = (invUpdate.mango_yuwen || 0) + harvestMap.yuwen.mango;
            invUpdate.seed_yuwen = (invUpdate.seed_yuwen || 0) + harvestMap.yuwen.seed;

            const parts = [];
            if (harvestMap.native.mango > 0 || harvestMap.native.seed > 0) {
                parts.push(`土芒果: ${harvestMap.native.mango}果/${harvestMap.native.seed}種子`);
            }
            if (harvestMap.irwin.mango > 0 || harvestMap.irwin.seed > 0) {
                parts.push(`愛文: ${harvestMap.irwin.mango}果/${harvestMap.irwin.seed}種子`);
            }
            if (harvestMap.jinhuang.mango > 0 || harvestMap.jinhuang.seed > 0) {
                parts.push(`金煌: ${harvestMap.jinhuang.mango}果/${harvestMap.jinhuang.seed}種子`);
            }
            if (harvestMap.yuwen.mango > 0 || harvestMap.yuwen.seed > 0) {
                parts.push(`玉文: ${harvestMap.yuwen.mango}果/${harvestMap.yuwen.seed}種子`);
            }
            msg = `成功收成！獲得：${parts.join(', ')}`;
        } else if (land.type === 'farm') {
            invUpdate.egg = (invUpdate.egg || 0) + (Q * land.level);
            msg = `成功收集 ${Q * land.level} 顆雞蛋！`;
        } else if (land.type === 'windmill') {
            invUpdate.milk = (invUpdate.milk || 0) + (Q * land.level);
            msg = `成功收集 ${Q * land.level} 瓶新鮮牛奶！`;
        } else if (land.type === 'goldmine' || land.type === 'yujing_sugar') {
            const goldGained = Q * 50 * land.level;
            goldUpdate += goldGained;
            msg = `成功開採 ${goldGained} 芒果幣！`;
        }

        // Reset harvest timer
        lands[idx].lastHarvest = Date.now() - (elapsed % TERRITORY_CONFIG.productionTime);

        await updateUserProfile(state.currentUser.uid, {
            "territory.lands": lands,
            inventory: invUpdate,
            gold: goldUpdate
        });

        state.userProfile.territory.lands = lands;
        state.userProfile.inventory = invUpdate;
        state.userProfile.gold = goldUpdate;

        showToast(msg, 'success');
        updateTerritoryAssets();
        renderTerritoryMap();
    } catch (e) {
        console.error(e);
        showToast('收集物資失敗。', 'error');
    } finally {
        showLoadingOverlay(false);
    }
}

// Action: Attack Wild Monster on Tile
function triggerMonsterBattle(x, y) {
    const lands = state.userProfile.territory.lands;
    const land = lands.find(l => l.x === x && l.y === y);
    if (!land || !land.isMonster) return;

    if (!isTileAdjacentToOwned(x, y)) {
        alert('領地未接壤，無法攻打該野怪！請先解鎖與其相鄰的土地。');
        return;
    }

    // Check if questions are loaded
    if (!state.allQuestions || state.allQuestions.length === 0) {
        alert('請先在主畫面選擇一個學科題庫，才能與野怪進行答題對戰！');
        return;
    }

    if (!confirm(`確定要進入戰鬥挑戰野怪「${land.monsterName}」嗎？\n挑戰需要回答 5 題檢定題，答對對野怪造成傷害，答錯野怪會進行反擊！`)) return;

    // Close territory modal
    toggleTerritoryModal();

    // Prep tile-monster as the currentMonster for battle
    state.currentMonster = {
        name: land.monsterName,
        hp: land.monsterHp,
        maxHp: land.maxMonsterHp || land.monsterHp,
        tileCoords: { x, y },
        icon: 'fa-dragon',
        color: '#ef4444'
    };
    state.heroHp = 100;

    // Pick 5 random questions from the loaded pool
    let pool = [...state.allQuestions];
    pool.sort(() => Math.random() - 0.5);
    state.filteredQuestions = pool.slice(0, 5);

    state.currentQuestionIndex = 0;
    state.score = 0;
    state.wrongQuestions = [];
    state.practicedQuestionIds = [];
    state.startTime = Date.now();
    state.isRetryMode = false;
    state.goldPerQuestion = 10; // 5 questions x 10 = 50 gold base

    // Update Monster UI
    elements.monsterNameLabel.innerHTML = `<i class="fas ${state.currentMonster.icon}"></i> ${state.currentMonster.name}`;
    elements.dragonSprite.innerHTML = `<i class="fas ${state.currentMonster.icon}"></i>`;
    elements.dragonSprite.style.color = state.currentMonster.color;
    elements.dragonSprite.style.filter = `drop-shadow(0 0 15px ${state.currentMonster.color}80)`;
    elements.dragonHp.style.width = '100%';
    elements.dragonHpText.textContent = '100%';

    // Update Hero UI
    elements.heroHpBar.style.width = '100%';
    elements.heroHpText.textContent = '100%';

    // Transition to quiz screen
    elements.setupScreen.classList.add('hidden');
    elements.quizScreen.classList.remove('hidden');

    updateTimer();
    state.timerInterval = setInterval(updateTimer, 1000);
    showQuestion();
}

// Process Battle result for Wild Monsters inside quiz completion
async function processMonsterBattleDefeated() {
    if (!state.currentMonster) return;
    const { x, y } = state.currentMonster.tileCoords;
    const lands = [...state.userProfile.territory.lands];
    const idx = lands.findIndex(l => l.x === x && l.y === y);

    if (idx !== -1) {
        showLoadingOverlay(true);
        try {
            // Liberate land tile
            lands[idx].type = 'empty';
            lands[idx].level = 0;
            lands[idx].isMonster = false;
            lands[idx].monsterHp = 0;
            lands[idx].lastHarvest = Date.now();

            // Awards
            const goldAward = 500;
            const seedAward = 3;
            const newGold = (state.userProfile.gold || 0) + goldAward;
            const inv = { ...(state.userProfile.inventory || {}) };
            inv.mango_seeds = (inv.mango_seeds || 0) + seedAward;

            await updateUserProfile(state.currentUser.uid, {
                "territory.lands": lands,
                gold: newGold,
                inventory: inv
            });

            state.userProfile.territory.lands = lands;
            state.userProfile.gold = newGold;
            state.userProfile.inventory = inv;

            alert(`戰鬥勝利！您成功收復了地塊，野怪逃跑了！\n獲得獎勵：${goldAward} 芒果幣與 ${seedAward} 顆芒果種子！`);
            updateTerritoryAssets();
        } catch (e) {
            console.error("Failed to process monster defeat", e);
        } finally {
            showLoadingOverlay(false);
            state.currentMonster = null;
        }
    }
}

// Web Speech API Announcement
window.readSceneStatusAloud = () => {
    if (!('speechSynthesis' in window)) {
        alert("您的瀏覽器不支援語音朗讀功能");
        return;
    }
    const { x, y } = state.three.selectedCoords;
    const lands = getActiveLandsList();
    const land = lands.find(l => l.x === x && l.y === y);

    if (!land) return;

    let text = `座標： ${x + 1} 之 ${y + 1}。`;
    if (land.type === 'locked') {
        const threshold = 50 + (x + y) * 35;
        text += `未開發地塊。需要累積答對至少 ${threshold} 題才能解鎖。`;
    } else if (land.isMonster) {
        text += `野怪領地，被野怪 ${land.monsterName} 佔領。剩餘血量 ${land.monsterHp}。`;
    } else if (land.type === 'empty') {
        text += `空曠草地。您可以在此建造芒果園、住宅或其它地標。`;
    } else {
        const b = BUILDING_TYPES[land.type];
        text += `等級 ${land.level} 的 ${b ? b.name : '地標'}。${b ? b.desc : ''}`;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-TW';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
};

// --- Social visiting and blessings ---

window.visitPlayerKingdom = async (uid) => {
    // Hide profile and other modals
    elements.leaderboardModal.classList.add('hidden');
    elements.profileModal.classList.add('hidden');
    
    showLoadingOverlay(true);
    try {
        const profile = await getUserProfile(uid, '');
        if (profile) {
            state.three.isVisiting = true;
            state.three.visitedProfile = profile;
            
            // Adjust modal headings
            document.getElementById('territory-map-title').innerHTML = `<i class="fas fa-crown"></i> 參觀：${profile.nickname} 的國度`;
            document.getElementById('territory-map-subtitle').textContent = `正在欣賞該勇者的領土，給予祝福可增加對方的人氣與芒果幣！`;
            
            elements.territoryModal.classList.remove('hidden');
            switchTerritoryTab('map');
            updateTerritoryAssets();
        }
    } catch (e) {
        console.error(e);
        showToast('載入該玩家國度失敗。', 'error');
    } finally {
        showLoadingOverlay(false);
    }
};

window.sendBlessingToHost = async () => {
    if (!state.three.isVisiting || !state.three.visitedProfile || !state.currentUser) return;
    const hostUid = state.three.visitedProfile.uid;
    const gold = state.userProfile.gold || 0;

    if (gold < 10) {
        showToast('您的芒果幣不足 10 芒果幣，無法送出祝福！', 'error');
        return;
    }

    showLoadingOverlay(true);
    try {
        // Visitor: -10 gold
        // Host: +50 gold
        await updateUserProfile(state.currentUser.uid, { gold: gold - 10 });
        state.userProfile.gold = gold - 10;
        
        await syncUserStats(hostUid, { goldDelta: 50 });

        showToast(`祝福送出成功！扣除您 10 芒果幣，對方獲得 50 芒果幣。`, 'success');
        updateTerritoryAssets();

        // Spawn 3D Heart floating particles in Three.js
        const scene = state.three.scene;
        if (scene) {
            const geom = new THREE.DodecahedronGeometry(0.12);
            const mat = getMaterial('#ef4444', true);
            for (let i = 0; i < 5; i++) {
                const heart = new THREE.Mesh(geom, mat);
                heart.position.set(
                    (Math.random() - 0.5) * 1.5,
                    0.5 + Math.random(),
                    (Math.random() - 0.5) * 1.5
                );
                scene.add(heart);
                state.three.animatingHearts.push(heart);
            }
        }
    } catch (e) {
        console.error(e);
        showToast('送出祝福失敗。', 'error');
    } finally {
        showLoadingOverlay(false);
    }
};

window.sendGiftToHost = async (item) => {
    if (!state.three.isVisiting || !state.three.visitedProfile || !state.currentUser) return;
    const hostUid = state.three.visitedProfile.uid;
    const inv = state.userProfile.inventory || {};
    const count = inv[item] || 0;

    if (count <= 0) {
        showToast(`您的背包裡沒有多的 ${item === 'egg' ? '雞蛋' : '牛奶'} 了！`, 'error');
        return;
    }

    showLoadingOverlay(true);
    try {
        // Visitor inventory -1
        const newInv = { ...inv };
        newInv[item] = count - 1;
        await updateUserProfile(state.currentUser.uid, { inventory: newInv });
        state.userProfile.inventory = newInv;

        // Host inventory +1
        const hostProfile = await getUserProfile(hostUid, '');
        const hostInv = hostProfile.inventory || {};
        hostInv[item] = (hostInv[item] || 0) + 1;
        await updateUserProfile(hostUid, { inventory: hostInv });

        showToast(`贈送成功！已將 1 個物資送給對方。`, 'success');
        updateTerritoryAssets();
    } catch (e) {
        console.error(e);
        showToast('贈送禮物失敗。', 'error');
    } finally {
        showLoadingOverlay(false);
    }
};

// Toggle Territory modal
window.toggleTerritoryModal = () => {
    if (!state.currentUser) return;
    
    // Close profile modal if open
    if (elements.profileModal) elements.profileModal.classList.add('hidden');

    const isHidden = elements.territoryModal.classList.toggle('hidden');
    if (!isHidden) {
        // Open
        switchTerritoryTab('map');
        updateTerritoryAssets();
        if (state.territoryInterval) clearInterval(state.territoryInterval);
        state.territoryInterval = setInterval(updateProductionTimers, 5000); // 5 sec timer
        
    } else {
        // Close: Reset visit mode if active
        if (state.three.isVisiting) {
            state.three.isVisiting = false;
            state.three.visitedProfile = null;
            document.getElementById('territory-map-title').innerHTML = `<i class="fas fa-crown"></i> 3D 皇家疆域`;
            document.getElementById('territory-map-subtitle').textContent = `在層狀泥岩島嶼上收復野怪、打造你的玉井王國！`;
        }
        
        // Stop timer
        if (state.territoryInterval) {
            clearInterval(state.territoryInterval);
            state.territoryInterval = null;
        }
    }
};

window.switchTerritoryTab = (tab) => {
    document.querySelectorAll('.territory-tabs .tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('onclick').includes(tab));
    });

    document.querySelectorAll('.territory-content').forEach(content => {
        content.classList.add('hidden');
    });
    document.getElementById(`territory-tab-${tab}`).classList.remove('hidden');

    if (tab === 'map') renderTerritoryMap();
    if (tab === 'kitchen') renderKitchen();
    if (tab === 'pawn') renderTerritoryPawnShop();
};

function updateTerritoryAssets() {
    if (!state.userProfile) return;
    const profile = state.three.isVisiting ? state.three.visitedProfile : state.userProfile;
    const inv = profile.inventory || {};
    
    const totalSeeds = (inv.mango_seeds || 0) + (inv.seed_native || 0) + (inv.seed_irwin || 0) + (inv.seed_jinhuang || 0) + (inv.seed_yuwen || 0);
    const totalMangoes = (inv.mango || 0) + (inv.mango_native || 0) + (inv.mango_irwin || 0) + (inv.mango_jinhuang || 0) + (inv.mango_yuwen || 0);
    const totalDishes = (inv.mango_pudding || 0) + (inv.mango_shaved_ice || 0) + 
                        (inv.mango_green_slush || 0) + (inv.deluxe_irwin_pudding || 0) + 
                        (inv.premium_irwin_shaved_ice || 0) + (inv.dried_jinhuang_mango || 0) + 
                        (inv.royal_yuwen_panna_cotta || 0);

    elements.territoryGold.textContent = profile.gold || 0;
    elements.territoryEgg.textContent = inv.egg || 0;
    elements.territoryMilk.textContent = inv.milk || 0;
    elements.territoryPudding.textContent = totalDishes;
    elements.territoryMango.textContent = totalMangoes;
    elements.territoryMangoSeeds.textContent = totalSeeds;
}

function updateProductionTimers() {
    if (elements.territoryModal.classList.contains('hidden')) return;
    // Simple refresh active cell to update production percentages
    updateActiveCellInfo();
}

// --- Kitchen Synthesis & Pawn Shop (Updated for Mango recipes) ---

function renderKitchen() {
    elements.kitchenRecipes.innerHTML = '';
    const recipes = [
        { id: 'mango_pudding', name: '芒果布丁', icon: 'fa-cookie', desc: '玉井特產芒果，搭配鮮乳與雞蛋，香甜滑嫩！', cost: '1 芒果 + 1 蛋 + 1 奶 + 200 芒果幣' },
        { id: 'mango_shaved_ice', name: '玉井芒果冰', icon: 'fa-ice-cream', desc: '夏日解暑聖品！滿滿的芒果切丁與牛奶冰沙！', cost: '2 芒果 + 2 奶 + 300 芒果幣' },
        { id: 'mango_green_slush', name: '情人果土芒果青', icon: 'fa-glass-water', desc: '酸酸甜甜的古早味情人果冰，戀愛的滋味！', cost: '2 土芒果 + 100 芒果幣' },
        { id: 'deluxe_irwin_pudding', name: '豪華愛文芒果布丁', icon: 'fa-cookie', desc: '選用頂級愛文芒果製成的皇家布丁，入口即化！', cost: '1 愛文芒果 + 1 蛋 + 1 奶 + 300 芒果幣' },
        { id: 'premium_irwin_shaved_ice', name: '頂級愛文芒果雪花冰', icon: 'fa-snowflake', desc: '綿密雪花冰鋪滿香甜多汁的愛文芒果，無上享受！', cost: '2 愛文芒果 + 2 奶 + 500 芒果幣' },
        { id: 'dried_jinhuang_mango', name: '金煌芒果乾', icon: 'fa-leaf', desc: '厚實飽滿的金煌芒果果肉低溫烘乾，香Q有勁！', cost: '3 金煌芒果 + 200 芒果幣' },
        { id: 'royal_yuwen_panna_cotta', name: '皇家玉文芒果鮮奶酪', icon: 'fa-cheese', desc: '香濃玉文芒果淋在滑順的義式鮮奶酪上，貴族般的美味！', cost: '2 玉文芒果 + 2 奶 + 400 芒果幣' }
    ];

    recipes.forEach(r => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="item-info">
                <div class="item-icon-large"><i class="fas ${r.icon}" style="color: #ffb74d;"></i></div>
                <div class="item-details">
                    <h4>${r.name}</h4>
                    <p>${r.desc}</p>
                    <p style="color: var(--gold);">所需：${r.cost}</p>
                </div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="synthesizeItem('${r.id}')">製作</button>
        `;
        elements.kitchenRecipes.appendChild(card);
    });
}

async function synthesizeItem(recipeId) {
    if (!state.userProfile || !state.currentUser) return;
    const config = TERRITORY_CONFIG.synthesis[recipeId];
    if (!config) return;
    
    const inv = state.userProfile.inventory || {};
    const gold = state.userProfile.gold || 0;

    // Check Gold
    if (gold < (config.gold || 0)) {
        showToast('芒果幣不足，無法製作！', 'error');
        return;
    }

    // Check Materials
    for (const [material, amount] of Object.entries(config)) {
        if (material === 'gold' || material === 'reward') continue;
        const owned = inv[material] || 0;
        if (owned < amount) {
            showToast('物資不足，無法製作！', 'error');
            return;
        }
    }

    showLoadingOverlay(true);
    try {
        const newInv = { ...inv };
        
        // Deduct materials
        for (const [material, amount] of Object.entries(config)) {
            if (material === 'gold' || material === 'reward') continue;
            newInv[material] = (newInv[material] || 0) - amount;
        }
        
        // Add reward
        const reward = config.reward;
        newInv[reward] = (newInv[reward] || 0) + 1;
        
        const newGold = gold - (config.gold || 0);

        await updateUserProfile(state.currentUser.uid, {
            inventory: newInv,
            gold: newGold
        });

        state.userProfile.inventory = newInv;
        state.userProfile.gold = newGold;

        const recipeNames = {
            mango_pudding: '芒果布丁',
            mango_shaved_ice: '玉井芒果冰',
            mango_green_slush: '情人果土芒果青',
            deluxe_irwin_pudding: '豪華愛文芒果布丁',
            premium_irwin_shaved_ice: '頂級愛文芒果雪花冰',
            dried_jinhuang_mango: '金煌芒果乾',
            royal_yuwen_panna_cotta: '皇家玉文芒果鮮奶酪'
        };

        showToast(`製作成功！${recipeNames[reward] || '料理'} 已存入背包。`, 'success');
        updateTerritoryAssets();
        renderKitchen();
    } catch (e) {
        console.error(e);
        showToast('製作失敗。', 'error');
    } finally {
        showLoadingOverlay(false);
    }
}

function renderTerritoryPawnShop() {
    elements.territoryPawnInventory.innerHTML = '';
    const inv = state.userProfile.inventory || {};
    const sellables = [
        { id: 'egg', name: '雞蛋', icon: 'fa-egg', color: '#fff176', price: TERRITORY_CONFIG.pawnShop.egg, count: inv.egg || 0 },
        { id: 'milk', name: '牛奶', icon: 'fa-prescription-bottle-medical', color: '#e3f2fd', price: TERRITORY_CONFIG.pawnShop.milk, count: inv.milk || 0 },
        
        // Common
        { id: 'mango', name: '玉井芒果', icon: 'fa-lemon', color: '#ffb74d', price: TERRITORY_CONFIG.pawnShop.mango, count: inv.mango || 0 },
        { id: 'mango_seeds', name: '芒果種子', icon: 'fa-seedling', color: '#81c784', price: TERRITORY_CONFIG.pawnShop.mango_seeds, count: inv.mango_seeds || 0 },
        { id: 'mango_pudding', name: '芒果布丁', icon: 'fa-cookie', color: '#ffb74d', price: TERRITORY_CONFIG.pawnShop.mango_pudding, count: inv.mango_pudding || 0 },
        { id: 'mango_shaved_ice', name: '玉井芒果冰', icon: 'fa-ice-cream', color: '#ffb74d', price: TERRITORY_CONFIG.pawnShop.mango_shaved_ice, count: inv.mango_shaved_ice || 0 },

        // Specialized seeds
        { id: 'seed_native', name: '土芒果種子', icon: 'fa-seedling', color: '#c8e6c9', price: TERRITORY_CONFIG.pawnShop.seed_native, count: inv.seed_native || 0 },
        { id: 'seed_irwin', name: '愛文芒果種子', icon: 'fa-seedling', color: '#a5d6a7', price: TERRITORY_CONFIG.pawnShop.seed_irwin, count: inv.seed_irwin || 0 },
        { id: 'seed_jinhuang', name: '金煌芒果種子', icon: 'fa-seedling', color: '#81c784', price: TERRITORY_CONFIG.pawnShop.seed_jinhuang, count: inv.seed_jinhuang || 0 },
        { id: 'seed_yuwen', name: '玉文芒果種子', icon: 'fa-seedling', color: '#66bb6a', price: TERRITORY_CONFIG.pawnShop.seed_yuwen, count: inv.seed_yuwen || 0 },

        // Specialized mangoes
        { id: 'mango_native', name: '土芒果', icon: 'fa-lemon', color: '#81c784', price: TERRITORY_CONFIG.pawnShop.mango_native, count: inv.mango_native || 0 },
        { id: 'mango_irwin', name: '愛文芒果', icon: 'fa-lemon', color: '#ff8a65', price: TERRITORY_CONFIG.pawnShop.mango_irwin, count: inv.mango_irwin || 0 },
        { id: 'mango_jinhuang', name: '金煌芒果', icon: 'fa-lemon', color: '#ffd54f', price: TERRITORY_CONFIG.pawnShop.mango_jinhuang, count: inv.mango_jinhuang || 0 },
        { id: 'mango_yuwen', name: '玉文芒果', icon: 'fa-lemon', color: '#f06292', price: TERRITORY_CONFIG.pawnShop.mango_yuwen, count: inv.mango_yuwen || 0 },

        // Specialized dishes
        { id: 'mango_green_slush', name: '情人果土芒果青', icon: 'fa-glass-water', color: '#a5d6a7', price: TERRITORY_CONFIG.pawnShop.mango_green_slush, count: inv.mango_green_slush || 0 },
        { id: 'deluxe_irwin_pudding', name: '豪華愛文芒果布丁', icon: 'fa-cookie', color: '#ffb74d', price: TERRITORY_CONFIG.pawnShop.deluxe_irwin_pudding, count: inv.deluxe_irwin_pudding || 0 },
        { id: 'premium_irwin_shaved_ice', name: '頂級愛文芒果雪花冰', icon: 'fa-snowflake', color: '#e3f2fd', price: TERRITORY_CONFIG.pawnShop.premium_irwin_shaved_ice, count: inv.premium_irwin_shaved_ice || 0 },
        { id: 'dried_jinhuang_mango', name: '金煌芒果乾', icon: 'fa-leaf', color: '#ffd54f', price: TERRITORY_CONFIG.pawnShop.dried_jinhuang_mango, count: inv.dried_jinhuang_mango || 0 },
        { id: 'royal_yuwen_panna_cotta', name: '皇家玉文芒果鮮奶酪', icon: 'fa-cheese', color: '#f8bbd0', price: TERRITORY_CONFIG.pawnShop.royal_yuwen_panna_cotta, count: inv.royal_yuwen_panna_cotta || 0 }
    ];

    sellables.forEach(s => {
        if (s.count <= 0) return;
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="item-info">
                <div class="item-icon-large"><i class="fas ${s.icon}" style="color: ${s.color};"></i></div>
                <div class="item-details">
                    <h4>${s.name}</h4>
                    <p>持有數量：${s.count}</p>
                    <p style="color: var(--gold);">收購價：${s.price} 芒果幣 / 個</p>
                </div>
            </div>
            <button class="btn btn-gold btn-sm" onclick="sellToPawnShop('${s.id}')">全部賣出</button>
        `;
        elements.territoryPawnInventory.appendChild(card);
    });
    
    if (elements.territoryPawnInventory.innerHTML === '') {
        elements.territoryPawnInventory.innerHTML = '<p style="text-align: center; color: var(--text-dim); padding: 2rem;">背包裡沒有可變現的物資。</p>';
    }
}

async function sellToPawnShop(itemId) {
    if (!state.userProfile || !state.currentUser) return;
    const inv = state.userProfile.inventory || {};
    const count = inv[itemId] || 0;
    if (count <= 0) return;

    const price = TERRITORY_CONFIG.pawnShop[itemId];
    const totalGain = count * price;

    if (!confirm(`確定要賣出所有 ${count} 個項目嗎？這將獲得 ${totalGain} 芒果幣。`)) return;

    showLoadingOverlay(true);
    try {
        const newInv = { ...inv };
        newInv[itemId] = 0;
        const newGold = (state.userProfile.gold || 0) + totalGain;

        await updateUserProfile(state.currentUser.uid, {
            inventory: newInv,
            gold: newGold
        });

        state.userProfile.inventory = newInv;
        state.userProfile.gold = newGold;

        alert(`交易成功！獲得了 ${totalGain} 芒果幣。`);
        updateTerritoryAssets();
        renderTerritoryPawnShop();
    } catch (e) {
        console.error(e);
        alert('交易失敗。');
    } finally {
        showLoadingOverlay(false);
    }
}

// Map window functions for global access (from HTML)
window.harvestLand = harvestLand;
window.synthesizeItem = synthesizeItem;
window.sellToPawnShop = sellToPawnShop;
window.toggleTerritoryModal = toggleTerritoryModal;
window.switchTerritoryTab = switchTerritoryTab;
window.openChallengeSelection = openChallengeSelection;
window.openChallenge = openChallenge;
window.triggerMonsterBattle = triggerMonsterBattle;
window.unlockGridCell = unlockGridCell;
window.harvestGridCell = harvestGridCell;
window.upgradeGridCell = upgradeGridCell;
window.demolishGridCell = demolishGridCell;
window.submitUserFeedback = submitUserFeedback;

// --- Warrior Battle System ---

function openChallengeSelection() {
    if (!state.currentUser) {
        alert('請先登入才能發起挑戰！');
        return;
    }

    // Auto-mock leaderboard in devMode or if empty
    if (devMode && (!state.leaderboardCache || state.leaderboardCache.length <= 1)) {
        state.leaderboardCache = [
            { uid: "mock_opponent_1", nickname: "傳奇騎士·亞瑟", level: 15, avatar: "fa-shield-halved" },
            { uid: "mock_opponent_2", nickname: "龍之召喚師·艾莉絲", level: 20, avatar: "fa-dragon" },
            { uid: "mock_opponent_3", nickname: "影之刺客·凱", level: 10, avatar: "fa-user-ninja" }
        ];
        if (state.currentUser) {
            state.leaderboardCache.push({
                uid: state.currentUser.uid,
                nickname: state.userProfile ? state.userProfile.nickname : "你",
                level: state.userProfile ? state.userProfile.level : 1,
                avatar: state.userProfile ? state.userProfile.avatar : "fa-user"
            });
        }
    }

    if (!state.leaderboardCache || state.leaderboardCache.length === 0) {
        alert('暫無勇者名單，請稍後再試。');
        return;
    }

    const container = elements.challengeListContainer;
    container.innerHTML = '';

    const others = state.leaderboardCache.filter(u => u.uid !== state.currentUser.uid);

    if (others.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-dim); padding: 1rem;">目前沒有其他勇者可以挑戰...</p>';
    } else {
        others.forEach(u => {
            const item = document.createElement('div');
            item.className = 'challenge-item';
            item.onclick = () => {
                elements.challengeSelectionModal.classList.add('hidden');
                openChallenge(u.uid);
            };

            let avatarHtml = '';
            if (u.avatar && typeof u.avatar === 'string' && u.avatar.includes('.png')) {
                avatarHtml = `<img src="assets/avatars/${u.avatar}" style="width: 100%; height: 100%; object-fit: cover;">`;
            } else {
                avatarHtml = `<i class="fas ${u.avatar || 'fa-user-ninja'}" style="font-size: 1.2rem; color: var(--gold);"></i>`;
            }

            item.innerHTML = `
                <div class="challenge-item-info">
                    <div class="challenge-item-avatar">${avatarHtml}</div>
                    <div class="challenge-item-details">
                        <div class="challenge-item-name">${u.nickname || '無名勇者'}</div>
                        <div class="challenge-item-id">ID: ${u.uid.slice(0, 8)}...</div>
                    </div>
                </div>
                <div class="challenge-item-level">LV ${u.level || 1}</div>
            `;
            container.appendChild(item);
        });
    }

    elements.challengeSelectionModal.classList.remove('hidden');
}

async function openChallenge(opponentUid) {
    if (!state.currentUser) {
        alert('請先登入才能發起挑戰！');
        return;
    }

    try {
        showLoadingOverlay(true);
        const opponent = state.leaderboardCache ? state.leaderboardCache.find(u => u.uid === opponentUid) : null;
        if (!opponent) {
            alert('對象資料載入失敗');
            return;
        }

        state.battle.opponent = opponent;
        state.battle.bet = 500;

        elements.challengeOpponentName.textContent = opponent.nickname || '無名勇者';
        elements.challengeOpponentLevel.textContent = `LV ${opponent.level || 1}`;
        elements.betDisplay.textContent = state.battle.bet;

        // Reset battle setup dropdowns
        const subSel = document.getElementById('challenge-subject-select');
        const catCont = document.getElementById('challenge-category-container');
        const catSel = document.getElementById('challenge-category-select');
        if (subSel) subSel.value = '';
        if (catCont) catCont.classList.add('hidden');
        if (catSel) catSel.innerHTML = '';

        if (opponent.avatar && opponent.avatar.includes('.png')) {
            elements.challengeOpponentAvatar.innerHTML = `<img src="assets/avatars/${opponent.avatar}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            elements.challengeOpponentAvatar.innerHTML = `<i class="fas ${opponent.avatar || 'fa-user-ninja'}"></i>`;
        }

        elements.challengeModal.classList.remove('hidden');
    } catch (e) {
        console.error(e);
        alert('開啟挑戰介面失敗');
    } finally {
        showLoadingOverlay(false);
    }
};

window.adjustBet = (delta) => {
    const step = 100;
    let newBet = state.battle.bet + (delta * step);
    if (newBet < 500) newBet = 500;
    if (newBet > 2000) newBet = 2000;
    
    state.battle.bet = newBet;
    elements.betDisplay.textContent = newBet;
};

let battleAnswerResolver = null;

window.submitBattleAnswer = (choiceIndex, btn) => {
    if (battleAnswerResolver) {
        // Disable all sibling buttons in this grid
        const container = btn.parentElement;
        const buttons = container.querySelectorAll('.dos-combat-btn');
        buttons.forEach(b => {
            b.disabled = true;
            b.style.opacity = '0.5';
            b.style.cursor = 'not-allowed';
        });
        
        battleAnswerResolver(choiceIndex);
        battleAnswerResolver = null;
    }
};

async function handleChallengeSubjectChange() {
    const val = document.getElementById('challenge-subject-select').value;
    const catContainer = document.getElementById('challenge-category-container');
    const catSelect = document.getElementById('challenge-category-select');
    
    if (!val) {
        catContainer.classList.add('hidden');
        return;
    }

    try {
        showLoadingOverlay(true);
        let questions = state.cachedData[val];
        if (!questions) {
            const subjectConfig = state.config.subjectMap[val];
            const CACHE_VERSION = 'v4'; 
            const localCacheKey = `quiz_cache_${val}_${CACHE_VERSION}`;
            const savedData = localStorage.getItem(localCacheKey);
            if (savedData) {
                try {
                    questions = JSON.parse(savedData);
                    state.cachedData[val] = questions;
                } catch (e) {
                    console.warn("Local storage cache corrupted, refetching...");
                }
            }
            
            if (!questions) {
                const response = await fetchWithRetry(encodeURIComponent(subjectConfig.file));
                questions = await response.json();
                state.cachedData[val] = questions;
                localStorage.setItem(localCacheKey, JSON.stringify(questions));
            }
        }

        // Get distinct categories
        const categories = [...new Set(questions.map(q => q.category).filter(Boolean))];
        catSelect.innerHTML = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        catContainer.classList.remove('hidden');
    } catch (err) {
        console.error('Failed to load questions for challenge:', err);
        alert('載入對戰題庫失敗，請確認網路連線。');
        document.getElementById('challenge-subject-select').value = '';
        catContainer.classList.add('hidden');
    } finally {
        showLoadingOverlay(false);
    }
}

async function askBattleQuestion(q, questionIndex, totalQuestions) {
    const log = elements.dosLog;
    
    await writeLog(`\n----------------------------------------`, log, 'dos-text-dim');
    await writeLog(`[題目 ${questionIndex + 1} / ${totalQuestions}]`, log, 'dos-text-gold');
    await writeLog(q.question, log, 'dos-text-gold');
    
    let paddedOptions = [...q.options];
    while (paddedOptions.length < 4) {
        paddedOptions.push("(無文字選項)");
    }
    
    const optionsWithIndices = paddedOptions.map((opt, idx) => ({ 
        text: (opt === "無選項" || !opt) ? "(無文字選項)" : opt, 
        originalIndex: idx + 1 
    }));
    
    // Shuffle the options
    for (let i = optionsWithIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [optionsWithIndices[i], optionsWithIndices[j]] = [optionsWithIndices[j], optionsWithIndices[i]];
    }

    const containerDiv = document.createElement('div');
    containerDiv.style.margin = '10px 0';
    containerDiv.style.display = 'flex';
    containerDiv.style.flexDirection = 'column';
    containerDiv.style.gap = '8px';
    
    optionsWithIndices.forEach((optObj, idx) => {
        const btn = document.createElement('button');
        btn.className = 'dos-combat-btn';
        btn.style.background = 'transparent';
        btn.style.border = '1px solid #00ff00';
        btn.style.color = '#00ff00';
        btn.style.padding = '8px';
        btn.style.textAlign = 'left';
        btn.style.fontFamily = 'monospace';
        btn.style.fontSize = '0.9rem';
        btn.style.cursor = 'pointer';
        btn.style.width = '100%';
        btn.style.textShadow = '0 0 5px rgba(0, 255, 0, 0.5)';
        btn.style.boxShadow = 'inset 0 0 5px rgba(0, 255, 0, 0.1)';
        btn.style.borderRadius = '4px';
        btn.style.transition = 'all 0.2s';
        
        btn.onmouseover = () => {
            if (!btn.disabled) {
                btn.style.background = '#00ff00';
                btn.style.color = '#000';
            }
        };
        btn.onmouseout = () => {
            if (!btn.disabled) {
                btn.style.background = 'transparent';
                btn.style.color = '#00ff00';
            }
        };
        
        btn.textContent = `(${idx + 1}) ${optObj.text}`;
        btn.onclick = () => window.submitBattleAnswer(optObj.originalIndex, btn);
        containerDiv.appendChild(btn);
    });
    
    log.appendChild(containerDiv);
    log.scrollTop = log.scrollHeight;
    
    const chosenIndex = await new Promise(resolve => {
        battleAnswerResolver = resolve;
    });

    const isCorrect = chosenIndex === q.answer;
    
    const buttons = containerDiv.querySelectorAll('.dos-combat-btn');
    buttons.forEach((btn, idx) => {
        const optObj = optionsWithIndices[idx];
        if (optObj.originalIndex === q.answer) {
            btn.style.border = '2px solid #00ff00';
            btn.style.background = 'rgba(0, 255, 0, 0.2)';
            btn.style.color = '#00ff00';
            btn.style.opacity = '1';
        } else if (optObj.originalIndex === chosenIndex && !isCorrect) {
            btn.style.border = '2px solid #ff3333';
            btn.style.background = 'rgba(255, 51, 51, 0.2)';
            btn.style.color = '#ff3333';
            btn.style.opacity = '1';
        }
    });

    if (isCorrect) {
        await writeLog(`>> 回答正確！`, log, 'dos-text-blue');
        playCorrectSound();
    } else {
        const correctText = optionsWithIndices.find(o => o.originalIndex === q.answer)?.text || '';
        await writeLog(`>> 回答錯誤。正確答案是：${correctText}`, log, 'dos-text-red');
        playWrongSound();
    }
    
    return isCorrect;
}

elements.confirmChallengeBtn.addEventListener('click', async () => {
    if (!state.userProfile || state.userProfile.gold < state.battle.bet) {
        alert('芒果幣不足，無法發起這場挑戰！');
        return;
    }

    const sub = document.getElementById('challenge-subject-select').value;
    const cat = document.getElementById('challenge-category-select').value;
    
    if (!sub || !cat) {
        alert('請先選擇對戰領域和工作項目！');
        return;
    }

    if (confirm(`確定要打賭 ${state.battle.bet} 芒果幣與 ${state.battle.opponent.nickname} 進行決鬥嗎？\n(勝利獲得 2 倍獎勵，失敗失去賭注)`)) {
        elements.challengeModal.classList.add('hidden');
        await startBattle();
    }
});

async function startBattle() {
    showScreen('battle-screen');
    // Simplified: directly process results without dragon battle
    const totalQuestions = state.allQuestions.length;
    const correctAnswers = state.score;
    const accuracy = (correctAnswers / totalQuestions) * 100 || 0;
    
    // Calculate EXP and Coins (1.5x if accuracy > 80%, 2x if 100%)
    let baseExp = correctAnswers * 10;
    let baseCoins = correctAnswers * 5;
    
    if (accuracy === 100) {
        baseExp *= 2;
        baseCoins *= 2;
    } else if (accuracy >= 80) {
        baseExp = Math.floor(baseExp * 1.5);
        baseCoins = Math.floor(baseCoins * 1.5);
    }
    
    const timeSpent = Math.floor((Date.now() - state.startTime) / 1000);
    
    // Save to Google Apps Script
    if (state.currentUser) {
        const recordData = {
            email: state.currentUser.email,
            subject: state.config.subjectMap[state.selectedSubject]?.name || state.selectedSubject,
            score: correctAnswers,
            correctRate: accuracy.toFixed(2) + '%',
            durationSec: timeSpent,
            coinsEarned: baseCoins,
            isTaskReward: false // TODO: Check task match
        };
        await saveRecordToGAS(recordData);
    }
    
    try {
        await processBattleResult({
            isWin: accuracy >= 60,
            expGained: baseExp,
            coinsGained: baseCoins,
            timeSpent: timeSpent,
            subject: state.selectedSubject,
            score: correctAnswers,
            totalQuestions: totalQuestions
        });
        
        // Show result modal instead of battle sequence
        document.getElementById('battle-status').innerHTML = `
            <h3>測驗完成！</h3>
            <p>答對題數：${correctAnswers} / ${totalQuestions}</p>
            <p>獲得經驗值：${baseExp} EXP</p>
            <p>獲得芒果幣：${baseCoins}</p>
        `;
        setTimeout(() => {
            endBattle(accuracy >= 60, baseExp, baseCoins);
        }, 3000);
    } catch (error) {
        console.error("Error processing quiz result:", error);
        alert("儲存紀錄時發生錯誤。");
        showScreen('setup-screen');
    }
}

async function runBattleSimulation(opponent, bet) {
    const log = elements.dosLog;
    
    await writeLog('>>> INITIALIZING BATTLE_STREAM_V2.0...', log, 'dos-text-dim');
    await writeLog('>>> CONNECTING TO GLOBAL_ARENA_SATELLITE...', log, 'dos-text-dim');
    await writeLog('>>> ENCRYPTION_KEY: 0x' + Math.random().toString(16).slice(2, 10).toUpperCase(), log, 'dos-text-dim');
    await writeLog('>>> CONNECTION ESTABLISHED. CHANNEL_SECURE.', log, 'dos-text-dim');
    await new Promise(r => setTimeout(r, 600));

    const myName = state.userProfile.nickname || '你';
    const opName = opponent.nickname || '對手';
    
    await writeLog(`\n[對戰開始] ${myName} 向 ${opName} 發起了決鬥！`, log, 'dos-text-gold');
    await writeLog(`[對戰開始] 決鬥賭注：${bet} 枚芒果幣`, log, 'dos-text-gold');
    await new Promise(r => setTimeout(r, 500));

    const sub = document.getElementById('challenge-subject-select').value;
    const cat = document.getElementById('challenge-category-select').value;
    const questionsPool = state.cachedData[sub].filter(q => q.category === cat);
    
    // Shuffle and pick 20 questions
    const shuffled = [...questionsPool].sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffled.slice(0, 20);

    let myHp = 100;
    let opHp = 100;

    const renderHpBar = (hp, label, colorClass) => {
        const totalSegments = 20;
        const filled = Math.ceil((hp / 100) * totalSegments);
        const icon = hp > 50 ? ' (^_^) <3' : (hp > 0 ? ' (>_<) !' : ' (X_X) [dead]');
        const bar = '[' + '#'.repeat(Math.max(0, filled)) + '-'.repeat(Math.max(0, totalSegments - filled)) + ']';
        return `${label} HP: ${bar} ${hp}/100 ${icon}`;
    };

    let round = 0;
    while (myHp > 0 && opHp > 0 && round < selectedQuestions.length) {
        const q = selectedQuestions[round];
        
        await writeLog(`\n=== 回合 ${round + 1} ===`, log);
        await writeLog(renderHpBar(myHp, 'YOU   ', 'dos-text-blue'), log, 'dos-text-blue');
        await writeLog(renderHpBar(opHp, 'TARGET', 'dos-text-red'), log, 'dos-text-red');
        
        const isCorrect = await askBattleQuestion(q, round, selectedQuestions.length);
        await new Promise(r => setTimeout(r, 600));

        if (isCorrect) {
            // Player attacks first!
            const playerCrit = Math.random() < 0.10;
            const playerDmg = playerCrit ? 20 : 5;
            opHp = Math.max(0, opHp - playerDmg);
            
            if (playerCrit) {
                await writeLog(`⚔️ 爆擊！${myName} 使出致命一擊 💥 造成 ${playerDmg} 點傷害！`, log, 'dos-text-gold');
            } else {
                await writeLog(`⚔️ ${myName} 發動攻擊，造成 ${playerDmg} 點傷害。`, log, 'dos-text-blue');
            }
            
            if (opHp <= 0) {
                await writeLog(`💀 ${opName} 被擊倒了！`, log, 'dos-text-red');
                break;
            }
            
            await new Promise(r => setTimeout(r, 800));

            // Opponent counter-attacks with 50% chance
            if (Math.random() < 0.50) {
                const opCrit = Math.random() < 0.10;
                const opDmg = opCrit ? 20 : 5;
                myHp = Math.max(0, myHp - opDmg);
                if (opCrit) {
                    await writeLog(`💥 爆擊！${opName} 反擊使出致命一擊，造成 ${opDmg} 點傷害！`, log, 'dos-text-red');
                } else {
                    await writeLog(`🛡️ ${opName} 發動反擊，造成 ${opDmg} 點傷害。`, log, 'dos-text-red');
                }
                if (myHp <= 0) {
                    await writeLog(`💀 你被擊倒了！`, log, 'dos-text-red');
                    break;
                }
            } else {
                await writeLog(`🛡️ ${opName} 來不及反應，防禦成功！`, log, 'dos-text-dim');
            }
        } else {
            // Opponent attacks first!
            const opCrit = Math.random() < 0.10;
            const opDmg = opCrit ? 20 : 5;
            myHp = Math.max(0, myHp - opDmg);
            
            if (opCrit) {
                await writeLog(`💥 爆擊！${opName} 趁你露出破綻，使出致命一擊！造成 ${opDmg} 點傷害！`, log, 'dos-text-red');
            } else {
                await writeLog(`⚔️ ${opName} 先攻！趁你答錯發動突襲，造成 ${opDmg} 點傷害。`, log, 'dos-text-red');
            }
            
            if (myHp <= 0) {
                await writeLog(`💀 你被擊倒了！`, log, 'dos-text-red');
                break;
            }
            
            await new Promise(r => setTimeout(r, 800));

            // Player counter-attacks
            const playerCrit = Math.random() < 0.10;
            const playerDmg = playerCrit ? 20 : 5;
            opHp = Math.max(0, opHp - playerDmg);
            if (playerCrit) {
                await writeLog(`⚔️ 爆擊！${myName} 重整旗鼓進行反擊 💥 造成 ${playerDmg} 點傷害！`, log, 'dos-text-gold');
            } else {
                await writeLog(`⚔️ ${myName} 進行反擊，造成 ${playerDmg} 點傷害。`, log, 'dos-text-blue');
            }
            
            if (opHp <= 0) {
                await writeLog(`💀 ${opName} 被擊倒了！`, log, 'dos-text-red');
                break;
            }
        }
        
        round++;
        await new Promise(r => setTimeout(r, 1000));
    }

    await writeLog('\n>>> BATTLE_CONCLUDED. ANALYZING_RESULTS...', log, 'dos-text-dim');
    await new Promise(r => setTimeout(r, 1000));

    const playerWon = opHp <= 0 || (myHp > 0 && opHp > 0 && myHp >= opHp);

    if (playerWon) {
        if (opHp <= 0) {
            await writeLog(`\n[勝利] ${opName} 體力不支倒下了！ (×_×)`, log, 'dos-text-gold');
        } else {
            await writeLog(`\n[時間到] 20 題已答完！雙方均未倒下。`, log, 'dos-text-gold');
            await writeLog(`[判定勝利] 你的剩餘生命值 (${myHp}) 高於對手 (${opHp})！`, log, 'dos-text-gold');
        }
        await writeLog(`[勝利] 你贏得了這場決鬥！ (^_^)v`, log, 'dos-text-gold');
        await writeLog(`>>> 獲得芒果幣：${bet * 2} (★≧▽^))★☆`, log, 'dos-text-gold');
    } else {
        if (myHp <= 0) {
            await writeLog(`\n[失敗] 你感覺視線模糊，體力已到極限... (O_Q)`, log, 'dos-text-red');
        } else {
            await writeLog(`\n[時間到] 20 題已答完！雙方均未倒下。`, log, 'dos-text-red');
            await writeLog(`[判定失敗] 你的剩餘生命值 (${myHp}) 低於對手 (${opHp})...`, log, 'dos-text-red');
        }
        await writeLog(`[失敗] ${opName} 獲得了勝利！ (つд⊂)`, log, 'dos-text-red');
        await writeLog(`>>> 失去芒果幣：${bet} (T_T)`, log, 'dos-text-red');
    }

    try {
        await processBattleResult(state.currentUser.uid, opponent.uid, bet, playerWon);
        // Refresh local state
        state.userProfile = await getUserProfile(state.currentUser.uid, state.currentUser.email);
        updateProfileDisplay(); // Update gold in profile
        updateTerritoryAssets(); // Update gold in territory if open
    } catch (e) {
        console.error("Failed to process battle result", e);
        await writeLog('\n[警告] 資料庫同步失敗。', log, 'dos-text-red');
    }

    state.battle.isBattling = false;
    elements.closeDosBtn.classList.remove('hidden');
    
    // Refresh leaderboard to reflect gold changes if possible
    renderHomepageLeaderboard();
}

async function writeLog(text, container, className = '') {
    const p = document.createElement('p');
    if (className) p.className = className;
    container.appendChild(p);
    
    for (let char of text) {
        p.textContent += char;
        await new Promise(resolve => setTimeout(resolve, 20));
    }
    container.scrollTop = container.scrollHeight;
}

function updateProfileDisplay() {
    if (!state.userProfile) return;
    elements.profileGold.textContent = state.userProfile.gold || 0;
    
    const nick = document.getElementById('profile-nickname');
    if (nick) nick.value = state.userProfile.nickname || '';
    
    const badge = document.getElementById('profile-level-badge');
    if (badge) {
        const threshold = LEVEL_THRESHOLDS.find(t => t.level === (state.userProfile.level || 1));
        badge.textContent = `LV ${state.userProfile.level || 1} ${threshold ? threshold.name : '勇者'}`;
    }

    const totalQ = document.getElementById('profile-total-questions');
    if (totalQ) totalQ.textContent = state.userProfile.totalQuestions || 0;

    const totalT = document.getElementById('profile-total-time');
    if (totalT) totalT.textContent = Math.floor((state.userProfile.totalTime || 0) / 60) + 'm';

    // Update EXP bar
    const currentLevel = state.userProfile.level || 1;
    const currentThreshold = LEVEL_THRESHOLDS.find(t => t.level === currentLevel);
    const nextThreshold = LEVEL_THRESHOLDS.find(t => t.level === currentLevel + 1);
    
    if (currentThreshold && nextThreshold) {
        const progress = state.userProfile.totalQuestions - currentThreshold.req;
        const total = nextThreshold.req - currentThreshold.req;
        const percent = Math.min(100, Math.max(0, (progress / total) * 100));
        const bar = document.getElementById('profile-exp-bar');
        const text = document.getElementById('profile-exp-text');
        if (bar) bar.style.width = `${percent}%`;
        if (text) text.textContent = `${state.userProfile.totalQuestions} / ${nextThreshold.req}`;
    }
}
