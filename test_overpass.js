fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  body: '[out:json];node(around:10000, 28.7041, 77.1025)["population"];out tags;'
})
.then(r => r.json())
.then(r => console.log(JSON.stringify(r, null, 2)))
.catch(console.error);
