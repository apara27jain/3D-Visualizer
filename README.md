# Soltech Energy — Roof Designer

A mobile-first solar sales experience that lets a homeowner map a roof, design an
interactive panel array, mark obstacles, review financial estimates, save a branded
preview and request a site assessment.

## Run it

Camera access requires a secure origin. During local development, `localhost` is accepted:

```powershell
python -m http.server 8080
```

Then open `http://localhost:8080` on a computer. For a phone, deploy the folder to any
HTTPS host (such as Netlify, Vercel, or your company website).

## Included

- Four-corner roof mapping
- Rear-facing live camera and sample-roof mode
- One-finger movement, pinch scaling and twist rotation
- Landscape and portrait panel layouts
- Water tank, chimney and shade exclusion zones
- System, energy, savings, cost, payback and carbon estimates
- Branded image download and native sharing
- Customer enquiry form with a pre-filled WhatsApp hand-off
- Responsive phone and desktop layouts

## Company configuration

The `COMPANY` object at the top of `app.js` is already set for Soltech Energy
(name, WhatsApp number `918302573979`, panel wattage, tariff, yield and price range).
Update `pricePerKwMin`/`pricePerKwMax` and `electricityRate` if your real installed
pricing or local tariff differs from the current placeholders.

## Production roadmap

The current version uses guided manual roof mapping, which works across modern mobile
browsers. Automatic physical plane detection still requires device-specific WebXR/ARCore
and native ARKit work. Estimates remain indicative until a professional site survey.
