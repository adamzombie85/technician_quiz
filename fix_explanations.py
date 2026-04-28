import json
import os
import time
import google.generativeai as genai

# 從 process_database.py 自動抓取 API_KEY
api_key = ""
try:
    with open('process_database.py', 'r', encoding='utf-8') as f:
        for line in f:
            if 'API_KEY =' in line and '"' in line:
                api_key = line.split('"')[1]
                break
except Exception as e:
    print(f"無法讀取 process_database.py: {e}")

if not api_key:
    print("❌ 找不到 API_KEY，請確認 process_database.py 內容。")
    exit(1)

def setup_gemini():
    test_models = ['gemini-1.5-flash-8b', 'gemini-1.5-flash-002', 'gemini-flash-latest']
    for model_name in test_models:
        try:
            m = genai.GenerativeModel(model_name)
            m.generate_content("Hi", generation_config={"max_output_tokens": 1})
            print(f"📡 已成功連線至模型: {model_name}")
            return m
        except Exception:
            continue
    print("⚠️ 找不到優先模型，將使用備案模型。")
    return genai.GenerativeModel('gemini-pro')

genai.configure(api_key=api_key)
model = setup_gemini()

BATCH_SIZE = 25

files = [
    "[丙級學科題庫] 飲料調製.json",
    "[丙級學科題庫] 中式麵食加工.json",
    "[共同科目題庫] 技術士技能檢定.json",
    "[共同科目題庫] 食品安全衛生及營養相關職類.json"
]

def process_batch(batch_data, start_idx):
    minimal_input = []
    for i, item in enumerate(batch_data):
        ans_idx = int(item["answer"]) - 1
        correct_ans = item["options"][ans_idx] if 0 <= ans_idx < len(item["options"]) else "未知"
        minimal_input.append({
            "idx": start_idx + i,
            "q": item.get("question", ""),
            "a": correct_ans,
            "old_ex": item.get("explanation", "")
        })

    prompt = f"""
    你是一個題庫校對系統，專門為「特教生（高中階段心智障礙學生）」檢查學科題庫的詳解。
    輸入資料會包含多個題目，每個題目有題號(idx)、題目(q)、正確答案(a)與目前的詳解(old_ex)。

    任務：
    1. 檢視 old_ex 是否合理且正確解釋了該題的答案。
    2. 由於這批題庫有「詳解錯置」的問題，如果 old_ex 看起來跟題目完全無關，或者解釋錯誤，請重新撰寫一個。
    3. 新詳解的要求：親切、白話、使用生活化比喻，1-2 句內。
    
    請只回傳 JSON 陣列格式如下（必須對應輸入的每一題）：
    [
      {{
        "idx": (對應的 idx),
        "is_corrected": true/false,
        "new_ex": "如果 is_corrected 為 true，這裡提供新詳解；否則留空字串"
      }},
      ...
    ]
    
    輸入資料：
    {json.dumps(minimal_input, ensure_ascii=False)}
    """
    
    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.2
            )
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"\nAPI 出錯: {e}")
        return None

for file_name in files:
    print(f"\n🚀 開始處理: {file_name}")
    if not os.path.exists(file_name):
        print(f"❌ 找不到檔案: {file_name}")
        continue
        
    with open(file_name, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    corrections = []
    total = len(data)
    
    for i in range(0, total, BATCH_SIZE):
        batch = data[i:i + BATCH_SIZE]
        print(f"⏳ {i + 1} ~ {min(i + BATCH_SIZE, total)} / {total} ... ", end="", flush=True)
        
        success = False
        for attempt in range(3):
            results = process_batch(batch, i)
            if results and len(results) == len(batch):
                result_map = {str(res.get("idx")): res for res in results}
                for j, item in enumerate(batch):
                    idx_str = str(i + j)
                    res = result_map.get(idx_str)
                    if res and res.get("is_corrected"):
                        old_ex = item.get("explanation", "")
                        new_ex = res.get("new_ex", "")
                        if new_ex:
                            item["explanation"] = new_ex
                            corrections.append({
                                "id": item["id"],
                                "question": item["question"],
                                "old": old_ex,
                                "new": new_ex
                            })
                success = True
                break
            else:
                print(f"!(Retry {attempt+1}) ", end="", flush=True)
                time.sleep(5)
                
        if success:
            print("OK!")
        else:
            print("FAIL. 可能是格式錯誤或速率限制。")
            break
            
        time.sleep(3) # 避免達到速率限制
        
    # 回寫 JSON
    with open(file_name, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    # 產生勘誤表
    txt_filename = file_name.replace(".json", "_勘誤.txt")
    with open(txt_filename, "w", encoding="utf-8") as f:
        f.write(f"=== {file_name} 勘誤表 ===\n")
        f.write(f"總共修正了 {len(corrections)} 題\n\n")
        for c in corrections:
            f.write(f"題號: {c['id']}\n")
            f.write(f"題目: {c['question']}\n")
            f.write(f"❌ 舊詳解: {c['old']}\n")
            f.write(f"✅ 新詳解: {c['new']}\n")
            f.write("-" * 40 + "\n")
            
    print(f"✅ 完成 {file_name}，修正了 {len(corrections)} 題，並產生 {txt_filename}")

print("\n🎉 全部處理完成！")
