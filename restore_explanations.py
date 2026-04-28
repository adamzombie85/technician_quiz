import json
import os

print("載入 unified_database_enriched.json...")
with open("unified_database_enriched.json", "r", encoding="utf-8") as f:
    enriched_data = json.load(f)

# 建立搜尋字典以提升效能
enriched_dict = {}
for item in enriched_data:
    subject = item.get("subject", "")
    q = item.get("question", "")
    # 使用 subject + question 作為 key
    key = f"{subject}_{q}"
    enriched_dict[key] = item

files = [
    "[丙級學科題庫] 飲料調製.json",
    "[丙級學科題庫] 中式麵食加工.json",
    "[共同科目題庫] 技術士技能檢定.json",
    "[共同科目題庫] 食品安全衛生及營養相關職類.json"
]

for file_name in files:
    print(f"\n🚀 開始處理: {file_name}")
    if not os.path.exists(file_name):
        print(f"❌ 找不到檔案: {file_name}")
        continue
        
    with open(file_name, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    corrections = []
    
    for item in data:
        subject = item.get("subject", "")
        q = item.get("question", "")
        key = f"{subject}_{q}"
        
        match = enriched_dict.get(key)
        if match:
            old_ex = item.get("explanation", "")
            new_ex = match.get("explanation", "")
            if old_ex != new_ex and new_ex:
                item["explanation"] = new_ex
                corrections.append({
                    "id": item["id"],
                    "question": q,
                    "old": old_ex,
                    "new": new_ex
                })
        else:
            print(f"⚠️ 找不到對應的題目: {q[:20]}")
            
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
