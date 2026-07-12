// Google Apps Script API 端點
const GAS_URL = "請將這裡替換為您的 Google Apps Script Web App 部署網址";

/**
 * 從 GAS 取得學生被指派的任務清單
 * @param {string} email 學生 Email
 */
export async function fetchMyTasks(email) {
    if (!email || GAS_URL.includes("請將這裡替換")) return [];
    
    try {
        const response = await fetch(`${GAS_URL}?action=getTasks&email=${encodeURIComponent(email)}`);
        const result = await response.json();
        if (result.status === 'success') {
            return result.data; // 返回任務陣列
        } else {
            console.error('Error fetching tasks:', result.message);
            return [];
        }
    } catch (error) {
        console.error('Fetch tasks failed:', error);
        return [];
    }
}

/**
 * 儲存練習紀錄至 GAS
 * @param {Object} recordData 包含 email, subject, score, correctRate 等資料
 */
export async function saveRecordToGAS(recordData) {
    if (GAS_URL.includes("請將這裡替換")) return false;

    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors', // 由於跨網域限制且無需等待 GAS 詳細回應，使用 no-cors
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'saveRecord',
                data: recordData
            })
        });
        
        // no-cors 下無法讀取 response.json()，但只要沒 throw error 就視為發送成功
        return true;
    } catch (error) {
        console.error('Save record failed:', error);
        return false;
    }
}
