import fitz
import re
import json
import os

def extract_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    full_text = ""
    for page in doc:
        full_text += page.get_text() + "\n"
    return full_text

def parse_content(content, existing_json_path=None):
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
    # Split by the major categories
    # 90006, 490007, 1090008, 1490009
    sections = re.split(r'(\d{5,}\s+.*?工作項目\s+\d+：.*)', content)
    
    results = []
    current_category = "未分類"
    
    for i in range(1, len(sections), 2):
        header = sections[i]
        body = sections[i+1]
        
        cat_match = re.search(r'(工作項目\s+\d+：.*)', header)
        if cat_match:
            current_category = cat_match.group(1).strip()
            # Clean up trailing garbage in category
            current_category = re.split(r'\s+', current_category)[0] + " " + re.split(r'\s+', current_category)[1]

        # Improved regex for questions: 
        # (Answer) Question Text Options
        # e.g. 1. (2) ... ①...②...③...④...
        # We handle multi-line by looking ahead for the next question number or next category
        q_pattern = re.compile(r'(\d+)\.\s*\(([\d\w])\)\s*([\s\S]*?)(?=\s*\n\d+\.\s*\(|\n\d{5,}\s+.*?工作項目|\Z)', re.MULTILINE)
        
        matches = q_pattern.findall(body)
        for m_id, m_ans, m_text in matches:
            results.append(finalize_question(int(m_id), int(m_ans), m_text, subject, current_category, enrichment_map))
            
    return results

def finalize_question(q_id, q_answer, text, subject, category, enrichment_map):
    text = re.sub(r'\s+', ' ', text).strip()
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
    pdf_file = "/Users/nelly/Documents/丙級檢定練習網站/技術士檢定共同科目.pdf"
    ref_json = "/Users/nelly/Documents/丙級檢定練習網站/[共同科目題庫] 技術士技能檢定.json"
    output_file = "/Users/nelly/Documents/丙級檢定練習網站/[共同科目題庫] 丙級共同科目_final.json"
    
    print(f"正在從 PDF 提取文字: {pdf_file}")
    content = extract_from_pdf(pdf_file)
    
    print("正在解析內容...")
    data = parse_content(content, ref_json)
    
    # Dedup
    unique_data = []
    seen = set()
    for item in data:
        key = (item['category'], item['id'])
        if key not in seen:
            unique_data.append(item)
            seen.add(key)
            
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(unique_data, f, ensure_ascii=False, indent=2)
    
    print(f"🎉 成功轉換 {len(unique_data)} 題至 {output_file}")
