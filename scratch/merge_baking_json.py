import json
import os

def merge_jsons(file1, file2, output_file):
    with open(file1, 'r', encoding='utf-8') as f:
        data1 = json.load(f)
    
    with open(file2, 'r', encoding='utf-8') as f:
        data2 = json.load(f)
    
    # Use a dictionary to deduplicate based on question text
    merged = {}
    
    # Process file1 first
    for item in data1:
        merged[item['question']] = item
    
    # Process file2, only add if question is new or has better data
    new_items_count = 0
    for item in data2:
        if item['question'] not in merged:
            merged[item['question']] = item
            new_items_count += 1
        else:
            # If the current merged item has no category but the new one does, update it
            if not merged[item['question']].get('category') and item.get('category'):
                merged[item['question']] = item
    
    # Convert back to list and sort by id (handling non-numeric IDs if any)
    def get_id(x):
        try:
            return int(x['id'])
        except:
            return 99999
            
    final_list = sorted(merged.values(), key=get_id)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(final_list, f, ensure_ascii=False, indent=2)
    
    return len(data1), len(data2), len(final_list)

if __name__ == "__main__":
    path = "/Users/nelly/Documents/丙級檢定練習網站"
    f1 = os.path.join(path, "[丙級學科題庫] 烘焙食品.json")
    f2 = os.path.join(path, "[丙級學科題庫] 烘焙食品_new.json")
    out = os.path.join(path, "[丙級學科題庫] 烘焙食品.json")
    
    c1, c2, cf = merge_jsons(f1, f2, out)
    print(f"File 1: {c1} questions")
    print(f"File 2: {c2} questions")
    print(f"Merged: {cf} questions")
