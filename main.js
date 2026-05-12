import { auth, loginUser, registerUser, loginWithGoogle, loginWithGoogleRedirect, handleRedirectResult, logoutUser, savePracticeRecord, getUserHistory, getUserProfile, updateUserProfile, syncUserStats, getGlobalLeaderboard, LEVEL_THRESHOLDS, PUZZLE_THEMES, getAllUsers, getAllPracticeRecords, getUserPracticeRecords } from './firebase_app.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";

// Main Application Logic
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
            'technical': { name: '技術士技能檢定學科測試共同題庫', file: '技術士技能檢定學科測試共同題庫.json' },
            'food_safety': { name: '[共同科目題庫] 食品安全衛生及營養相關職類', file: '[共同科目題庫] 食品安全衛生及營養相關職類.json' },
            'baking': { name: '[丙級學科題庫] 烘焙食品', file: '[丙級學科題庫] 烘焙食品.json' }
        }
    },
    cachedData: {}, // subjectKey -> questions
    userProfile: null,
    practicedQuestionIds: []
};

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
    musicToggleBtn: document.getElementById('music-toggle-btn'),
    bgMusic: document.getElementById('bg-music'),
    musicTrackSelect: document.getElementById('music-track-select'),
    musicVolumeSlider: document.getElementById('music-volume-slider'),
    musicEnabledToggle: document.getElementById('music-enabled-toggle'),
    volumeValue: document.getElementById('volume-value')
};

let isLoginMode = true;
let selectedAvatarIcon = 'fa-cat';

// Initialize
elements.subjectSelect.addEventListener('change', handleSubjectChange);
elements.filterType.addEventListener('change', updateFilterOptions);
elements.filterValue.addEventListener('change', updateQuestionCountDropdown);
elements.keywordInput.addEventListener('input', updateQuestionCountDropdown);

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
    elements.musicToggleBtn.innerHTML = isMusicMuted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-music"></i>';
    elements.musicToggleBtn.style.color = isMusicMuted ? 'var(--text-dim)' : 'var(--gold)';
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
        elements.bgMusic.play().catch(e => console.log("Music play blocked:", e));
    }
    updateMusicSettings();
}

// Listeners for music settings in Profile Modal
elements.musicTrackSelect.addEventListener('change', (e) => {
    musicTrack = e.target.value;
    localStorage.setItem('music_track', musicTrack);
    elements.bgMusic.src = musicTrack;
    if (!isMusicMuted) elements.bgMusic.play().catch(e => console.log("Play failed:", e));
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

elements.musicToggleBtn.addEventListener('click', () => toggleMusic());

// Handle Autoplay Policy
document.body.addEventListener('click', () => {
    if (!isMusicMuted && elements.bgMusic.paused) {
        elements.bgMusic.play().catch(e => console.log("Still blocked:", e));
    }
}, { once: true });

// Initial Load
updateMusicSettings();
if (!isMusicMuted) {
    elements.bgMusic.play().catch(e => console.log("Initial play blocked:", e));
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
onAuthStateChanged(auth, async (user) => {
    state.currentUser = user;
    const reqElements = document.querySelectorAll('.auth-required');
    if (user) {
        try {
            state.userProfile = await getUserProfile(user.uid, user.email);
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
        }
        
        // Check for Admin
        if (user.email === 'adamzombie85@gmail.com') {
            elements.adminBtn.classList.remove('hidden');
        } else {
            elements.adminBtn.classList.add('hidden');
        }

        reqElements.forEach(el => el.classList.remove('hidden'));
    } else {
        state.userProfile = null;
        elements.userAvatarBtn.classList.add('hidden');
        elements.authBtn.classList.remove('hidden');
        elements.adminBtn.classList.add('hidden');
        reqElements.forEach(el => el.classList.add('hidden'));
    }
    // Always refresh leaderboard
    renderHomepageLeaderboard();
});

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

function finishLoadingSubject() {
    elements.subOptions.classList.remove('hidden');
    elements.startBtn.disabled = false;
    elements.startBtn.innerHTML = '<i class="fas fa-sword"></i> 開始練習';
    updateFilterOptions();
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
    for (let i = 20; i <= poolSize; i += 20) {
        elements.questionCount.innerHTML += `<option value="${i}">${i} 題</option>`;
    }
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

function showQuestion() {
    const q = state.filteredQuestions[state.currentQuestionIndex];
    
    // Add to practiced list for stats
    const qKey = `${state.selectedSubject}_${q.id}`;
    if (!state.practicedQuestionIds.includes(qKey)) {
        state.practicedQuestionIds.push(qKey);
    }

    elements.progress.textContent = `題目 ${state.currentQuestionIndex + 1} / ${state.filteredQuestions.length}`;
    elements.questionText.textContent = q.question;

    elements.immediateExpContainer.classList.add('hidden');
    elements.optionsContainer.innerHTML = '';
    q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = `${i + 1}. ${opt}`;
        btn.onclick = () => handleAnswer(i + 1, btn);
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
    const q = state.filteredQuestions[state.currentQuestionIndex];
    const isCorrect = choice === q.answer;
    const btns = elements.optionsContainer.querySelectorAll('.option-btn');

    btns.forEach(b => b.disabled = true);

    if (isCorrect) {
        state.score++;
        btn.classList.add('correct');
        playCorrectSound();
        triggerHitEffect();
    } else {
        btn.classList.add('wrong');
        btns[q.answer - 1].classList.add('correct');
        playWrongSound();
        state.wrongQuestions.push({
            ...q,
            userChoice: choice
        });
    }

    // Update HP Bar - Dragon has 100% HP. Each correct answer deals damage.
    // We expect passing score (e.g. 80%) to defeat the dragon. So answering 80% correctly deals 100% damage.
    const damagePerCorrect = 100 / (state.filteredQuestions.length * 0.8);
    const hpPercent = Math.max(0, 100 - (state.score * damagePerCorrect));
    
    elements.dragonHp.style.width = `${hpPercent}%`;
    elements.dragonHpText.textContent = `${Math.round(hpPercent)}%`;

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
    
    // 延遲播放惡龍受擊與劍光 (配合揮劍的時機點)
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
                totalToGrade, 
                elapsedSecs, 
                state.practicedQuestionIds
            );
            
            if (statsResult) {
                // Update local profile state immediately
                state.userProfile.totalQuestions = statsResult.totalQuestions;
                state.userProfile.totalTime = statsResult.totalTime;
                state.userProfile.level = statsResult.newLevel;
                state.userProfile.puzzlePieces = statsResult.puzzlePieces;
                
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
            elements.victoryMessage.innerHTML = `<span style="color: var(--success)">恭喜勇者！你成功討伐了惡龍！</span>`;
            elements.dragonSprite.classList.add('dragon-die');
            if (resultAnimContainer && resultAnimImg) {
                resultAnimImg.src = 'motion/win.webp';
                resultAnimContainer.classList.remove('hidden');
            }
        } else {
            elements.victoryMessage.innerHTML = `<span style="color: var(--danger)">戰敗了... 惡龍的力量太強，再修煉一下吧！</span>`;
            if (resultAnimContainer && resultAnimImg) {
                resultAnimImg.src = 'motion/lose.webp';
                resultAnimContainer.classList.remove('hidden');
            }
        }

        renderReview();
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

    elements.resultScreen.classList.add('hidden');
    
    // Hide animation
    const resultAnimContainer = document.getElementById('result-animation-container');
    if (resultAnimContainer) {
        resultAnimContainer.classList.add('hidden');
    }

    elements.quizScreen.classList.remove('hidden');
    elements.dragonSprite.classList.remove('dragon-die');
    elements.dragonSprite.classList.add('dragon-idle');
    elements.dragonHp.style.width = '100%';
    elements.dragonHpText.textContent = '100%';

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
    try {
        const topUsers = await getGlobalLeaderboard();
        const body = document.getElementById('homepage-leaderboard-body');
        if (!body) return;

        if (topUsers.length === 0) {
            body.innerHTML = '<tr><td colspan="5" style="text-align: center;">尚未有任何勇者紀錄</td></tr>';
        } else {
            body.innerHTML = topUsers.map((u, idx) => {
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
                    <td style="color: var(--gold); font-weight:bold;">${u.totalQuestions || 0}</td>
                </tr>
            `}).join('');
        }
    } catch (e) {
        console.error("Leaderboard error:", e);
    }
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
                    <td style="color: var(--gold); font-weight:bold;">${u.totalQuestions || 0}</td>
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
    if (!state.userProfile) return;
    
    // Setup modal UI
    document.getElementById('profile-nickname').value = state.userProfile.nickname || '';
    document.getElementById('profile-role').value = state.userProfile.role || '';
    
    // Role fields
    document.getElementById('profile-teacher-name').value = state.userProfile.realName || '';
    document.getElementById('profile-teacher-school').value = state.userProfile.school || '';
    document.getElementById('profile-teacher-subject').value = state.userProfile.teacherSubject || '';
    
    document.getElementById('profile-student-name').value = state.userProfile.realName || '';
    document.getElementById('profile-student-school').value = state.userProfile.school || '';
    document.getElementById('profile-student-dept').value = state.userProfile.studentDept || '';

    updateRoleFields(state.userProfile.role);

    selectedAvatarIcon = state.userProfile.avatar || 'male_1.png';
    
    // Setup Avatar selector
    document.querySelectorAll('.avatar-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.icon === selectedAvatarIcon);
    });
    
    // Setup Exp Bar
    const currentQ = state.userProfile.totalQuestions || 0;
    const curLevelInfo = LEVEL_THRESHOLDS.find(t => t.level === state.userProfile.level) || LEVEL_THRESHOLDS[0];
    const nextLevelInfo = LEVEL_THRESHOLDS.find(t => t.level === state.userProfile.level + 1);
    
    let expPercent = 100;
    let expText = `${currentQ} (MAX)`;
    
    if (nextLevelInfo) {
        const req = nextLevelInfo.req;
        const prevReq = curLevelInfo.req;
        const progress = currentQ - prevReq;
        const totalNeeded = req - prevReq;
        expPercent = Math.min(100, Math.max(0, (progress / totalNeeded) * 100));
        expText = `${currentQ} / ${req}`;
    }
    
    document.getElementById('profile-level-badge').textContent = `LV ${state.userProfile.level || 1}`;
    document.getElementById('profile-exp-bar').style.width = `${expPercent}%`;
    document.getElementById('profile-exp-text').textContent = expText;
    
    document.getElementById('profile-total-questions').textContent = currentQ;
    document.getElementById('profile-total-time').textContent = `${Math.floor((state.userProfile.totalTime || 0) / 60)}m`;
    
    // Puzzles (replacing treasures)
    const treasuresGrid = document.getElementById('profile-treasures');
    const pieces = state.userProfile.puzzlePieces || [];
    const theme = PUZZLE_THEMES.find(t => t.id === state.userProfile.currentPuzzleId) || PUZZLE_THEMES[0];
    
    // Change title if possible (optional, but good for UX)
    const treasuresTitle = document.querySelector('#profile-modal h3 i.fa-gem')?.parentElement;
    if (treasuresTitle) treasuresTitle.innerHTML = `<i class="fas fa-puzzle-piece"></i> 拼圖收藏：${theme.name}`;

    treasuresGrid.className = 'puzzle-grid';
    treasuresGrid.style.backgroundImage = `url(${theme.silhouette})`;
    treasuresGrid.style.aspectRatio = theme.aspectRatio || '1 / 1';
    treasuresGrid.innerHTML = '';
    
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.className = 'puzzle-cell';
        if (pieces.includes(i)) {
            cell.innerHTML = `<img src="${theme.imagePrefix}${i}.png" class="puzzle-piece-img animate-pop">`;
            cell.classList.add('collected');
        }
        treasuresGrid.appendChild(cell);
    }
    
    renderProfileAvatar();
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
        profileData.teacherSubject = document.getElementById('profile-teacher-subject').value.trim();
    } else {
        profileData.realName = document.getElementById('profile-student-name').value.trim();
        profileData.school = document.getElementById('profile-student-school').value.trim();
        profileData.studentDept = document.getElementById('profile-student-dept').value;
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
    const detailTab = document.getElementById('admin-tab-detail');
    const tabsContainer = document.getElementById('admin-tabs-container');
    const usersBtn = document.getElementById('admin-tab-users-btn');
    const recordsBtn = document.getElementById('admin-tab-records-btn');

    usersTab.classList.add('hidden');
    recordsTab.classList.add('hidden');
    detailTab.classList.add('hidden');
    tabsContainer.classList.remove('hidden');
    usersBtn.classList.remove('btn-primary');
    recordsBtn.classList.remove('btn-primary');

    if (tab === 'users') {
        usersTab.classList.remove('hidden');
        usersBtn.classList.add('btn-primary');
        const users = await getAllUsers();
        document.getElementById('admin-users-body').innerHTML = users.map(u => {
            const avatarImg = u.avatar ? `<img src="assets/avatars/${u.avatar}" style="width: 32px; height: 32px; border-radius: 4px; border: 1px solid var(--gold);">` : `<i class="fas fa-user-ninja" style="font-size: 1.5rem;"></i>`;
            return `
            <tr onclick="viewUserDetail('${u.uid}', '${u.nickname || u.email.split('@')[0]}')" style="cursor:pointer;">
                <td>
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
            </tr>
        `}).join('');
    } else if (tab === 'records') {
        recordsTab.classList.remove('hidden');
        recordsBtn.classList.add('btn-primary');
        const records = await getAllPracticeRecords();
        document.getElementById('admin-records-body').innerHTML = records.map(r => {
            const date = r.timestamp ? (r.timestamp.toDate ? r.timestamp.toDate() : new Date(r.timestamp)) : new Date();
            return `
                <tr>
                    <td>${date.toLocaleString()}</td>
                    <td>${r.email}</td>
                    <td>${r.subject.name || r.subject}</td>
                    <td>${r.count}</td>
                    <td style="color:${r.score >= 80 ? 'var(--success)' : 'var(--danger)'}">${r.score}%</td>
                </tr>
            `;
        }).join('');
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
                return `
                    <tr>
                        <td>${date.toLocaleString()}</td>
                        <td>${r.subject.name || r.subject}</td>
                        <td>${r.count}</td>
                        <td style="color:${r.score >= 80 ? 'var(--success)' : 'var(--danger)'}">${r.score}%</td>
                    </tr>
                `;
            }).join('');
        }
    } catch (e) {
        console.error("Failed to load user records:", e);
        document.getElementById('admin-detail-body').innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--danger);">載入失敗</td></tr>';
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
}

// --- Story Prologue Logic ---

async function showPrologue() {
    // Show prologue every time
    const modal = document.getElementById('prologue-modal');
    const textContainer = document.getElementById('prologue-text');
    const skipBtn = document.getElementById('skip-prologue-btn');
    const storyText = "古老的王國傳說著... 邪惡的惡龍奪走了世界上所有的珍貴名畫，將它們撕碎並藏在深淵之中。\n\n身為勇者，你必須通過『丙級檢定』的試煉，在練習中磨練心智，在戰鬥中擊敗惡龍，奪回失去的拼圖碎片，重現名畫的光輝！";
    
    modal.classList.remove('hidden');
    
    let i = 0;
    function type() {
        if (i < storyText.length) {
            textContainer.innerHTML = storyText.substring(0, i + 1).replace(/\n/g, '<br>') + '<span class="typing-cursor"></span>';
            i++;
            setTimeout(type, 50);
        } else {
            textContainer.innerHTML = storyText.replace(/\n/g, '<br>');
            skipBtn.classList.remove('hidden');
        }
    }
    
    setTimeout(type, 500);
    
    skipBtn.onclick = () => {
        modal.classList.add('hidden');
        localStorage.setItem('prologue_shown', 'true');
        // Trigger music play here to ensure it bypasses browser autoplay block
        if (!isMusicMuted && elements.bgMusic.paused) {
            elements.bgMusic.play().catch(e => console.log("Music play blocked:", e));
        }
    };
}

// Start the app
showPrologue();

// Global Modal Background Click to Close
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        // Don't close Auth Modal or Levelup Modal or Prologue by clicking background (to prevent accidental loss)
        if (e.target.id === 'auth-modal' || e.target.id === 'levelup-modal' || e.target.id === 'prologue-modal') return;
        e.target.classList.add('hidden');
    }
});
// --- Idle Auto-Logout Logic ---
let idleTimer;
const IDLE_LIMIT = 2 * 60 * 60 * 1000; // 2 hours in ms

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

// Global activity listeners
['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll'].forEach(evt => {
    window.addEventListener(evt, resetIdleTimer);
});

// Initial start
resetIdleTimer();
