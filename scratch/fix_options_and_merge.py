import json
import csv
import re
import os
import glob

def normalize(text):
    return re.sub(r'\s+', '', text)

def clean_option(opt):
    if not isinstance(opt, str):
        return opt
    # Remove leading/trailing spaces
    opt = opt.strip()
    # Remove trailing period (Chinese or English)
    opt = opt.rstrip('。.')
    # Remove unnecessary spaces adjacent to non-ASCII characters
    opt = re.sub(r'(?<=[^\x00-\x7F])\s+|\s+(?=[^\x00-\x7F])', '', opt)
    # Remove leading/trailing again just in case
    opt = opt.strip()
    return opt

def main():
    csv_path = 'quiz_database.csv'
    enrich_map = {}
    
    # Read CSV and build enrich map
    if os.path.exists(csv_path):
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            headers = next(reader, None)
            
            for row in reader:
                if len(row) >= 12:
                    q_text = row[3]
                    q_norm = normalize(q_text)
                    enrich_map[q_norm] = {
                        'knowledge_tag': row[9],
                        'explanation': row[10],
                        'keyword_tag': row[11]
                    }
                    
    # Process all JSON files
    json_files = glob.glob('*.json')
    for json_path in json_files:
        if json_path in ['package.json', 'package-lock.json', 'firebase.json']:
            continue
            
        with open(json_path, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
            except:
                continue
                
        if not isinstance(data, list):
            continue
            
        modified = False
        for item in data:
            # 1. Clean options
            if 'options' in item and isinstance(item['options'], list):
                new_opts = [clean_option(opt) for opt in item['options']]
                if new_opts != item['options']:
                    item['options'] = new_opts
                    modified = True
            
            # 2. Merge explanation if missing
            q_text = item.get('question', '')
            q_norm = normalize(q_text)
            
            if q_norm in enrich_map:
                enrich_data = enrich_map[q_norm]
                if not item.get('explanation') and enrich_data['explanation']:
                    item['explanation'] = enrich_data['explanation']
                    item['knowledge_tag'] = enrich_data['knowledge_tag']
                    item['keyword_tag'] = enrich_data['keyword_tag']
                    modified = True
        
        if modified:
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"Updated {json_path}")
        else:
            print(f"No changes for {json_path}")

if __name__ == '__main__':
    main()
