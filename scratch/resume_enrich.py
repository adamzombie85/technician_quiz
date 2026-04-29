import json
import os
import time
import google.generativeai as genai
import re

# API 設定
API_KEY = "AIzaSyDbL8UW3EXRivDTU3w8BO8seFgZzXcizEg" 
genai.configure(api_key=API_KEY)
# 更換模型為 gemini-pro-latest 以避開剛才耗盡的額度
model = genai.GenerativeModel('gemini-pro-latest')

def enrich_questions(questions):
    to_enrich = [q for q in questions if not q.get('explanation') or len(q.get('explanation')) < 5]
    if not to_enrich:
        print("所有題目皆已補全。")
        return questions

    print(f"剩餘 {len(to_enrich)} 題需要補全...")
    batch_size = 10 # 縮小批次以增加穩定性
    for i in range(0, len(to_enrich), batch_size):
        batch = to_enrich[i:i+batch_size]
        print(f"正在補全第 {i+1} ~ {min(i+batch_size, len(to_enrich))} 題...")
        
        prompt = """
        作為特教老師，請為以下題目補全：
        1. "knowledge_tag": 知識分類 (4字內)
        2. "explanation": 極白話詳解 (1~2句，親切生活化)
        3. "keyword_tag": 核心名詞
        回傳 JSON 陣列。
        """
        for j, q in enumerate(batch):
            prompt += f"\n[{j+1}] {q['question']} (答:{q['answer']})\n"

        for attempt in range(3):
            try:
                response = model.generate_content(prompt, generation_config=genai.types.GenerationConfig(response_mime_type="application/json"))
                enriched_batch = json.loads(response.text)
                for idx, enriched_item in enumerate(enriched_batch):
                    if idx < len(batch):
                        batch[idx]['knowledge_tag'] = enriched_item.get('knowledge_tag', '')
                        batch[idx]['explanation'] = enriched_item.get('explanation', '')
                        batch[idx]['keyword_tag'] = enriched_item.get('keyword_tag', '')
                break
            except Exception as e:
                print(f"  重試中: {e}")
                time.sleep(10)
        
        # 即時存檔，防止中斷
        with open("/Users/nelly/Documents/Antigravity/丙級檢定練習網站/[共同科目題庫] 丙級共同科目_merged.json", 'w', encoding='utf-8') as f:
            json.dump(questions, f, ensure_ascii=False, indent=2)
            
        time.sleep(2)
    return questions

if __name__ == "__main__":
    path = "/Users/nelly/Documents/Antigravity/丙級檢定練習網站/[共同科目題庫] 丙級共同科目_merged.json"
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    enrich_questions(data)
    print("🎉 補全作業已成功完成並儲存。")
