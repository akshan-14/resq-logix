with open('mobile/src/screens/HomeScreen.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

if 'useTranslation' not in content:
    content = content.replace("import React, { useEffect, useState } from 'react';", "import React, { useEffect, useState } from 'react';\nimport { useTranslation } from '../hooks/useTranslation';")

content = content.replace("export default function HomeScreen({ navigation }: Props) {", "export default function HomeScreen({ navigation }: Props) {\n  const { t, lang, setLanguage } = useTranslation();")

header_block = '''
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Text style={styles.title}>dY> ResQ-Logix</Text>
        <View style={{flexDirection: 'row'}}>
          <TouchableOpacity onPress={() => setLanguage('en')} style={{marginHorizontal: 5}}><Text style={{fontWeight: lang === 'en' ? 'bold' : 'normal', color: lang === 'en' ? '#1976d2' : '#888'}}>EN</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setLanguage('hi')} style={{marginHorizontal: 5}}><Text style={{fontWeight: lang === 'hi' ? 'bold' : 'normal', color: lang === 'hi' ? '#1976d2' : '#888'}}>HI</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setLanguage('as')} style={{marginHorizontal: 5}}><Text style={{fontWeight: lang === 'as' ? 'bold' : 'normal', color: lang === 'as' ? '#1976d2' : '#888'}}>AS</Text></TouchableOpacity>
        </View>
      </View>
'''

content = content.replace("<Text style={styles.title}>dY> ResQ-Logix</Text>", header_block)

with open('mobile/src/screens/HomeScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
