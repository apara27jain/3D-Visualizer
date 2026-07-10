# Soltech Energy 3D Solar Visualizer

This is now a small website widget, not a full landing page and not a separate app.

## What the user sees

- A small animated camera button at the bottom-right corner of the website.
- On click, the camera view opens directly.
- Solar panels appear automatically on the camera view.
- Save/Capture button is available on the camera screen.
- After saving, a 5-star feedback dialog appears.
- A WhatsApp consultation button is available with a WhatsApp icon.

## WhatsApp setup

Open `app.js` and replace:

```js
whatsapp: "",
```

with your business WhatsApp number in international format:

```js
whatsapp: "919876543210",
```

## Embed on your actual website

Keep these files together:

- `styles.css`
- `app.js`
- `logo-mark.png`

Add the visualizer HTML from `index.html` to your page, or keep `index.html` as a reference.
The important launcher is:

```html
<button class="camera-launcher" onclick="window.openSolarVisualizer()">...</button>
```

## Note

This browser version avoids manual marking completely. It creates a smart automatic overlay with more realistic glass-style solar panels. True roof-plane detection like native ARKit/ARCore still needs a native mobile app for full accuracy.
