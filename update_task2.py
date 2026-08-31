import os

filepath = r'C:\Users\ASUS\.gemini\antigravity\brain\88a4a5c5-6cb8-40b2-a140-306e382b9840\task.md'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("- [ ] Modify ackend/server.js GET /vehicles", "- [x] Modify ackend/server.js GET /vehicles")
content = content.replace("- [ ] Add SSE endpoint", "- [x] Add SSE endpoint")
content = content.replace("- [ ] Create ackend/gps_simulator.js", "- [x] Create ackend/gps_simulator.js")
content = content.replace("- [ ] Add script to package.json", "- [x] Add script to package.json")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
