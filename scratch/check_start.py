import json

def check_range():
    for name in ["unified_database.json", "unified_database_enriched.json"]:
        with open(name, "r", encoding="utf-8") as f:
            data = json.load(f)
        indices = [i for i, x in enumerate(data) if x.get("subject") == "[共同科目題庫] 食品安全衛生及營養相關職類"]
        if indices:
            print(f"{name} -> First index: {min(indices)}, Last index: {max(indices)}, Total: {len(indices)}")
        else:
            print(f"{name} -> Subject not found!")

if __name__ == "__main__":
    check_range()
