# Antigravity Skill Document: Warrior Quiz System (勇者題庫系統)

本文件定義了「勇者題庫系統」的專案規範、架構邏輯與 UI/UX 標準，供 Antigravity 在後續開發與維護時遵循。

## 1. 專案核心願景 (Core Vision)
一個結合「RPG 戰鬥」、「掛機經營」與「國家考試題庫」的學習平台。目標是透過遊戲化（Gamification）降低練習枯燥感，並提供頂級的視覺體驗。

## 2. 技術棧 (Tech Stack)
- **Frontend**: Vanilla HTML5, JavaScript (ES Modules), CSS3 (Modern Features).
- **Backend/DB**: Firebase (Authentication, Firestore).
- **Assets**: Google Fonts (Inter, Outfit, Iansui), FontAwesome 6.
- **Logic**: 純 JS 狀態管理 (`state` object), 非同步資料讀取與快取。

---

## 3. UI/UX 設計規範 (Design System)

### 3.1 視覺風格
- **風格關鍵字**: Apple-style, Glassmorphism (玻璃擬態), Premium, Clean.
- **配色方案**:
  - 主色: `var(--accent)` (動態調整), `var(--gold)` (`#ffd700`).
  - 背景: 深色模式優先，使用半透明層次 (`rgba(255, 255, 255, 0.05)`).
  - 字體: 中文使用 `Iansui` (開源字體), 英文數字使用 `Inter` 或 `Outfit`.
- **圓角**: 大圓角 `1.5rem` (24px) 或 `2rem` (32px).

### 3.2 互動反饋
- **Toast 通知**: 替代原生 `alert()`，使用自定義的 Toast 系統。
- **動畫**: 
  - 進入動畫: `slide-up`, `fade-in`.
  - 戰鬥動畫: `hero-slash`, `monster-hit`, `dragon-die`.
  - 懸停效果: `scale(1.05)`, `brightness(1.2)`.

---

## 4. 系統架構邏輯 (System Logic)

### 4.1 題庫系統 (Quiz Engine)
- **資料結構**: JSON 格式，包含 `id`, `question`, `options`, `answer`, `explanation`, `category`, `knowledge_tag`.
- **載入機制**: 支援 `fetchWithRetry` 與 LocalStorage `CACHE_VERSION` 版本管理。
- **出題邏輯**:
  - 加權排序: 優先出現練習次數較少的題目。
  - 選項隨機: 每次顯示時選項順序隨機化（Fisher-Yates Shuffle）。

### 4.2 RPG 戰鬥與獎勵
- **怪物系統**: 隨機從 `monsterPool` 挑選，包含不同 HP、Icon 與代表色。
- **HP 邏輯**: 答對扣怪物 HP，答錯扣勇者 HP。
- **獎勵**: 結算時根據答對率給予 `gold` 與名畫碎片 (`paintings`)。

### 4.3 領地與經營 (Territory & Farm)
- **領地解鎖**: 累計答題數達到閾值（如 100 題）解鎖。
- **掛機產出**: 48 小時生產週期（雞蛋、牛奶），支援 Firebase 伺服器時間對時。
- **皇家廚房 (Royal Kitchen)**: 合成系統（如 雞蛋+牛奶 -> 皇家布丁）。
- **當鋪 (Pawn Shop)**: 物品與金幣的轉換中心。

---

## 5. Firebase 資料結構 (Firestore Schema)
- **`users/{uid}`**:
  - `profile`: `displayName`, `avatar`, `level`, `exp`, `gold`, `honorMessage`.
  - `stats`: `totalQuestions`, `totalTime`, `correctRate`.
  - `paintings`: 對象存儲名畫完成進度（布林陣列）。
  - `territory`: `isUnlocked`, `lastCollectionTime`, `resources` (egg, milk, pudding).
  - `questionStats`: 記錄各題練習次數。

---

## 6. Antigravity 開發原則 (Coding Principles)
1. **不使用佔位符**: 圖片需使用 `generate_image` 生成或使用現有素材。
2. **語義化 HTML**: 嚴格使用 `<section>`, `<article>`, `<header>`, `<footer>`.
3. **錯誤處理**: 網路請求必須包含 `try-catch` 與使用者友好的 Toast 提示。
4. **性能優先**: 避免大型依賴，盡量使用 Vanilla JS 達成複雜效果。
5. **SEO 友好**: 確保每個頁面有唯一的 `<h1>` 與 Meta Description。

---
*Last Updated: 2026-05-13*
