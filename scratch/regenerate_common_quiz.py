import re
import json
import os

def parse_txt_to_json(txt_path, output_path):
    with open(txt_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split by categories like "90006 職業安全衛生共同科目 不分級 工作項目 01：職業安全衛生"
    sections = re.split(r'(\d{5,}\s+.*?工作項目\s+\d+：.*)', content)
    
    results = []
    current_category = "未分類"
    subject = "[共同科目題庫] 技術士技能檢定"

    for i in range(1, len(sections), 2):
        header = sections[i]
        body = sections[i+1]
        
        cat_match = re.search(r'(工作項目\s+\d+：.*)', header)
        if cat_match:
            current_category = cat_match.group(1).strip()
            # Try to get the subject code as well
            code_match = re.search(r'(\d{5,})', header)
            if code_match:
                current_category = f"({code_match.group(1)})" + current_category.split('：')[1].strip()

        # Find all questions in the body
        # Question format: "1. (2) ... ①... ②... ③... ④..."
        # Sometimes there are page numbers or weird prefixes like "377. (3)"
        # We use a robust regex to split questions.
        q_pattern = re.compile(r'(?:^\d+\.\s*)?(\d+)\.\s*\(([\d\w])\)\s*([\s\S]*?)(?=(?:^\d+\.\s*)?\d+\.\s*\(|\Z)', re.MULTILINE)
        
        matches = q_pattern.findall(body)
        for m_prefix_id, m_ans, m_text in matches:
            q_id = int(m_prefix_id)
            if q_id > 1000:
                q_id = q_id % 1000
            
            # Normalize text: convert all whitespace (including newlines) to a single space
            text = re.sub(r'\s+', ' ', m_text).strip()
            
            # Split by circled numbers explicitly
            parts = re.split(r'([①②③④❶❷❸❹➀➁➂➃])', text)
            
            if len(parts) < 2:
                question_text = text
                options = ["無選項", "無選項", "無選項", "無選項"]
            else:
                question_text = parts[0].strip()
                options = ["", "", "", ""]
                current_opt_idx = -1
                
                for j in range(1, len(parts), 2):
                    marker = parts[j]
                    content_part = parts[j+1].strip() if j+1 < len(parts) else ""
                    
                    if marker in '①❶➀': current_opt_idx = 0
                    elif marker in '②❷➁': current_opt_idx = 1
                    elif marker in '③❸➂': current_opt_idx = 2
                    elif marker in '④❹➃': current_opt_idx = 3
                    
                    if current_opt_idx != -1:
                        if options[current_opt_idx]:
                            options[current_opt_idx] += " " + content_part
                        else:
                            options[current_opt_idx] = content_part
            
            # Ensure no empty options
            options = [opt if opt else "無選項" for opt in options]

            # Determine answer index
            ans_val = 1
            try:
                ans_val = int(m_ans)
            except:
                pass

            results.append({
                "subject": subject,
                "category": current_category,
                "id": q_id,
                "question": question_text,
                "options": options,
                "answer": ans_val
            })

    # Dedup just in case
    unique_data = []
    seen = set()
    for item in results:
        key = (item['category'], item['id'], item['question'])
        if key not in seen:
            unique_data.append(item)
            seen.add(key)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(unique_data, f, ensure_ascii=False, indent=2)
    
    print(f"Successfully generated {len(unique_data)} questions to {output_path}")

if __name__ == "__main__":
    txt_file = "/Users/nelly/Documents/Antigravity/丙級檢定練習網站/原始資料/丙級檢定共同科目.txt"
    out_file = "/Users/nelly/Documents/Antigravity/丙級檢定練習網站/技術士技能檢定學科測試共同題庫.json"
    parse_txt_to_json(txt_file, out_file)
