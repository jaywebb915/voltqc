import fitz
doc = fitz.open("/home/team/shared/uploads/title_sheet.pdf")
for page in doc:
    print(page.get_text())
