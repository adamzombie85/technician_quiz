import re

# The hex e2 91 a3 is ④
text = "實施自動檢查\u2463遵守工作守則。"
print(f"Text: {text}")

# Test with explicit range
parts = re.split(r'([①-④])', text)
print(f"Split with [①-④]: {parts}")

# Test with explicit characters
parts2 = re.split(r'([①②③④])', text)
print(f"Split with [①②③④]: {parts2}")
