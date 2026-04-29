import json
import re

def normalize(text):
    return re.sub(r'\s+', '', str(text)).strip()

def merge_with_priority(original_file, parsed_file, output_file):
    with open(original_file, 'r', encoding='utf-8') as f:
        original_data = json.load(f)
    
    with open(parsed_file, 'r', encoding='utf-8') as f:
        parsed_data = json.load(f)
    
    # Store items by normalized question text
    merged = {}
    
    # Process parsed data first (the complete set of 1189 questions)
    for item in parsed_data:
        norm = normalize(item['question'])
        merged[norm] = item
    
    # Overwrite with original data (the ones with explanations)
    # This gives priority to the original file
    original_added = 0
    for item in original_data:
        norm = normalize(item['question'])
        merged[norm] = item
        original_added += 1
        
    # Convert back to list
    final_list = list(merged.values())
    
    # Sort by category and id
    def sort_key(x):
        cat = x.get('category', '')
        try:
            qid = int(x['id'])
        except:
            qid = 99999
        return (cat, qid)
    
    final_list.sort(key=sort_key)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(final_list, f, ensure_ascii=False, indent=2)
    
    return len(parsed_data), original_added, len(final_list)

if __name__ == "__main__":
    orig = "/Users/nelly/Documents/丙級檢定練習網站/[丙級學科題庫] 烘焙食品.json"
    parsed = "/Users/nelly/Documents/丙級檢定練習網站/[丙級學科題庫] 烘焙食品_parsed.json"
    out = "/Users/nelly/Documents/丙級檢定練習網站/[丙級學科題庫] 烘焙食品.json"
    
    pc, oc, fc = merge_with_priority(orig, parsed, out)
    print(f"Complete Parsed Set: {pc} questions")
    print(f"Original (Explanations) Set: {oc} questions")
    print(f"Final Merged Set: {fc} questions")
