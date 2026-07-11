# Soltech Energy 3D Solar Visualizer

This is a small website widget, not a full landing page and not a separate app.

## Current flow

- A small animated camera button sits at the bottom-right corner of the website.
- On click, the camera view opens directly.
- Solar panels appear automatically on the camera view.
- User can adjust panels:
  - One finger drag = move panels
  - Two finger pinch = zoom in / zoom out
  - Two finger twist = rotate angle
  - Bottom controls = precise size, angle, and tilt
  - Reset button = restore default placement
- Preview tools are easy to access but do not clash with the main controls:
  - Clean view = hides controls for a clear preview before saving
  - Show controls = restores all controls
  - Before / After = compare roof without panels and with panels
- Only one Save button remains at the top.
- Only one consultation button remains at the bottom.
- WhatsApp opens directly with a pre-filled message.
- Saved image includes Soltech branding and a Free Consultation watermark.

## WhatsApp

The business WhatsApp number is currently set in `app.js` as:

```js
whatsapp: "918302573979",
```

The pre-filled message is:

```js
Hii, I would like a free consultation regarding solar installation.
```

## Files to upload together

- `index.html`
- `styles.css`
- `app.js`
- `logo-full.png`
- `logo-mark.png`
