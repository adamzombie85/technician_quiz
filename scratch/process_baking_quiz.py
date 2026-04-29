import re
import json

def is_cjk(char):
    if not char:
        return False
    return '\u4e00' <= char <= '\u9fff'

def join_lines(s1, s2):
    if not s1:
        return s2
    if not s2:
        return s1
    # If the joint is between two CJK characters, don't add a space
    if is_cjk(s1[-1]) and is_cjk(s2[0]):
        return s1 + s2
    return s1 + " " + s2

def process_quiz(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        if content.startswith('\ufeff'):
            content = content[1:]
        lines = content.splitlines()

    questions = []
    current_q = ""
    active_category = ""
    question_category = ""

    header_pattern = re.compile(r'07700\s+烘焙食品\s+丙級\s+工作項目\s*(\d+)\s*[：:]\s*(.*)', re.IGNORECASE)
    page_num_pattern = re.compile(r'^\d+\s+烘焙食品$')
    test_title_pattern = re.compile(r'^丙級學科測試題目\s+\d+$')
    q_start_pattern = re.compile(r'^（[①②③④]）\s*(\d+)\.')

    for line in lines:
        line = line.strip()
        if not line:
            continue

        cat_match = header_pattern.search(line)
        if cat_match:
            active_category = f"工作項目 {cat_match.group(1)}：{cat_match.group(2).strip()}"
            continue

        if page_num_pattern.match(line) or test_title_pattern.match(line):
            continue

        if q_start_pattern.match(line):
            if current_q:
                questions.append((current_q, question_category))
            current_q = line
            question_category = active_category
        else:
            if current_q:
                current_q = join_lines(current_q, line)

    if current_q:
        questions.append((current_q, question_category))

    formatted_questions = []
    # Pattern: （(?P<answer>[①②③④])）\s*(?P<id>\d+)\.\s*(?P<question>.*?)\s*①\s*(?P<opt1>.*?)\s*②\s*(?P<opt2>.*?)\s*③\s*(?P<opt3>.*?)\s*④\s*(?P<opt4>.*)
    parse_pattern = re.compile(r'^（(?P<answer>[①②③④])）\s*(?P<id>\d+)\.\s*(?P<question>.*?)\s*①\s*(?P<opt1>.*?)\s*②\s*(?P<opt2>.*?)\s*③\s*(?P<opt3>.*?)\s*④\s*(?P<opt4>.*)$')

    ans_map = {'①': 1, '②': 2, '③': 3, '④': 4}

    for q_str, cat in questions:
        # Normalize whitespace (but keep spaces between non-CJK chars if they were already there)
        # Actually, our join_lines already handles the main issue.
        # Let's just do a simple cleanup of multiple spaces.
        q_str = re.sub(r' {2,}', ' ', q_str).strip()
        
        match = parse_pattern.match(q_str)
        if match:
            ans_symbol = match.group('answer')
            ans_int = ans_map.get(ans_symbol)
            
            q_data = {
                "id": match.group('id'),
                "question": match.group('question').strip(),
                "options": [
                    match.group('opt1').strip(),
                    match.group('opt2').strip(),
                    match.group('opt3').strip(),
                    match.group('opt4').strip()
                ],
                "answer": ans_int,
                "category": cat
            }
            q_data["options"] = [opt.rstrip('。').strip() for opt in q_data["options"]]
            formatted_questions.append(q_data)

    return formatted_questions

if __name__ == "__main__":
    input_file = "/Users/nelly/Documents/丙級檢定練習網站/烘焙食品題庫.txt"
    output_file = "/Users/nelly/Documents/丙級檢定練習網站/[丙級學科題庫] 烘焙食品.json"
    
    data = process_quiz(input_file)
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"Processed {len(data)} questions.")
