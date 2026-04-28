import json
import random

files = [
    "[丙級學科題庫] 飲料調製.json",
    "[丙級學科題庫] 中式麵食加工.json",
    "[共同科目題庫] 技術士技能檢定.json",
    "[共同科目題庫] 食品安全衛生及營養相關職類.json"
]

for f in files:
    try:
        with open(f, 'r', encoding='utf-8') as file:
            data = json.load(file)
            print(f"--- {f} ---")
            for item in random.sample(data, min(2, len(data))):
                print(f"Q: {item.get('question')}")
                try:
                    ans_idx = int(item.get('answer')) - 1
                    ans_str = item.get('options')[ans_idx]
                except:
                    ans_str = "Error getting answer"
                print(f"Ans: {ans_str}")
                print(f"Exp: {item.get('explanation')}\n")
    except Exception as e:
        print(f"Error reading {f}: {e}")
