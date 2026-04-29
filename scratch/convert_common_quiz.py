import re
import json
import os

def parse_common_txt(txt_path, existing_json_path=None):
    with open(txt_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Build existing enrichment map if possible
    enrichment_map = {}
    if existing_json_path and os.path.exists(existing_json_path):
        with open(existing_json_path, 'r', encoding='utf-8') as f:
            try:
                existing_data = json.load(f)
                for item in existing_data:
                    q_norm = re.sub(r'\s+', '', item['question'])
                    enrichment_map[q_norm] = {
                        'knowledge_tag': item.get('knowledge_tag', ''),
                        'explanation': item.get('explanation', ''),
                        'keyword_tag': item.get('keyword_tag', '')
                    }
            except:
                pass

    subject = "[共同科目題庫] 技術士技能檢定"
    
    # Split content by category headers
    # e.g. 90006 職業安全衛生共同科目 不分級 工作項目 01：職業安全衛生
    sections = re.split(r'(\d{5,}\s+.*?工作項目\s+\d+：.*)', content)
    
    results = []
    current_category = "未分類"
    
    for i in range(1, len(sections), 2):
        header = sections[i]
        body = sections[i+1]
        
        # Extract category name
        cat_match = re.search(r'(工作項目\s+\d+：.*)', header)
        if cat_match:
            current_category = cat_match.group(1).strip()
        
        # Question pattern: N. (A) Question ①...②...③...④...
        # We look for digits followed by a dot, then (digit)
        # Using [\s\S]*? for non-greedy match of question content
        q_pattern = re.compile(r'(\d+)\.\s*(?:\d+\.)?\s*\((\d)\)\s*([\s\S]*?)(?=\n\d+\.\s*(?:\d+\.)?\(|\n\d{5,}\s+.*?工作項目|\Z)', re.MULTILINE)
        
        matches = q_pattern.findall(body)
        for m_id, m_ans, m_text in matches:
            real_id = int(m_id)
            if real_id > 1000: 
                real_id = real_id % 1000
                
            results.append(finalize_question(real_id, int(m_ans), m_text, subject, current_category, enrichment_map))
            
    return results

def finalize_question(q_id, q_answer, text, subject, category, enrichment_map):
    # Normalize text: remove line breaks and extra spaces
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Split by options markers
    parts = re.split(r'([①-④])', text)
    
    if len(parts) < 2:
        question_text = text
        options = ["", "", "", ""]
    else:
        question_text = parts[0].strip()
        options = ["", "", "", ""]
        current_opt_idx = -1
        for i in range(1, len(parts), 2):
            marker = parts[i]
            content = parts[i+1].strip() if i+1 < len(parts) else ""
            if marker == '①': current_opt_idx = 0
            elif marker == '②': current_opt_idx = 1
            elif marker == '③': current_opt_idx = 2
            elif marker == '④': current_opt_idx = 3
            if current_opt_idx != -1:
                options[current_opt_idx] = content

    # Lookup enrichment
    q_norm = re.sub(r'\s+', '', question_text)
    enrich = enrichment_map.get(q_norm, {'knowledge_tag': '', 'explanation': '', 'keyword_tag': ''})
    
    return {
        "subject": subject,
        "category": category,
        "id": q_id,
        "question": question_text,
        "options": options,
        "answer": q_answer,
        "knowledge_tag": enrich['knowledge_tag'],
        "explanation": enrich['explanation'],
        "keyword_tag": enrich['keyword_tag']
    }

if __name__ == "__main__":
    txt_file = "/Users/nelly/Documents/丙級檢定練習網站/丙級檢定共同科目.txt"
    ref_json = "/Users/nelly/Documents/丙級檢定練習網站/[共同科目題庫] 技術士技能檢定.json"
    output_file = "/Users/nelly/Documents/丙級檢定練習網站/[共同科目題庫] 丙級共同科目_new.json"
    
    print(f"開始解析 {txt_file}...")
    data = parse_common_txt(txt_file, ref_json)
    
    unique_data = []
    seen_keys = set()
    for item in data:
        key = (item['category'], item['id'])
        if key not in seen_keys:
            unique_data.append(item)
            seen_keys.add(key)
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(unique_data, f, ensure_ascii=False, indent=2)
    
    print(f"成功轉換 {len(unique_data)} 題至 {output_file}")
