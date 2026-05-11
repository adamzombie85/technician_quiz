import os
from PIL import Image, ImageEnhance, ImageDraw

def create_puzzle_pieces(img_path, output_dir, rows=3, cols=3):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    img = Image.open(img_path)
    # Ensure it's square-ish or handle aspect ratio
    width, height = img.size
    
    p_width = width // cols
    p_height = height // rows
    
    for r in range(rows):
        for c in range(cols):
            idx = r * cols + c
            left = c * p_width
            top = r * p_height
            # Handle the last piece slightly larger if division is not perfect
            right = (c + 1) * p_width if c < cols - 1 else width
            bottom = (r + 1) * p_height if r < rows - 1 else height
            
            piece = img.crop((left, top, right, bottom))
            piece.save(os.path.join(output_dir, f"piece_{idx}.png"))
            print(f"Saved piece_{idx}.png")

    # Create silhouette
    silhouette = img.convert("L").convert("RGB")
    enhancer = ImageEnhance.Brightness(silhouette)
    silhouette = enhancer.enhance(0.2) # Very dark
    
    # Add grid lines to silhouette
    draw = ImageDraw.Draw(silhouette)
    for r in range(1, rows):
        y = r * p_height
        draw.line([(0, y), (width, y)], fill=(100, 100, 100), width=2)
    for c in range(1, cols):
        x = c * p_width
        draw.line([(x, 0), (x, height)], fill=(100, 100, 100), width=2)
        
    silhouette.save(os.path.join(output_dir, "silhouette.png"))
    print("Saved silhouette.png")

create_puzzle_pieces("jigsaw puzzles/Mona Lisa.jpg", "assets/puzzle_mona_lisa")
