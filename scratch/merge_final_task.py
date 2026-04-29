import json
import re
import os

def merge_quiz():
    base_dir = "/Users/nelly/Documents/Antigravity/丙級檢定練習網站"
    path_common = f"{base_dir}/[共同科目題庫] 丙級共同科目.json"
    path_tech = f"{base_dir}/[共同科目題庫] 技術士技能檢定.json"
    output_path = f"{base_dir}/[共同科目題庫] 丙級共同科目_final_merged.json"

    if not os.path.exists(path_common) or not os.path.exists(path_tech):
        print("❌ 找不到來源檔案，請檢查路徑。")
        return

    with open(path_common, 'r', encoding='utf-8') as f:
        data_common = json.load(f)
    with open(path_tech, 'r', encoding='utf-8') as f:
        data_tech = json.load(f)

    # 建立技術士資料地圖（優先權高）
    def clean_q(text): return re.sub(r'\s+', '', text)
    tech_map = {clean_q(item['question']): item for item in data_tech}

    final_results = []
    seen_questions = set()

    # 1. 按照丙級共同科目的順序
    for item in data_common:
        q_clean = clean_q(item['question'])
        if q_clean in seen_questions:
            continue
        
        # 若技術士那邊有這題，用技術士的內容（含詳解）
        if q_clean in tech_map:
            final_results.append(tech_map[q_clean])
        else:
            final_results.append(item)
        seen_questions.add(q_clean)

    # 2. 補足技術士那邊有但丙級沒有的題目
    added_count = 0
    for q_clean, item in tech_map.items():
        if q_clean not in seen_questions:
            final_results.append(item)
            seen_questions.add(q_clean)
            added_count += 1

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(final_results, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 合併成功！")
    print(f"   - 總題數：{len(final_results)}")
    print(f"   - 新增題目：{added_count}")
    print(f"   - 儲存位置：{output_path}")

if __name__ == "__main__":
    merge_quiz()
