import requests
import json

url = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=YOUR_KEY&format=json' # Just checking if the catalog API works without key
try:
    res = requests.get('https://data.gov.in/backend/api/v1/datasets?search=flood&state=Assam')
    print(res.status_code)
    print(res.text[:200])
except Exception as e:
    print(e)
