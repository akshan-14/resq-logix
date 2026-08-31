import os
import json

with open('frontend/src/locales/en.json', 'r', encoding='utf-8') as f:
    en_dict = json.load(f)

fallback_str = "const FALLBACK_EN = " + json.dumps(en_dict, indent=2) + ";\n"

# Patch frontend useTranslation
frontend_hook = 'frontend/src/hooks/useTranslation.js'
with open(frontend_hook, 'r', encoding='utf-8') as f:
    fc = f.read()

fc = fc.replace("return locales[lang][key] || locales['en'][key] || key;", "return locales[lang]?.[key] || locales['en']?.[key] || FALLBACK_EN[key] || key.toUpperCase().replace(/_/g, ' ');")

if "const FALLBACK_EN" not in fc:
    fc = fc.replace("const locales =", fallback_str + "\nconst locales =")

with open(frontend_hook, 'w', encoding='utf-8') as f:
    f.write(fc)

# Patch mobile useTranslation
mobile_hook = 'mobile/src/hooks/useTranslation.ts'
with open(mobile_hook, 'r', encoding='utf-8') as f:
    mc = f.read()

mc = mc.replace("return locales[lang][key] || locales['en'][key] || key;", "return locales[lang]?.[key] || locales['en']?.[key] || FALLBACK_EN[key] || key.toUpperCase().replace(/_/g, ' ');")
if "const FALLBACK_EN" not in mc:
    mc = mc.replace("const locales =", fallback_str + "\nconst locales =")

with open(mobile_hook, 'w', encoding='utf-8') as f:
    f.write(mc)

# Patch test_i18n.js
test_js = 'test_i18n.js'
with open(test_js, 'r', encoding='utf-8') as f:
    tc = f.read()

tc = tc.replace("if (locales[lang] && locales[lang][key]) return locales[lang][key];", "")
tc = tc.replace("if (locales['en'][key]) return locales['en'][key];", "")
tc = tc.replace("return key;", "return locales[lang]?.[key] || locales['en']?.[key] || FALLBACK_EN[key] || key.toUpperCase().replace(/_/g, ' ');")
tc = tc.replace("assert(t('unknown_random_key', 'en') === 'unknown_random_key', 'Completely missing key returns raw key');", "assert(t('unknown_random_key', 'en') === 'UNKNOWN RANDOM KEY', 'Completely missing key returns formatted English text');\n\n// Simulate completely missing locale file\nassert(t('status_road_blocked', 'MISSING_FILE') === 'ROAD BLOCKED', 'Missing locale file falls back to hardcoded English dict');")

if "const FALLBACK_EN" not in tc:
    tc = tc.replace("const locales =", fallback_str + "\nconst locales =")

with open(test_js, 'w', encoding='utf-8') as f:
    f.write(tc)

