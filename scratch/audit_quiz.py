import json
import re
import google.generativeai as genai

API_KEY = "AIzaSyDbL8UW3EXRivDTU3w8BO8seFgZzXcizEg"
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash-lite')

def audit_quiz(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 抽樣校對 (每 20 題抽一題)
    sample = data[::20]
    
    prompt = """
    你是一個嚴格的校對員，請檢查以下題庫資料是否有誤。
    特別檢查：
    1. 詳解 (explanation) 是否真的在解釋正確答案 (answer)？
    2. 題目與答案是否有錯位（例如題目問 A，答案給了 B 的解答）？
    
    請回傳檢查結果，若有錯誤請指出題號與修正建議；若無誤請回傳 "All samples are correct"。
    
    待檢查資料：
    """
    for q in sample:
        prompt += f"\n- 題號 {q['id']}: {q['question']}\n  選項: {q['options']}\n  正確答案索引: {q['answer']}\n  詳解: {q['explanation']}\n"

    try:
        response = model.generate_content(prompt)
        print("--- 二次校對結果 ---")
        print(response.text)
    except Exception as e:
        print(f"校對過程出錯: {e}")

    # 基本結構檢查
    for item in data:
        if not (1 <= item['answer'] <= len(item['options'])):
            print(f"❌ 嚴重錯誤: 題號 {item['id']} 的答案索引 {item['answer']} 超出選項範圍。")
        if not item['explanation'] or len(item['explanation']) < 5:
            print(f"⚠️ 警告: 題號 {item['id']} 的詳解太短或缺失。")

if __name__ == "__main__":
    audit_quiz("/Users/nelly/Documents/Antigravity/丙級檢定練習網站/[共同科目題庫] 丙級共同科目_merged.json")
