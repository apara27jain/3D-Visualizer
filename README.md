# SunSight AR

A mobile-first solar roof visualizer. Customers point their phone camera at a roof,
position a configurable solar-panel array, and save a preview image.

## Run it

Camera access requires a secure origin. During local development, `localhost` is accepted:

```powershell
python -m http.server 8080
```

Then open `http://localhost:8080` on a computer. For a phone, deploy the folder to any
HTTPS host (such as Netlify, Vercel, or your company website).

## Included in this prototype

- Rear-facing live camera
- Draggable solar array
- Panel count, scale, and angle controls
- Estimated system size and annual generation
- Downloadable customer preview
- Responsive phone and desktop layout
- Demo mode when camera access is unavailable

## Production roadmap

The current version uses manual alignment, which works across modern mobile browsers.
For automatic roof anchoring, add WebXR plane detection on supported Android devices and
an iOS Quick Look / native ARKit path. A production estimator should also use the customer's
location, roof pitch, azimuth, shading, panel model, and local irradiance data.
