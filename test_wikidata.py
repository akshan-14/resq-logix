import urllib.request
import urllib.parse
import json

query = """
SELECT ?population WHERE {
  ?item rdfs:label "Delhi"@en.
  ?item wdt:P1082 ?population.
} LIMIT 1
"""
url = "https://query.wikidata.org/sparql?query=" + urllib.parse.quote(query) + "&format=json"

req = urllib.request.Request(url, headers={'User-Agent': 'ResQ-Logix/1.0', 'Accept': 'application/sparql-results+json'})
with urllib.request.urlopen(req) as response:
    print(response.read().decode())
