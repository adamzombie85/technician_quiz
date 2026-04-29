import json
import os

def check_completeness():
    base_dir = "/Users/nelly/Documents/Antigravity/丙級檢定練習網站"
    files = [
        "[共同科目題庫] 食品安全衛生及營養相關職類.json",
        "[丙級學科題庫] 中式麵食加工.json",
        "[丙級學科題庫] 飲料調製.json"
    ]

    for filename in files:
        path = f"{base_dir}/{filename}"
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                missing = sum(1 for item in data if not item.get("explanation") or len(item.get("explanation")) < 5)
                status = "✅ 已全數補完" if missing == 0 else f"❌ 缺失 {missing} 題"
                print(f"題庫：{filename}\n  - 總題數：{len(data)}\n  - 詳解狀態：{status}\n")
        else:
            print(f"❌ 找不到檔案: {filename}")

if __name__ == "__main__":
    check_completeness()
