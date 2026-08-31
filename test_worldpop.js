fetch('https://api.worldpop.org/v1/services/stats?dataset=wpgp&year=2020&geojson={\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[77.1025,28.7041]}}')
  .then(r => r.text())
  .then(console.log)
  .catch(console.error);
