import re

with open('mobile/src/screens/BleNetworkScreen.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add logs state
content = content.replace("const [status, setStatus] = useState<BleStatus>(bleService.status);", "const [status, setStatus] = useState<BleStatus>(bleService.status);\n  const [logs, setLogs] = useState<string[]>([]);")

content = content.replace("bleService.setCallbacks(", "bleService.setCallbacks(")
# Replace callback logic
content = re.sub(
    r'bleService\.setCallbacks\([\s\S]*?\);\s*return \(\) => \{',
    '''bleService.setCallbacks(
      (report, hopCount) => {
      },
      (newStatus) => {
        setStatus(newStatus);
        if (oldCb) oldCb(newStatus);
      },
      (logMsg) => {
        setLogs(prev => {
          const newLogs = [new Date().toLocaleTimeString() + ': ' + logMsg, ...prev];
          return newLogs.slice(0, 50); // Keep last 50
        });
      }
    );
    
    return () => {''',
    content
)

# Add logs UI
logs_ui = '''
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Diagnostic Console</Text>
        <ScrollView style={{height: 200, backgroundColor: '#1e293b', padding: 10, borderRadius: 5}}>
          {logs.map((log, i) => <Text key={i} style={{color: '#a7f3d0', fontSize: 11, marginBottom: 4, fontFamily: 'monospace'}}>{log}</Text>)}
          {logs.length === 0 && <Text style={{color: '#64748b', fontSize: 11}}>Waiting for events...</Text>}
        </ScrollView>
      </View>
'''

content = content.replace("      <View style={styles.buttonRow}>", logs_ui + "\n      <View style={styles.buttonRow}>")

with open('mobile/src/screens/BleNetworkScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
