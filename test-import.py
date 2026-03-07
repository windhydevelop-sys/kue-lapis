#!/usr/bin/env python3
import json
import subprocess

# Use curl via subprocess
result = subprocess.run([
    'curl', '-s', '-X', 'POST',
    'http://localhost:5000/api/products/import-document',
    '-F', 'document=@79.BCA-Ricky Ardi Suwanto.docx',
    '-F', 'bankName=BCA'
], capture_output=True, text=True)

print("\n=== IMPORT RESPONSE ===\n")
print(result.stdout)
if result.stderr:
    print("Error:", result.stderr)
