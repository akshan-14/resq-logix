# ML Label Definition & Assessment

The Phase 4 ML Model requires a binary (or continuous) target label to predict Route Risk / Route Blockage during disasters.

## The Theoretical Label
To train a model that predicts whether a mountain route will fail during a storm, we need a dataset mapping historical routes to historical failure states:

- `y_route_blocked = 1`: Verified historical occurrence of a landslide, bridge collapse, or flood inundation completely severing the road at a specific coordinate and time.
- `y_route_blocked = 0`: Verified historical evidence that a road remained fully passable despite a nearby storm.

## The Physical Reality
Disaster responses in Northern India (like the 2013 Uttarakhand floods) generate massive amounts of unstructured reports (PDFs, news articles, eyewitness accounts). However, **there is no public, machine-readable dataset logging the exact coordinates and timestamps of every road closure and non-closure.**

## The Impossibility of Synthetic Proxies
As strictly commanded:
> "DO NOT label a route as blocked simply because: rainfall was high, landslide susceptibility was high, terrain was steep, flood risk was high. Those are FEATURES, not the target."

If we cannot construct `y_route_blocked` from independent observations, and we cannot synthesize it from features (which would be circular logic), we cannot create a scientifically defensible training dataset from open programmatic APIs.

## Conclusion
Direct route-closure labels **DO NOT EXIST** in a centralized, open, tabular format. We cannot construct a defensible binary target without manual NLP scraping of thousands of historical NDMA situation reports or purchasing proprietary logistics/telematics data.
