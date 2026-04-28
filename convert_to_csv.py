import json
import csv
import os

def json_to_csv():
    files = [
        "[丙級學科題庫] 烘焙食品.json",
        "[丙級學科題庫] 中式麵食加工.json",
        "[丙級學科題庫] 飲料調製.json",
        "[共同科目題庫] 技術士技能檢定.json",
        "[共同科目題庫] 食品安全衛生及營養相關職類.json"
    ]
    
    output_file = 'quiz_database.csv'
    all_data = []

    for filename in files:
        if os.path.exists(filename):
            with open(filename, 'r', encoding='utf-8') as f:
                data = json.load(f)
                all_data.extend(data)
        else:
            print(f"Warning: {filename} not found.")

    if not all_data:
        print("No data found to convert.")
        return

    # Use csv.writer with quotechar and quoting to handle multiline text and commas
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
    
    print(f"Successfully created {output_file} with {len(all_data)} rows.")

if __name__ == "__main__":
    json_to_csv()
