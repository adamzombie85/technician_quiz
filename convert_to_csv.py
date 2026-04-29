import json
import csv
import os

def json_to_csv():
    # 更新為目前的 5 個題庫檔案名稱
    files = [
        "[丙級學科題庫] 烘焙食品.json",
        "[丙級學科題庫] 中式麵食加工.json",
        "[丙級學科題庫] 飲料調製.json",
        "[共同科目題庫] 職業安全衛生.json",
        "[共同科目題庫] 食品安全衛生及營養相關職類.json"
    ]
    
    output_file = 'quiz_database.csv'
    all_data = []

    for filename in files:
        if os.path.exists(filename):
            print(f"正在讀取：{filename}...")
            with open(filename, 'r', encoding='utf-8') as f:
                data = json.load(f)
                all_data.extend(data)
        else:
            print(f"⚠️ 找不到檔案：{filename}")

    if not all_data:
        print("❌ 沒有可轉換的資料。")
        return

    # 輸出 CSV (使用 UTF-8-SIG 確保 Google Sheets 開啟不亂碼)
    with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
        header = ["Subject", "Category", "ID", "Question", "Option1", "Option2", "Option3", "Option4", "Answer", "KnowledgeTag", "Explanation", "KeywordTag"]
        writer.writerow(header)
        
        for item in all_data:
            options = item.get("options", ["", "", "", ""])
            while len(options) < 4:
                options.append("")
            
            row = [
                item.get("subject", ""),
                item.get("category", ""),
                item.get("id", ""),
                item.get("question", ""),
                options[0],
                options[1],
                options[2],
                options[3],
                item.get("answer", ""),
                item.get("knowledge_tag", ""),
                item.get("explanation", ""),
                item.get("keyword_tag", "")
            ]
            writer.writerow(row)
    
    print(f"\n✅ 轉換成功！已建立 {output_file}，共計 {len(all_data)} 題。")

if __name__ == "__main__":
    json_to_csv()
