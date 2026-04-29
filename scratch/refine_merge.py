import json
import re

def normalize(text):
    # Remove all whitespace and common punctuation differences
    return re.sub(r'\s+', '', text).strip()

def merge_properly(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    unique_questions = {} # normalized_text -> item
    
    for item in data:
        norm = normalize(item['question'])
        if norm not in unique_questions:
            unique_questions[norm] = item
        else:
            # If we already have it, prefer the one with more information
            existing = unique_questions[norm]
            # Prefer the one with a category
            if not existing.get('category') and item.get('category'):
                unique_questions[norm] = item
            # If both have categories, they should be the same, but we'll stick with the first one found
            
    # Convert back to list
    final_list = list(unique_questions.values())
    
    # Sort by category and then by id (numeric)
    def sort_key(x):
        cat = x.get('category', '')
        try:
            # Try to get numeric id
            qid = int(x['id'])
        except:
            qid = 99999
        return (cat, qid)
    
    final_list.sort(key=sort_key)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(final_list, f, ensure_ascii=False, indent=2)
    
    return len(data), len(final_list)

if __name__ == "__main__":
    file_path = "/Users/nelly/Documents/丙級檢定練習網站/[丙級學科題庫] 烘焙食品.json"
    old_count, new_count = merge_properly(file_path)
    print(f"Original count: {old_count}")
    print(f"Cleaned count: {new_count}")
    print(f"Removed {old_count - new_count} duplicates.")
