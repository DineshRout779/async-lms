import pypdfium2 as pdfium
import sys

def extract_text(pdf_path):
    try:
        pdf = pdfium.PdfDocument(pdf_path)
        text = ""
        for page in pdf:
            textpage = page.get_textpage()
            text += textpage.get_text_range()
            text += "\n"
        return text
    except Exception as e:
        return str(e)

if __name__ == "__main__":
    path = r"e:\Work\playground\Code Guru PRD (2).pdf"
    content = extract_text(path)
    with open("prd_content.txt", "w", encoding="utf-8") as f:
        f.write(content)
    print("Done")
