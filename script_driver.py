with open('mobile/src/screens/DriverScreen.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

if 'useTranslation' not in content:
    content = content.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';\nimport { useTranslation } from '../hooks/useTranslation';")

content = content.replace("export const DriverScreen = () => {", "export const DriverScreen = () => {\n  const { t } = useTranslation();")

content = content.replace("dY MARK DELIVERED", "? {t('btn_mark_delivered')}")

with open('mobile/src/screens/DriverScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
