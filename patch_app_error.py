import os

filepath = 'mobile/App.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = "import { ErrorBoundary } from './src/ErrorBoundary';\n" + content

content = content.replace("return (", "return (\n    <ErrorBoundary>")
content = content.replace("</NavigationContainer>\n  );", "</NavigationContainer>\n    </ErrorBoundary>\n  );")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
