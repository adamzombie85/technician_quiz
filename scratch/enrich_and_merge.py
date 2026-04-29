import json
import os
import time
import google.generativeai as genai
import re

# API 設定
API_KEY = "AIzaSyBRzTGmiQumEyx6Y6xya2sr3-73f8aSGKY" 
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash-8b')

def enrich_questions(questions):
    # 篩選出需要補全的題目 (explanation 為空)
    to_enrich = [q for q in questions if not q.get('explanation')]
    if not to_enrich:
        print("所有題目皆已具備詳解，無需補全。")
        return questions

    print(f"共有 {len(to_enrich)} 題需要補全詳解與標籤。")
    
    # 批次處理，每次 10 題
    batch_size = 10
    for i in range(0, len(to_enrich), batch_size):
        batch = to_enrich[i:i+batch_size]
        print(f"正在處理第 {i+1} 到 {min(i+batch_size, len(to_enrich))} 題...")
        
        prompt = """
        你是一個專業的特教老師，請幫我補全以下「技術士技能檢定共同科目」題庫的欄位。
        請根據題目和答案，為每一題產生：
        1. "knowledge_tag": 知識分類 (4字以內)
        2. "explanation": 適合高中階段特教學生閱讀的「極白話詳解」(1~2句，口吻親切、生活化、多用比喻)
        3. "keyword_tag": 核心名詞 (如: 勞動基準法)
        
        回傳格式必須是 JSON 陣列，順序要與輸入一致。每個元素必須包含這三個欄位。
        
        待處理題目：
        """
        for j, q in enumerate(batch):
            prompt += f"\n[{j+1}] 題目: {q['question']}\n選項: {q['options']}\n答案: {q['answer']}\n"

        success = False
        for attempt in range(3):
            try:
                response = model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        response_mime_type="application/json",
                    )
                )
                enriched_batch = json.loads(response.text)
                
                # 將結果填回
                for idx, enriched_item in enumerate(enriched_batch):
                    if idx < len(batch):
                        batch[idx]['knowledge_tag'] = enriched_item.get('knowledge_tag', '')
                        batch[idx]['explanation'] = enriched_item.get('explanation', '')
                        batch[idx]['keyword_tag'] = enriched_item.get('keyword_tag', '')
                
                success = True
                break
            except Exception as e:
                print(f"  ⚠️ 嘗試 {attempt+1} 失敗: {e}")
                time.sleep(5)
        
        if not success:
            print("  ❌ 該批次補全失敗。")
        
        time.sleep(1) # 速率限制
        
    return questions

def merge_and_save(new_data, final_data, output_path):
    # 建立 final_data 的查找表
    final_map = {}
    for item in final_data:
        key = (item['category'], re.sub(r'\s+', '', item['question']))
        final_map[key] = item

    merged_results = []
    for item in new_data:
        key = (item['category'], re.sub(r'\s+', '', item['question']))
        if key in final_map:
            merged_results.append(final_map[key])
        else:
            merged_results.append(item)
            
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(merged_results, f, ensure_ascii=False, indent=2)
    return merged_results

if __name__ == "__main__":
    new_json_path = "/Users/nelly/Documents/丙級檢定練習網站/[共同科目題庫] 丙級共同科目_new.json"
    final_json_path = "/Users/nelly/Documents/丙級檢定練習網站/[共同科目題庫] 丙級共同科目_final.json"
    output_path = "/Users/nelly/Documents/丙級檢定練習網站/[共同科目題庫] 丙級共同科目_merged.json"

    with open(new_json_path, 'r', encoding='utf-8') as f:
        new_data = json.load(f)
    
    if os.path.exists(final_json_path):
        with open(final_json_path, 'r', encoding='utf-8') as f:
            final_data = json.load(f)
    else:
        final_data = []

    # 1. 補全
    enriched_data = enrich_questions(new_data)
    
    # 2. 合併
    merged_data = merge_and_save(enriched_data, final_data, output_path)
    
    print(f"🎉 補全與合併完成！總計 {len(merged_data)} 題，儲存至 {output_path}")
