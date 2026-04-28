import { auth, loginUser, registerUser, loginWithGoogle, logoutUser, savePracticeRecord, getUserHistory } from './firebase_app.js';
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
        // 您的 Google Sheets CSV 連結
        csvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTa1GXkHoKnZZG27fAhQ9E3qGzbTJtTbpR4uYDGH3pFuHS9fZWXx77HHpEwHEVBcEJ7OuaJm4BidLHe/pub?output=csv',
        subjectMap: {
            'chinese_pasta': '[丙級學科題庫] 中式麵食加工',
            'beverage': '[丙級學科題庫] 飲料調製',
            'technical': '[共同科目題庫] 技術士技能檢定',
            'food_safety': '[共同科目題庫] 食品安全衛生及營養相關職類',
            'baking': '[丙級學科題庫] 烘焙食品'
        }
    }
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
    userStatus: document.getElementById('user-status'),
    authBtn: document.getElementById('auth-btn'),
    authModal: document.getElementById('auth-modal'),
    authEmail: document.getElementById('auth-email'),
    authPassword: document.getElementById('auth-password'),
    authSubmitBtn: document.getElementById('auth-submit-btn'),
    authToggleLink: document.getElementById('auth-toggle-link'),
    authError: document.getElementById('auth-error'),
    authTitle: document.getElementById('auth-title'),
    authGoogleBtn: document.getElementById('auth-google-btn'),
    leaderboardModal: document.getElementById('leaderboard-modal'),
    leaderboardBody: document.getElementById('leaderboard-body')
};

let isLoginMode = true;

// Initialize
elements.subjectSelect.addEventListener('change', handleSubjectChange);
elements.filterType.addEventListener('change', updateFilterOptions);
elements.startBtn.addEventListener('click', startQuiz);
elements.restartBtn.addEventListener('click', () => location.reload());
elements.retryWrongBtn.addEventListener('click', retryWrongQuestions);
elements.exportBtn.addEventListener('click', exportToText);

// Auth Setup
onAuthStateChanged(auth, (user) => {
    state.currentUser = user;
    const reqElements = document.querySelectorAll('.auth-required');
    if (user) {
        elements.userStatus.textContent = `勇者：${user.email.split('@')[0]}`;
        elements.authBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> 登出';
        reqElements.forEach(el => el.classList.remove('hidden'));
    } else {
        elements.userStatus.textContent = '未登入';
        elements.authBtn.innerHTML = '<i class="fas fa-user"></i> 登入/註冊';
        reqElements.forEach(el => el.classList.add('hidden'));
    }
});

window.toggleAuthModal = () => {
    if (state.currentUser) {
        logoutUser();
    } else {
        elements.authModal.classList.remove('hidden');
    }
};

elements.authToggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    elements.authTitle.innerHTML = isLoginMode ? '<i class="fas fa-user-circle"></i> 勇者登入' : '<i class="fas fa-user-plus"></i> 勇者註冊';
    elements.authSubmitBtn.textContent = isLoginMode ? '登入' : '註冊';
    elements.authToggleLink.textContent = isLoginMode ? '還沒有帳號？點此註冊' : '已經有帳號了？點此登入';
    elements.authError.textContent = '';
});

elements.authSubmitBtn.addEventListener('click', async () => {
    const email = elements.authEmail.value.trim();
    const password = elements.authPassword.value.trim();
    if (!email || password.length < 6) {
        elements.authError.textContent = '信箱格式錯誤或密碼太短(至少6碼)';
        return;
    }
    
    try {
        elements.authSubmitBtn.disabled = true;
        if (isLoginMode) {
            await loginUser(email, password);
        } else {
            await registerUser(email, password);
        }
        elements.authModal.classList.add('hidden');
        elements.authError.textContent = '';
        elements.authEmail.value = '';
        elements.authPassword.value = '';
    } catch (err) {
        elements.authError.textContent = '操作失敗：' + err.message;
    } finally {
        elements.authSubmitBtn.disabled = false;
    }
});

elements.authGoogleBtn.addEventListener('click', async () => {
    try {
        elements.authGoogleBtn.disabled = true;
        await loginWithGoogle();
        elements.authModal.classList.add('hidden');
        elements.authError.textContent = '';
    } catch (err) {
        elements.authError.textContent = 'Google 登入失敗：' + err.message;
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
    const targetSubjectName = state.config.subjectMap[val];

    try {
        elements.startBtn.disabled = true;
        elements.startBtn.textContent = '載入題庫中...';

        const response = await fetch(state.config.csvUrl);
        const csvText = await response.text();

        // Parse CSV text to objects
        const lines = csvText.split(/\r?\n/);
        const headers = parseCSVLine(lines[0]);

        const rawData = lines.slice(1).filter(l => l.trim()).map(line => {
            const values = parseCSVLine(line);
            return {
                subject: values[0],
                category: values[1],
                id: values[2],
                question: values[3],
                options: [values[4], values[5], values[6], values[7]],
                answer: parseInt(values[8]),
                knowledge_tag: values[9],
                explanation: values[10],
                keyword_tag: values[11]
            };
        });

        // 過濾出選擇的領域題目
        state.allQuestions = rawData.filter(q => q.subject === targetSubjectName);

        if (state.allQuestions.length === 0) {
            console.warn('找不到該領域題目，請檢查 Google Sheets 的 Subject 欄位是否正確。');
        }

        elements.subOptions.classList.remove('hidden');
        elements.startBtn.disabled = false;
        elements.startBtn.innerHTML = '<i class="fas fa-sword"></i> 開始練習';
        updateFilterOptions();
    } catch (err) {
        console.error('Failed to load questions:', err);
        alert('載入雲端題庫失敗，請檢查網路連接或 CSV 連結。');
        elements.startBtn.disabled = false;
        elements.startBtn.innerHTML = '<i class="fas fa-sword"></i> 開始練習';
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
}

function startQuiz() {
    const type = elements.filterType.value;
    const count = parseInt(elements.questionCount.value) || 20;

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

    // Shuffle and pick
    state.filteredQuestions = pool.sort(() => Math.random() - 0.5).slice(0, count);

    if (state.filteredQuestions.length === 0) {
        alert('此類別下無題目！');
        return;
    }

    state.currentQuestionIndex = 0;
    state.score = 0;
    state.wrongQuestions = [];
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
    elements.progress.textContent = `題目 ${state.currentQuestionIndex + 1} / ${state.filteredQuestions.length}`;
    elements.questionText.textContent = q.question;

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

    setTimeout(() => {
        state.currentQuestionIndex++;
        if (state.currentQuestionIndex < state.filteredQuestions.length) {
            showQuestion();
        } else {
            endQuiz();
        }
    }, 1000);
}

function triggerHitEffect() {
    elements.dragonSprite.classList.remove('dragon-idle');
    elements.dragonSprite.classList.add('dragon-hit');
    setTimeout(() => {
        elements.dragonSprite.classList.remove('dragon-hit');
        elements.dragonSprite.classList.add('dragon-idle');
    }, 400);
}

async function endQuiz() {
    clearInterval(state.timerInterval);
    const elapsedSecs = Math.floor((Date.now() - state.startTime) / 1000);
    const m = Math.floor(elapsedSecs / 60).toString().padStart(2, '0');
    const s = (elapsedSecs % 60).toString().padStart(2, '0');
    const elapsed = `${m}:${s}`;
    
    const scorePercent = Math.round((state.score / state.filteredQuestions.length) * 100);

    if (state.currentUser) {
        try {
            await savePracticeRecord({
                uid: state.currentUser.uid,
                email: state.currentUser.email,
                subject: state.config.subjectMap[state.selectedSubject] || '綜合練習',
                mode: elements.filterType.options[elements.filterType.selectedIndex].text,
                count: state.filteredQuestions.length,
                score: scorePercent,
                timeElapsed: elapsed
            });
            alert('成績已成功記錄到雲端！請點擊查看歷史紀錄。');
        } catch (e) {
            alert('成績寫入失敗，請確認資料庫權限設定！錯誤訊息：' + e.message);
        }
    }

    elements.quizScreen.classList.add('hidden');
    elements.resultScreen.classList.remove('hidden');

    elements.finalTime.textContent = elapsed;
    elements.finalScore.textContent = `${scorePercent}%`;

    if (scorePercent >= 80) {
        elements.victoryMessage.innerHTML = `<span style="color: var(--success)">恭喜勇者！你成功討伐了惡龍！</span>`;
        elements.dragonSprite.classList.add('dragon-die');
    } else {
        elements.victoryMessage.innerHTML = `<span style="color: var(--danger)">戰敗了... 惡龍的力量太強，再修煉一下吧！</span>`;
    }

    renderReview();
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
    state.startTime = Date.now();

    elements.resultScreen.classList.add('hidden');
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

window.showLeaderboard = async () => {
    if (!state.currentUser) {
        alert('請先登入！');
        return;
    }
    try {
        const records = await getUserHistory(state.currentUser.uid);
        if (records.length === 0) {
            elements.leaderboardBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">尚未有練習紀錄</td></tr>';
        } else {
            elements.leaderboardBody.innerHTML = records.map(r => `
                <tr>
                    <td>${r.email.split('@')[0]}</td>
                    <td>${r.subject.split('] ')[1]}</td>
                    <td>${r.mode.split(' (')[0]}</td>
                    <td>${r.count}</td>
                    <td style="color: var(--gold)">${r.score}%</td>
                </tr>
            `).join('');
        }
        elements.leaderboardModal.classList.remove('hidden');
    } catch (e) {
        alert('讀取歷史紀錄失敗: ' + e.message);
        console.error(e);
    }
};

document.getElementById('show-leaderboard-btn').addEventListener('click', window.showLeaderboard);
document.getElementById('show-leaderboard-result-btn').addEventListener('click', window.showLeaderboard);

window.setViewMode = (mode) => {
    document.getElementById('app').className = `mode-${mode}`;
};
