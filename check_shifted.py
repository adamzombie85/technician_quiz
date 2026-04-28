import json

with open("[丙級學科題庫] 飲料調製.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# Build a search text for each question
for item in data[:5]:
    ex = item.get("explanation", "")
    print(f"\n--- Checking Explanation for Q{item['id']} ---")
    print(f"Ex: {ex}")
    
    # Check if this explanation makes sense for ANY other question in this DB
    found = False
    for other in data:
        q_text = other.get("question", "")
        options = other.get("options", [])
        ans_idx = int(other["answer"]) - 1
        ans_text = options[ans_idx] if 0 <= ans_idx < len(options) else ""
        
        # very simple heuristic: does the explanation contain the correct answer text?
        if ans_text and len(ans_text) > 1 and ans_text in ex:
            print(f"  -> Might belong to Q{other['id']}: {q_text} (Ans: {ans_text})")
            found = True
    if not found:
        print("  -> Could not find an exact match based on answer text.")
