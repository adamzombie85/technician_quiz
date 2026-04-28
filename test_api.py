import google.generativeai as genai
import os

# 從 process_database.py 自動抓取 API_KEY
api_key = ""
try:
    with open('process_database.py', 'r', encoding='utf-8') as f:
        for line in f:
            if 'API_KEY =' in line and '"' in line:
                api_key = line.split('"')[1]
                break
except Exception as e:
    print(f"無法讀取 process_database.py: {e}")

if not api_key:
    print("❌ 在 process_database.py 中找不到 API_KEY，請確認您已經填入 Key 並存檔。")
else:
    genai.configure(api_key=api_key)
    print(f"🔑 已讀取 API Key: {api_key[:10]}...")
    print("🔍 正在查詢您的帳號支援哪些模型...")
    
    try:
        models = genai.list_models()
        found = False
        for m in models:
            if 'generateContent' in m.supported_generation_methods:
                print(f"✅ 可用模型名稱: {m.name}")
                found = True
        
        if not found:
            print("❌ 查詢成功，但您的 API Key 似乎沒有支援任何 generateContent 模型。")
            
    except Exception as e:
        print(f"❌ 查詢失敗，錯誤訊息如下：")
        print(e)
