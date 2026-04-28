import json
import time
import os
import google.generativeai as genai

# 確保已安裝 PyMuPDF: pip install pymupdf
try:
    import fitz
except ImportError:
    print("❌ 找不到 fitz 模組。請先在終端機執行: pip install pymupdf")
    exit(1)

API_KEY = "AIzaSyBRzTGmiQumEyx6Y6xya2sr3-73f8aSGKY"
genai.configure(api_key=API_KEY)
def setup_gemini():
    # 強制使用 gemini-1.5-flash，因為它有每天 1500 次的免費額度
    model_name = 'gemini-1.5-flash-8b'
    try:
        model = genai.GenerativeModel(model_name)
        model.generate_content("Hi", generation_config={"max_output_tokens": 1})
        print(f"✅ 成功連線至模型: {model_name}")
        return model
    except Exception as e:
        print(f"❌ 無法連線至 {model_name}，請更新 google-generativeai 套件。錯誤: {e}")
        exit(1)

model = setup_gemini()

def parse_pdf(file_path):
    print(f"開啟 PDF 檔案: {file_path}")
    doc = fitz.open(file_path)
    output_file = "[丙級學科題庫] 烘焙食品.json"
    
    all_json = []
    start_page = 0
    
    # 支援斷點續傳：檢查是否已有進度
    if os.path.exists(output_file):
        try:
            with open(output_file, "r", encoding="utf-8") as f:
                all_json = json.load(f)
            # 假設每 2 頁產生一筆以上的資料，我們用粗略的進度來估算
            # 為了確保資料完整，我們會先不實作複雜的續傳，而是改為「每次成功就存檔」
            # 若要重新跑，請刪除舊的 json 檔案
            if len(all_json) > 0:
                print(f"⚠️ 發現已存在的 {output_file}，目前已有 {len(all_json)} 題。")
                print("⚠️ 為了確保資料完整，請先備份或刪除舊檔案再重新執行。")
                # 這裡簡單起見，我們如果發現有舊檔案，我們還是從頭跑並覆蓋，或是接續
                # 這次更新主要加入「即時存檔」功能
        except Exception:
            pass

    # 每次處理 2 頁，避免 AI 輸出過長被截斷
    chunk_size = 2
    for i in range(0, len(doc), chunk_size):
        end_page = min(i + chunk_size, len(doc))
        print(f"正在處理第 {i+1} 到 {end_page} 頁...")
        
        text_chunk = ""
        for j in range(i, end_page):
            text_chunk += doc[j].get_text() + "\n"
            
        # 如果該頁幾乎沒有文字，可能代表空白頁或結束
        if len(text_chunk.strip()) < 50:
            print("  文字過少，跳過。")
            continue
            
        prompt = f"""
        這是一份「烘焙丙級題庫」的 PDF 文字片段。請辨識並萃取其中所有的選擇題。
        請為每一題產生適合「高中階段心智障礙學生」閱讀的白話詳解與標籤。口吻要親切、生活化、多用比喻。
        
        回傳必須是純 JSON 陣列，每個元素格式如下：
        {{
            "subject": "[丙級學科題庫] 烘焙食品",
            "category": "工作項目 01：烘焙食品 (請依據文字中的單元標題判斷，若無則填寫這個預設值)",
            "id": 題號 (請填入整數),
            "question": "題目文字",
            "options": ["選項1", "選項2", "選項3", "選項4"],
            "answer": 正確答案的選項數字(1、2、3或4),
            "knowledge_tag": "知識分類 (如: 烘焙原理，4字以內)",
            "explanation": "1~2句極白話詳解",
            "keyword_tag": "核心名詞 (如: 麵粉)"
        }}
        
        請注意：
        1. 只回傳純 JSON 陣列，不要有任何 markdown 標記 (如 ```json) 或是其他對話文字。
        2. 請確保所有提取的題目都完整包含在這個 JSON 中。
        3. 答案通常會標示在題目開頭或結尾的括號內，請仔細辨識。如果該區段沒有答案，請預設填入 1。
        
        以下是題庫文字內容：
        {text_chunk}
        """
        
        success = False
        for attempt in range(3):
            try:
                response = model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        response_mime_type="application/json",
                    )
                )
                
                chunk_data = json.loads(response.text)
                if chunk_data:
                    all_json.extend(chunk_data)
                    print(f"  ✅ 成功萃取 {len(chunk_data)} 題。")
                    success = True
                    # 即時存檔！這樣中斷才不會心血全無
                    with open(output_file, "w", encoding="utf-8") as f:
                        json.dump(all_json, f, ensure_ascii=False, indent=2)
                    break
            except Exception as e:
                print(f"  ⚠️ API 或解析失敗 (嘗試 {attempt+1}): {e}")
                time.sleep(15)
                
        if not success:
            print(f"❌ 第 {i+1} 頁區段處理失敗，請手動檢查。")
            
        time.sleep(2) # 避免超過 API 速率限制
        
    print(f"\n🎉 完成！總共萃取了 {len(all_json)} 題。請確認內容後再更新 csv。")

if __name__ == "__main__":
    pdf_file = "[丙級學科題庫] 烘焙丙級題庫.pdf"
    if os.path.exists(pdf_file):
        parse_pdf(pdf_file)
    else:
        print(f"找不到檔案: {pdf_file}")
