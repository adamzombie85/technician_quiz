import json
import os
import time
import google.generativeai as genai
from typing import List, Dict

API_KEY = "AIzaSyBRzTGmiQumEyx6Y6xya2sr3-73f8aSGKY"

def setup_gemini():
    genai.configure(api_key=API_KEY)
    # 擴大嘗試範圍，包含 2.0 輕量版和正確的 1.5 名稱
    test_models = [
        'gemini-1.5-flash', 
        'gemini-2.0-flash-lite-preview-02-05',
        'gemini-1.5-flash-002', 
        'gemini-1.5-flash-8b'
    ]
    for model_name in test_models:
        try:
            model = genai.GenerativeModel(model_name)
            model.generate_content("Hi", generation_config={"max_output_tokens": 1})
            print(f"📡 已成功連線至模型: {model_name}")
            return model
        except Exception as e:
            # print(f"❌ {model_name} 無法使用: {e}")
            continue
    
    print("⚠️ 找不到優先模型，將使用備案模型。")
    return genai.GenerativeModel('gemini-flash-latest')

BATCH_SIZE = 30

def process_batch(model, batch_data: List[Dict], indices: List[int]) -> List[Dict]:
    minimal_input = []
    for item, idx in zip(batch_data, indices):
        correct_ans = ""
        try:
            correct_ans = item["options"][item["answer"] - 1]
        except:
            correct_ans = "未知"
        minimal_input.append({
            "idx": idx,
            "q": item.get("question", ""),
            "a": correct_ans
        })

    prompt = f"""
    你現在是一位台灣的高職綜職科（特教）老師。請協助補全題目標籤與詳解。
    對象：高中階段心智障礙學生。口吻：親切、白話、使用生活化比喻。
    
    任務：針對每題回傳 JSON 格式如下：
    - idx (絕對索引): 請回傳傳入的 idx。
    - kw (keyword_tag): 1 個核心名詞（如：冷水麵）。
    - kn (knowledge_tag): 知識分類，4 字以內（如：工具辨識）。
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
        enriched_results = json.loads(response.text)
        return enriched_results
    except Exception as e:
        print(f"\nAPI 出錯: {e}")
        return None

def main():
    model = setup_gemini()
    output_file = "unified_database_enriched.json"
    
    with open(output_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 檢查是否還有殘留的「雞蛋」或「吊白塊」錯誤 (針對 551-750 區段)
    count = 0
    for i in range(551, 751):
        if i < len(data):
            exp = str(data[i].get("explanation", ""))
            if "雞蛋放久了" in exp or "吊白塊是一種很毒" in exp:
                data[i]["keyword_tag"] = ""
                data[i]["knowledge_tag"] = ""
                data[i]["explanation"] = ""
                count += 1
    if count > 0: print(f"🧹 已自動清理 {count} 題先前損壞的資料。")

    unprocessed_indices = []
    for i, item in enumerate(data):
        if not item.get("explanation") or len(str(item.get("explanation")).strip()) == 0:
            unprocessed_indices.append(i)

    total_unprocessed = len(unprocessed_indices)
    print(f"✅ 剩餘 {total_unprocessed} 題。使用 1.5 Flash 優化模式。")
    
    if total_unprocessed == 0:
        print("🎉 全部完成！")
        return

    for i in range(0, total_unprocessed, BATCH_SIZE):
        batch_indices = unprocessed_indices[i:i + BATCH_SIZE]
        batch_data = [data[idx] for idx in batch_indices]
        
        print(f"⏳ {i + 1} ~ {min(i + BATCH_SIZE, total_unprocessed)} / {total_unprocessed} ... ", end="", flush=True)
        
        success = False
        for attempt in range(3):
            enriched_results = process_batch(model, batch_data, batch_indices)
            if enriched_results:
                result_map = {res.get("idx"): res for res in enriched_results if "idx" in res}
                for idx in batch_indices:
                    res = result_map.get(idx)
                    if res:
                        data[idx]["keyword_tag"] = res.get("kw", "")
                        data[idx]["knowledge_tag"] = res.get("kn", "")
                        data[idx]["explanation"] = res.get("ex", "")
                success = True
                break
            else:
                print(f"!(Retry {attempt+1}) ", end="", flush=True)
                time.sleep(10)
                
        if success:
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print("OK!")
        else:
            print("FAIL. Quota 可能已乾涸。")
            break
            
        time.sleep(10)

    print("\n🎉 處理結束。")

if __name__ == "__main__":
    main()
