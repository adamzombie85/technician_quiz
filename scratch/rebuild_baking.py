import json
import re
import os

def rebuild():
    txt_path = '烘焙食品題庫.txt'
    json_path = '[丙級學科題庫] 烘焙食品.json'
    
    with open(txt_path, 'r', encoding='utf-8') as f:
        text_content = f.read()

    enrich_map = {}
    if os.path.exists(json_path):
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                old_data = json.load(f)
            for item in old_data:
                if item.get('explanation') and '這是烘焙檢定中的重要考點' not in item.get('explanation', ''):
                    q_norm = re.sub(r'\s+', '', item['question'])
                    enrich_map[q_norm] = item
        except:
            pass

    sections = re.split(r'07700 烘焙食品 丙級 工作項目 (\d+)：(.*?)\n', text_content)[1:]
    final_list = []
    global_id = 1

    for i in range(0, len(sections), 3):
        item_num, item_name, section_text = sections[i], sections[i+1].strip(), sections[i+2]
        
        # 這裡改用更強大的分隔符尋找方式，解決文字檔中的錯字 (例如 ② 變成 ③)
        pattern = re.compile(r'（([①②③④])）\s*(\d+)\.\s*(.*?)\s*①\s*(.*?)\s*[②③]\s*(.*?)\s*[③④]\s*(.*?)\s*④\s*(.*?)(?=\s*（[①②③④]）\s*\d+\.|\s*07700|\s*$)', re.S)
        
        for match in pattern.finditer(section_text):
            q_raw = match.group(3).replace('\n', '').strip()
            ans_map = {'①': 1, '②': 2, '③': 3, '④': 4}
            
            item = {
                'subject': '[丙級學科題庫] 烘焙食品',
                'category': f'工作項目 {item_num}：{item_name}',
                'id': global_id,
                'question': q_raw,
                'options': [
                    match.group(4).replace('\n', '').strip(),
                    match.group(5).replace('\n', '').strip(),
                    match.group(6).replace('\n', '').strip(),
                    match.group(7).replace('\n', '').strip()
                ],
                'answer': ans_map.get(match.group(1)),
                'knowledge_tag': '烘焙專業知能',
                'explanation': '這是烘焙檢定中的重要考點，請記住題目中的關鍵描述與正確答案的對應關係。',
                'keyword_tag': '考試重點'
            }
            
            # 針對你提到的 ID 115 做語意補全 (如果之前沒存到的話)
            if '小麥胚芽' in q_raw and '發黏' in q_raw:
                item['knowledge_tag'] = '麵糰化學'
                item['explanation'] = '小麥胚芽裡的麩胱甘肽會讓麵筋「斷開連結」，讓麵糰變得黏糊糊的不好操作喔。'
                item['keyword_tag'] = '麩胱甘肽'

            q_norm = re.sub(r'\s+', '', q_raw)
            if q_norm in enrich_map:
                old = enrich_map[q_norm]
                item['knowledge_tag'] = old.get('knowledge_tag', item['knowledge_tag'])
                item['explanation'] = old.get('explanation', item['explanation'])
                item['keyword_tag'] = old.get('keyword_tag', item['keyword_tag'])
            
            final_list.append(item)
            global_id += 1

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(final_list, f, ensure_ascii=False, indent=2)
    
    print(f'Successfully rebuilt {len(final_list)} items.')

if __name__ == '__main__':
    rebuild()
