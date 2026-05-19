import re

text = """對於核計勞工所得有無低於基本工資，下列敘述何者有誤？①僅計入在正常工時內之報酬②應計入加班費③
不計入休假日出勤加給之工資④不計入競賽獎金。"""

# Normalize as done in the script
norm_text = re.sub(r'\s+', ' ', text).strip()
print(f"Normalized: {norm_text}")

# Split as done in the script
parts = re.split(r'([①-④])', norm_text)
print(f"Parts: {parts}")

options = ["", "", "", ""]
current_opt_idx = -1
for i in range(1, len(parts), 2):
    marker = parts[i]
    content = parts[i+1].strip() if i+1 < len(parts) else ""
    if marker == '①': current_opt_idx = 0
    elif marker == '②': current_opt_idx = 1
    elif marker == '③': current_opt_idx = 2
    elif marker == '④': current_opt_idx = 3
    if current_opt_idx != -1:
        options[current_opt_idx] = content

print(f"Options: {options}")
