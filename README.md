# Moth

Moth is a browser-based Gaussian beam mode-matching tool for building and checking paraxial optical trains with thin lenses and curved mirrors.

## What it does

- Propagates a circular TEM00 beam with q-parameter optics
- Draws the beam envelope and Gouy phase along the beam path
- Reports spot size, waist location, wavefront curvature, and mode overlap
- Searches lens combinations from a library and ranks solutions by mode matching
- Exports and imports full configurations for reuse and sharing

## Project layout

- `Moth.html` contains the UI
- `modematching_moth/optics-core.js` contains the pure optics engine
- `modematching_moth/moth.js` connects the optics engine to the interface
- `tests/optics-core.test.js` contains the Node unit tests

## Development

Run the unit tests with:

```bash
npm test
```

The browser UI loads the local optics engine directly, so there is no build step.
