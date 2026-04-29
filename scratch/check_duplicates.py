import json
from collections import Counter

def check_duplicates(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    ids = [item['id'] for item in data]
    id_counts = Counter(ids)
    dup_ids = {k: v for k, v in id_counts.items() if v > 1}
    
    # Check for similar questions (ignoring spaces)
    normalized_questions = {} # normalized_text -> original_item
    duplicates_by_text = []
    
    for item in data:
        norm = "".join(item['question'].split())
        if norm in normalized_questions:
            duplicates_by_text.append((normalized_questions[norm]['id'], item['id'], item['question']))
        else:
            normalized_questions[norm] = item
            
    return dup_ids, duplicates_by_text

if __name__ == "__main__":
    file_path = "/Users/nelly/Documents/丙級檢定練習網站/[丙級學科題庫] 烘焙食品.json"
    dup_ids, dup_text = check_duplicates(file_path)
    
    print(f"Duplicate IDs: {dup_ids}")
    print(f"Duplicate questions by text (ignoring spaces): {len(dup_text)}")
    for d in dup_text[:10]:
        print(f"  ID {d[0]} and {d[1]}: {d[2][:50]}...")
