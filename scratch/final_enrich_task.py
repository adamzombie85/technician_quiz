import json
import os
import time
import google.generativeai as genai
import re

# API 設定
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise ValueError("請在 .env 檔案中設定 GEMINI_API_KEY，或設定環境變數。")

genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash-lite')

def enrich_questions(questions):
    to_enrich = [q for q in questions if not q.get('explanation')]
    if not to_enrich:
        return questions

    print(f"開始補全 {len(to_enrich)} 題...")
    batch_size = 20
    for i in range(0, len(to_enrich), batch_size):
        batch = to_enrich[i:i+batch_size]
        print(f"正在處理 {i+1} ~ {min(i+batch_size, len(to_enrich))} 題...")
        
        prompt = """
        你是一個專業的特教老師，請幫我補全以下「技術士技能檢定共同科目」題庫的欄位。
        內容對象是「高中階段心智障礙學生」，請根據題目和答案，為每一題產生：
        1. "knowledge_tag": 知識分類 (4字以內)
        2. "explanation": 極白話詳解 (1~2句，親切、生活化、多用比喻)
        3. "keyword_tag": 核心名詞 (如: 勞基法)
        
        回傳格式必須是 JSON 陣列，順序與輸入一致。
        """
        for j, q in enumerate(batch):
            prompt += f"\n[{j+1}] 題目: {q['question']}\n選項: {q['options']}\n答案: {q['answer']}\n"

        for attempt in range(3):
            try:
                response = model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        response_mime_type="application/json",
                    )
                )
                enriched_batch = json.loads(response.text)
                for idx, enriched_item in enumerate(enriched_batch):
                    if idx < len(batch):
                        batch[idx]['knowledge_tag'] = enriched_item.get('knowledge_tag', '')
                        batch[idx]['explanation'] = enriched_item.get('explanation', '')
                        batch[idx]['keyword_tag'] = enriched_item.get('keyword_tag', '')
                break
            except Exception as e:
                print(f"  ⚠️ 失敗，重試中 ({attempt+1}): {e}")
                time.sleep(5)
        
        time.sleep(1)
        
    return questions

if __name__ == "__main__":
    new_path = "/Users/nelly/Documents/丙級檢定練習網站/[共同科目題庫] 丙級共同科目_new.json"
    final_path = "/Users/nelly/Documents/丙級檢定練習網站/[共同科目題庫] 丙級共同科目_final.json"
    out_path = "/Users/nelly/Documents/丙級檢定練習網站/[共同科目題庫] 丙級共同科目_merged.json"

    with open(new_path, 'r', encoding='utf-8') as f:
        new_data = json.load(f)
    
    if os.path.exists(final_path):
        with open(final_path, 'r', encoding='utf-8') as f:
            try: final_data = json.load(f)
            except: final_data = []
    else:
        final_data = []

    # 補全
    enriched_data = enrich_questions(new_data)
    
    # 合併
    final_map = {(item['category'], re.sub(r'\s+', '', item['question'])): item for item in final_data}
    merged = []
    for item in enriched_data:
        key = (item['category'], re.sub(r'\s+', '', item['question']))
        merged.append(final_map.get(key, item))
            
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
    
    print(f"🎉 補全與合併完成！總計 {len(merged)} 題。")
