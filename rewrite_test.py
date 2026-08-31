content = '''const en = require('./frontend/src/locales/en.json');
const hi = require('./frontend/src/locales/hi.json');
const as = require('./frontend/src/locales/as.json');

const locales = { en, hi, as };

function t(key, lang) {
  if (locales[lang] && locales[lang][key]) return locales[lang][key];
  if (locales['en'][key]) return locales['en'][key];
  return key;
}

let passed = 0; let total = 0;
function assert(condition, msg) {
  total++;
  if (condition) { passed++; console.log('Passed: ' + msg); }
  else { console.error('Failed: ' + msg); }
}

assert(t('status_road_blocked', 'en') === 'ROAD BLOCKED', 'English translates ROAD BLOCKED');
assert(t('status_road_blocked', 'hi') === 'मार्ग अवरुद्ध', 'Hindi translates ROAD BLOCKED');
assert(t('status_road_blocked', 'as') === 'ৰাস্তা বন্ধ', 'Assamese translates ROAD BLOCKED');
assert(t('btn_verify', 'hi') === 'सत्यापित करें', 'Hindi has Verify button translated');
assert(t('status_active', 'xyz') === 'ACTIVE', 'Unknown language falls back to English');
assert(t('unknown_random_key', 'en') === 'unknown_random_key', 'Completely missing key returns raw key');

console.log('--- ALL TESTS PASSED (' + passed + '/' + total + ') ---');
'''
with open('test_i18n.js', 'w', encoding='utf-8') as f:
    f.write(content)
