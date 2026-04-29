import fitz
doc = fitz.open('/Users/nelly/Documents/丙級檢定練習網站/技術士檢定共同科目.pdf')
with open('/Users/nelly/Documents/丙級檢定練習網站/scratch/pdf_peek.txt', 'w', encoding='utf-8') as f:
    f.write(doc[0].get_text())
