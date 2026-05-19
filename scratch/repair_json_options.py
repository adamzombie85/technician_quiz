import json
import re
import os

def fix_options(options_list):
    # Join all options to see the full text
    full_text = " ".join(options_list)
    
    # Robust split by circled numbers
    # We use a set of common circled numbers
    parts = re.split(r'([①②③④❶❷❸❹➀➁➂➃])', full_text)
    
    if len(parts) < 2:
        return options_list # No change if no markers found
        
    new_options = ["", "", "", ""]
    current_idx = -1
    
    for i in range(1, len(parts), 2):
        marker = parts[i]
        content = parts[i+1].strip() if i+1 < len(parts) else ""
        
        if marker in '①❶➀': current_idx = 0
        elif marker in '②❷➁': current_idx = 1
        elif marker in '③❸➂': current_idx = 2
        elif marker in '④❹➃': current_idx = 3
        
        if current_idx != -1:
            # If there's already content, append with space
            if new_options[current_idx]:
                new_options[current_idx] += " " + content
            else:
                new_options[current_idx] = content
                
    # If we found at least some options, return them
    if any(new_options):
        # Fill empty ones with placeholders if needed, but usually all 4 are there
        return [opt if opt else "無選項" for opt in new_options]
    
    return options_list

def process_file(file_path):
    print(f"Processing {file_path}...")
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    fixed_count = 0
    for item in data:
        original_options = item.get('options', [])
        # Check if any option contains a marker
        has_marker = any(re.search(r'[①②③④❶❷❸❹➀➁➂➃]', opt) for opt in original_options)
        # Or if we have fewer than 4 options
        fewer_than_4 = len(original_options) < 4
        
        if has_marker or fewer_than_4:
            new_options = fix_options(original_options)
            if new_options != original_options:
                item['options'] = new_options
                fixed_count += 1
                
    if fixed_count > 0:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Fixed {fixed_count} questions in {file_path}")
    else:
        print(f"No fixes needed in {file_path}")

files = [
    '技術士技能檢定學科測試共同題庫.json',
    '[丙級學科題庫] 中式麵食加工.json',
    '[丙級學科題庫] 烘焙食品.json',
    '[丙級學科題庫] 飲料調製.json',
    '[共同科目題庫] 食品安全衛生及營養相關職類.json'
]

for f in files:
    if os.path.exists(f):
        process_file(f)
    else:
        print(f"File not found: {f}")
