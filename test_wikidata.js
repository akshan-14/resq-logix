const url = 'https://query.wikidata.org/sparql?query=' + encodeURIComponent(
SELECT ?population WHERE {
  ?item rdfs:label "Delhi"@en.
  ?item wdt:P1082 ?population.
} LIMIT 1
) + '&format=json';

fetch(url, {headers: {'User-Agent': 'ResQ-Logix/1.0', 'Accept': 'application/sparql-results+json'}})
.then(r => r.json())
.then(r => console.log(JSON.stringify(r, null, 2)))
.catch(console.error);
