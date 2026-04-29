import os
import shutil

def organize_files():
    base_dir = "/Users/nelly/Documents/Antigravity/丙級檢定練習網站"
    raw_dir = f"{base_dir}/原始資料"
    
    # 建立資料夾
    if not os.path.exists(raw_dir):
        os.makedirs(raw_dir)
        print(f"📁 已建立資料夾：{raw_dir}")

    # 需要移動的副檔名
    target_extensions = [".txt", ".pdf"]
    
    files = [f for f in os.listdir(base_dir) if os.path.isfile(os.path.join(base_dir, f))]
    
    moved_count = 0
    for filename in files:
        # 檢查副檔名
        if any(filename.lower().endswith(ext) for ext in target_extensions):
            src = os.path.join(base_dir, filename)
            dst = os.path.join(raw_dir, filename)
            
            try:
                shutil.move(src, dst)
                print(f"🚚 已移動：{filename}")
                moved_count += 1
            except Exception as e:
                print(f"❌ 移動 {filename} 失敗: {e}")

    print(f"\n✅ 整理完成！共移動了 {moved_count} 個原始檔案至「原始資料」資料夾。")

if __name__ == "__main__":
    organize_files()
