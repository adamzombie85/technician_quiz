import google.generativeai as genai
import os

API_KEY = "AIzaSyDbL8UW3EXRivDTU3w8BO8seFgZzXcizEg"
genai.configure(api_key=API_KEY)

print("測試可用模型列表...")
try:
    models = genai.list_models()
    for m in models:
        if 'generateContent' in m.supported_generation_methods:
            print(f"可用模型: {m.name}")
except Exception as e:
    print(f"無法取得列表: {e}")
