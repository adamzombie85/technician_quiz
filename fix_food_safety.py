import json
import os
import time
import google.generativeai as genai

API_KEY = "AIzaSyBRzTGmiQumEyx6Y6xya2sr3-73f8aSGKY"

def setup_gemini():
    genai.configure(api_key=API_KEY)
    test_models = ['gemini-1.5-flash', 'gemini-2.0-flash-lite-preview-02-05']
    for model_name in test_models:
        try:
            model = genai.GenerativeModel(model_name)
            model.generate_content("Hi", generation_config={"max_output_tokens": 1})
            return model
        except Exception:
            continue
    return genai.GenerativeModel('gemini-flash-latest')

def process_batch(model, batch_data):
    minimal_input = []
    for item in batch_data:
        correct_ans = "未知"
        try:
            correct_ans = item["options"][int(item["answer"]) - 1]
        except:
            pass
        minimal_input.append({
            "idx": item["question"], # Using question text as unique identifier
            "q": item.get("question", ""),
            "a": correct_ans
        })

    prompt = f"""
    你現在是一位台灣的高職綜職科（特教）老師。請協助補全題目標籤與詳解。
    對象：高中階段心智障礙學生。口吻：親切、白話、使用生活化比喻。
    
    任務：針對每題回傳 JSON 格式如下：
    - idx (絕對索引): 請回傳傳入的 idx（題目文字）。
    - kw (keyword_tag): 1 個核心名詞（如：食品中毒）。
    - kn (knowledge_tag): 知識分類，4 字以內（如：食品安全）。
    - ex (explanation): 1-2 句極白話詳解。
    
    輸入資料：
    {json.dumps(minimal_input, ensure_ascii=False)}
    
    請只回傳包含 idx, kw, kn, ex 欄位的純 JSON 陣列。
    """
    
    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
            )
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"\nAPI 出錯: {e}")
        return None

def main():
    target_file = "[共同科目題庫] 食品安全衛生及營養相關職類.json"
    print(f"Reading {target_file}...")
    
    with open(target_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    # The 50 wrong keyword tags identified from apply_enrichment.py
    wrong_tags = {
        "傷口處理", "洗手衛生", "濕手處理", "工作鞋", "洗手台", "病媒防治", "清潔劑", 
        "冰箱溫度", "溫度計", "先進先出", "生熟區分", "地面排水", "廢棄物", "工作服", 
        "水質規範", "病患禁業", "交叉污染", "洗滌槽", "洗手設施", "環境清潔", "照明亮度", 
        "通風設備", "儲物空間", "洗手間", "清潔用品", "病媒管制", "化學品", "健康檢查", 
        "工作禁忌", "指甲修剪", "口罩規範", "洗手七字訣", "酒精噴灑", "圍裙整潔", "不適通報", 
        "诺羅病防", "水源安全", "冷藏標準", "冷凍標準", "除霜作業", "冷鏈中斷", "防鼠設施", 
        "油脂截留", "洗滌劑", "消毒比例", "廢棄物桶", "儲存分層", "乾倉通風", "抹布管理", "個人飲水"
    }

    # Also wrong tags might have mismatched from the batch.
    # To be safe, let's target the exact questions that we know are in this range
    # Find the indices of questions that have mismatched explanations.
    
    wrong_items_indices = []
    for i, item in enumerate(data):
        if item.get("keyword_tag") in wrong_tags:
            # Let's verify it is actually one of the food poisoning or related questions
            wrong_items_indices.append(i)

    if not wrong_items_indices:
        print("找不到需要修復的題目。")
        return

    print(f"找到 {len(wrong_items_indices)} 題需要修正的題目，正在使用 Gemini API 重新生成詳解...")
    
    model = setup_gemini()
    
    BATCH_SIZE = 25
    for i in range(0, len(wrong_items_indices), BATCH_SIZE):
        batch_indices = wrong_items_indices[i:i+BATCH_SIZE]
        batch_data = [data[idx] for idx in batch_indices]
        
        print(f"Processing batch {i//BATCH_SIZE + 1}...")
        enriched = process_batch(model, batch_data)
        
        if enriched:
            for res in enriched:
                q_text = res.get("idx")
                # find the item
                for idx in batch_indices:
                    if data[idx]["question"] == q_text:
                        data[idx]["keyword_tag"] = res.get("kw", "")
                        data[idx]["knowledge_tag"] = res.get("kn", "")
                        data[idx]["explanation"] = res.get("ex", "")
                        break
        time.sleep(2)

    with open(target_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    print(f"✅ {target_file} 已修復！")
    
    print("正在重新產生 quiz_database.csv...")
    os.system("python3 convert_to_csv.py")
    print("✅ quiz_database.csv 已更新，修復完成！")

if __name__ == "__main__":
    main()
