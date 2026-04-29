import google.generativeai as genai
import os

API_KEY = "AIzaSyBRzTGmiQumEyx6Y6xya2sr3-73f8aSGKY"
genai.configure(api_key=API_KEY)

print("測試可用模型列表...")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"可用模型: {m.name}")
except Exception as e:
    print(f"無法取得列表: {e}")
