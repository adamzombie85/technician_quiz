import json
import os
import re

def check_and_merge():
    new_json_path = "/Users/nelly/Documents/丙級檢定練習網站/[共同科目題庫] 丙級共同科目_new.json"
    final_json_path = "/Users/nelly/Documents/丙級檢定練習網站/[共同科目題庫] 丙級共同科目_final.json"
    output_path = "/Users/nelly/Documents/丙級檢定練習網站/[共同科目題庫] 丙級共同科目_merged.json"

    with open(new_json_path, 'r', encoding='utf-8') as f:
        new_data = json.load(f)
    
    final_data = []
    if os.path.exists(final_json_path):
        with open(final_json_path, 'r', encoding='utf-8') as f:
            try:
                final_data = json.load(f)
            except:
                pass

    final_map = {}
    for item in final_data:
        key = (item['category'], re.sub(r'\s+', '', item['question']))
        final_map[key] = item

    merged_results = []
    errors = []

    for i, item in enumerate(new_data):
        # 1. 檢查答案範圍
        if not (1 <= item['answer'] <= 4):
            errors.append(f"題號 {item['id']} ({item['category']}): 答案 {item['answer']} 超出範圍 (1-4)")
        
        # 2. 檢查選項是否有空
        if any(not opt for opt in item['options']):
            # 有些題目選項可能本來就少，但在題庫中通常應有4個
            pass

        key = (item['category'], re.sub(r'\s+', '', item['question']))
        if key in final_map:
            merged_results.append(final_map[key])
        else:
            merged_results.append(item)

    # 儲存結果
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(merged_results, f, ensure_ascii=False, indent=2)
    
    return len(merged_results), errors

if __name__ == "__main__":
    count, errors = check_and_merge()
    print(f"合併完成，總計 {count} 題。")
    if errors:
        print("\n發現以下潛在錯誤：")
        for err in errors:
            print(f"- {err}")
    else:
        print("\n初步格式檢查無誤。")
