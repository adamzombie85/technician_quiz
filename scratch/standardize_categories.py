import json
import os

target_file = '技術士技能檢定學科測試共同題庫.json'

with open(target_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

for q in data:
    cat = q.get('category', '')
    if '職業安全衛生' in cat:
        q['category'] = '(90006)職業安全衛生'
    elif '工作倫理' in cat or '職業道德' in cat:
        q['category'] = '(90007)工作倫理與職業道德'
    elif '環境保護' in cat:
        q['category'] = '(90008)環境保護'
    elif '節能減碳' in cat:
        q['category'] = '(90009)節能減碳'

with open(target_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Successfully processed {len(data)} questions.")
