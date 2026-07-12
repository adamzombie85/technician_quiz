/**
 * 噍吧哖少年的奮鬥 - Google Apps Script 後端 API
 * 部署為 Web App 時，將權限設為「所有人」。
 */

const SPREADSHEET_ID = "請填入您的 Google Sheets ID"; // 例如：1BxiMVs0XRYFgCEb5...
const TASKS_SHEET_NAME = "教師任務名單";
const RECORDS_SHEET_NAME = "學生練習紀錄";

function initSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  if (!ss.getSheetByName(TASKS_SHEET_NAME)) {
    const sheet = ss.insertSheet(TASKS_SHEET_NAME);
    sheet.appendRow(["學生Email", "班級", "姓名", "指定題庫", "開始日期", "結束日期", "狀態"]);
  }
  
  if (!ss.getSheetByName(RECORDS_SHEET_NAME)) {
    const sheet = ss.insertSheet(RECORDS_SHEET_NAME);
    sheet.appendRow(["時間戳記", "學生Email", "測驗題庫", "得分", "正確率", "耗時(秒)", "獲得芒果幣", "是否為任務範圍"]);
  }
}

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'getTasks') {
    const email = e.parameter.email;
    if (!email) {
      return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Email missing'}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName(TASKS_SHEET_NAME);
      if (!sheet) throw new Error("Sheet not found");
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const tasks = [];
      
      const now = new Date();
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[0] === email) {
          const startDate = new Date(row[4]);
          const endDate = new Date(row[5]);
          
          // 判斷是否在任務期間內
          if (now >= startDate && now <= endDate) {
            tasks.push({
              subject: row[3],
              startDate: row[4],
              endDate: row[5],
              status: row[6]
            });
          }
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({status: 'success', data: tasks}))
        .setMimeType(ContentService.MimeType.JSON);
        
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({status: 'error', message: err.message}))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput("Ta-Pa-Ni API is running.");
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    
    if (payload.action === 'saveRecord') {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName(RECORDS_SHEET_NAME);
      if (!sheet) throw new Error("Records sheet not found");
      
      const data = payload.data;
      const timestamp = new Date();
      
      sheet.appendRow([
        timestamp,
        data.email,
        data.subject,
        data.score,
        data.correctRate,
        data.durationSec,
        data.coinsEarned,
        data.isTaskReward ? "是" : "否"
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({status: 'success'}))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: err.message}))
        .setMimeType(ContentService.MimeType.JSON);
  }
}
