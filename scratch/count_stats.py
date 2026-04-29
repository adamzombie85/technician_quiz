import json
import os
from collections import Counter

def count_stats():
    base_dir = "/Users/nelly/Documents/Antigravity/丙級檢定練習網站"
    files = [
        "[共同科目題庫] 職業安全衛生.json"
    ]

    for filename in files:
        path = f"{base_dir}/{filename}"
        if os.path.exists(path):
            print(f"\n📊 題庫：{filename}")
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                counts = Counter(item.get("category", "未分類") for item in data)
                for cat, count in sorted(counts.items()):
                    print(f"  - {cat}: {count} 題")
                print(f"  --- 總計: {len(data)} 題 ---")
        else:
            print(f"❌ 找不到檔案: {filename}")

if __name__ == "__main__":
    count_stats()
