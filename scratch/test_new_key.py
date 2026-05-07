import google.generativeai as genai
import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise ValueError("請在 .env 檔案中設定 GEMINI_API_KEY，或設定環境變數。")

genai.configure(api_key=API_KEY)

print("測試可用模型列表...")
try:
    models = genai.list_models()
    for m in models:
        if 'generateContent' in m.supported_generation_methods:
            print(f"可用模型: {m.name}")
except Exception as e:
    print(f"無法取得列表: {e}")
