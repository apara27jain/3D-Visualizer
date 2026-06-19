# SunSight Solar Designer

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

Update the `COMPANY` object at the top of `app.js` with the real company name,
WhatsApp number, panel wattage, electricity tariff, solar yield and price range.
The WhatsApp number must use international digits only, such as `919876543210`.

## Production roadmap

The current version uses guided manual roof mapping, which works across modern mobile
browsers. Automatic physical plane detection still requires device-specific WebXR/ARCore
and native ARKit work. Estimates remain indicative until a professional site survey.
