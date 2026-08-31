import requests

url = "https://portal.opentopography.org/API/globaldem?demtype=SRTMGL1&south=25.0&north=25.1&west=91.0&east=91.1&outputFormat=GTiff"
response = requests.get(url)
print(response.status_code)
print(response.text[:100])
