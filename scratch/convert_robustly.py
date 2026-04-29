import re
import json
import os

def parse_txt_robustly(txt_path, ref_json_path):
    with open(txt_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Load enrichment data
    enrich_map = {}
    if os.path.exists(ref_json_path):
        with open(ref_json_path, 'r', encoding='utf-8') as f:
            ref_data = json.load(f)
            for item in ref_data:
                q_norm = re.sub(r'\s+', '', item['question'])
                enrich_map[q_norm] = {
                    'kt': item.get('knowledge_tag', ''),
                    'ex': item.get('explanation', ''),
                    'kw': item.get('keyword_tag', '')
                }

    # Split into sections by Working Item headers
    sections = re.split(r'(\d{5,}\s+.*?工作項目\s+\d+：.*)', content)
    
    final_data = []
    subject = "[共同科目題庫] 技術士技能檢定"
    
    for i in range(1, len(sections), 2):
        header = sections[i]
        body = sections[i+1]
        
        # Extract category
        cat_match = re.search(r'(工作項目\s+\d+：.*)', header)
        category = cat_match.group(1).strip() if cat_match else "未分類"
        category = re.split(r'\s+', category)[0] + " " + re.split(r'\s+', category)[1] # Clean up

        # Normalize body: remove common noise
        # 1. Page numbers like "250. (4)" -> "50. (4)"
        # We look for \n followed by some digits then the real pattern
        body = re.sub(r'\n\d+(\d+\.\s*\()', r'\n\1', body)
        
        # Find all questions: ID. (ANS) TEXT
        # Pattern: look for digit. (digit) ... then everything until the next one
        q_pattern = re.compile(r'(\d+)\.\s*\(([\d\w])\)\s*([\s\S]*?)(?=\n\s*\d+\.\s*\(|\n\d{5,}\s+.*?工作項目|\Z)')
        
        matches = q_pattern.findall(body)
        for q_id, q_ans, q_text in matches:
            # Clean text
            q_text = re.sub(r'\s+', ' ', q_text).strip()
            
            # Split options
            parts = re.split(r'([①-④])', q_text)
            if len(parts) >= 3:
                question = parts[0].strip()
                options = ["", "", "", ""]
                curr = -1
                for j in range(1, len(parts), 2):
                    marker = parts[j]
                    val = parts[j+1].strip() if j+1 < len(parts) else ""
                    if marker == '①': curr = 0
                    elif marker == '②': curr = 1
                    elif marker == '③': curr = 2
                    elif marker == '④': curr = 3
                    if curr != -1: options[curr] = val
            else:
                question = q_text
                options = ["", "", "", ""]

            # Enrichment
            q_norm = re.sub(r'\s+', '', question)
            enrich = enrich_map.get(q_norm, {'kt': '', 'ex': '', 'kw': ''})
            
            final_data.append({
                "subject": subject,
                "category": category,
                "id": int(q_id),
                "question": question,
                "options": options,
                "answer": int(q_ans) if q_ans.isdigit() else q_ans,
                "knowledge_tag": enrich['kt'],
                "explanation": enrich['ex'],
                "keyword_tag": enrich['kw']
            })

    return final_data

if __name__ == "__main__":
    txt = "/Users/nelly/Documents/丙級檢定練習網站/丙級檢定共同科目.txt"
    ref = "/Users/nelly/Documents/丙級檢定練習網站/[共同科目題庫] 技術士技能檢定.json"
    out = "/Users/nelly/Documents/丙級檢定練習網站/[共同科目題庫] 丙級共同科目_final.json"
    
    results = parse_txt_robustly(txt, ref)
    # Dedup by category + ID
    unique_results = []
    seen = set()
    for r in results:
        key = (r['category'], r['id'])
        if key not in seen:
            unique_results.append(r)
            seen.add(key)
            
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(unique_results, f, ensure_ascii=False, indent=2)
    print(f"DONE: {len(unique_results)} items.")
