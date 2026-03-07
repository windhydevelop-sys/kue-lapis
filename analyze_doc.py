from docx import Document
doc = Document('79.BCA-Ricky Ardi Suwanto.docx')
print('='*100)
print('DOCUMENT ANALYSIS')
print('='*100)
for t_idx, table in enumerate(doc.tables):
    print(f'\nTable {t_idx}: {len(table.rows)} rows, {len(table.columns)} cols')
    if table.rows:
        header = [c.text.strip() for c in table.rows[0].cells]
        print('HEADER:\n  ' + ' | '.join(header[:12]))
        if len(table.rows) > 1:
            row1 = [c.text.strip() for c in table.rows[1].cells]
            print('ROW 1:\n  ' + ' | '.join(row1[:12]))
