import re

with open('mobile/src/screens/ReportIncidentScreen.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
if 'useTranslation' not in content:
    content = content.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';\nimport { useTranslation } from '../hooks/useTranslation';")

# Add hook inside component
content = content.replace("export default function ReportIncidentScreen({ navigation }: Props) {", "export default function ReportIncidentScreen({ navigation }: Props) {\n  const { t } = useTranslation();")

# Replace labels in ROAD_CONDITIONS
content = re.sub(r"label:\s*'.*?ROAD CLEAR'", "label: '??? ' + t('incident_road_clear')", content)
content = re.sub(r"label:\s*'.*?DIFFICULT TO PASS'", "label: '??? ' + t('incident_difficult_to_pass')", content)
content = re.sub(r"label:\s*'.*?ROAD BLOCKED'", "label: '? ' + t('status_road_blocked')", content)
content = re.sub(r"label:\s*'.*?FLOODED'", "label: '?? ' + t('incident_flooded')", content)
content = re.sub(r"label:\s*'.*?LANDSLIDE'", "label: '?? ' + t('incident_landslide')", content)
content = re.sub(r"label:\s*'.*?BRIDGE DAMAGED'", "label: '?? ' + t('incident_bridge_damaged')", content)

# Replace labels in rendering
content = content.replace("{rt}", "{t(\"incident_\" + rt.toLowerCase())}")
content = content.replace("{sev}", "{t(\"tier_\" + sev.toLowerCase())}")
content = content.replace("{role.replace('_', ' ')}", "{t(\"role_\" + role.toLowerCase())}")

with open('mobile/src/screens/ReportIncidentScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
