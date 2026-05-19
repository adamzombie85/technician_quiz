import json

def analyze():
    for name in ["unified_database.json", "unified_database_enriched.json"]:
        print(f"=== {name} ===")
        with open(name, "r", encoding="utf-8") as f:
            data = json.load(f)
        subjects = {}
        for x in data:
            sub = x.get("subject", "無科目")
            subjects[sub] = subjects.get(sub, 0) + 1
        print(subjects)

if __name__ == "__main__":
    analyze()
