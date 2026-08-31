import os

filepath = r'C:\Users\ASUS\.gemini\antigravity\brain\88a4a5c5-6cb8-40b2-a140-306e382b9840\task.md'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("- [ ] Modify ackend/db.js", "- [x] Modify ackend/db.js")
content = content.replace("- [ ] Update ackend/seed.js", "- [x] Update ackend/seed.js")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
