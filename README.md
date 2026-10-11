# ✦ Noxara

**Touch grass. Look up. Let the universe tell you a story.** 🌌

Noxara is a mobile-first, **offline-first AI stargazing companion** built to get you *outside*, not keep you scrolling. Point your phone toward the night sky, discover what you're looking at, and listen as an on-device AI guide brings the science and stories of the stars to life.

> The best things aren't happening on your screen.

## Why Noxara?

The best stargazing often happens far from city lights—and sometimes far from reliable mobile coverage. Noxara explores a different kind of AI experience: one that accompanies a real-world activity instead of competing for your attention.

After an initial online model setup, **Gemma generates stories locally and Piper synthesizes speech locally**. You can listen while looking at the sky, rather than reading another wall of text.

## See it in action

<!-- Add screenshots after uploading them to docs/screenshots/ (or update these paths). -->
<!-- Suggested order: welcome, sky pointing, star discovery, narration, follow-up question. -->

**Screenshots coming soon.** The app is designed for portrait mobile use.

## How it works

1. **Go outside and look up.** Allow location and motion permissions, then point the top of your phone toward the sky.
2. **Discover a celestial object.** Noxara combines your position and device orientation with astronomical calculations and star catalogue data.
3. **Hear its story.** Gemma generates a short narrative from available astronomical context; Piper narrates it on your device.
4. **Follow your curiosity.** Ask a question about what you've found and continue the conversation.

No account is required. Star identification is based on **coordinates and device orientation**, not camera image recognition.

## Built with

| Technology | What it does |
| --- | --- |
| **Gemma 3 270M** via Transformers.js | On-device astronomy storytelling and follow-up answers |
| **Piper TTS** | On-device spoken narration |
| **ONNX / WebAssembly / WebGPU** | Browser-based model execution, depending on device support |
| **Yale Bright Star Catalogue** | Reference catalogue with 9,110 star records |
| **Astronomy Engine** | Astronomical position calculations |
| **React, TypeScript, Vite** | Mobile-first web experience |

Astronomical facts and curated historical context are kept separate from AI-generated narration. Missing measurements should not be presented as established facts.

## Getting started

### Try the experience

Open Noxara in a compatible mobile browser, choose **Begin exploring**, then **Install guide & voice**. The initial setup requires an internet connection and downloads/initializes **Gemma and Piper** before opening the sky experience. Wi-Fi is recommended.

Allow location and motion permissions when prompted. Point your phone at the night sky and tap **Done**.

**Device note:** Local AI inference can be demanding. Gemma uses WebGPU when supported and falls back to WebAssembly/CPU where possible; speed and memory usage vary by device.

### Run locally

Requires a recent version of Node.js and npm.

```bash
git clone https://github.com/CosmicAlison/Noxara.git
cd Noxara
npm install
npm run dev
```

Open the URL printed by Vite. For testing on a phone, use a secure HTTPS origin or an appropriate local development setup: browser geolocation and motion permissions may not work over an ordinary HTTP LAN address.

Build for production:

```bash
npm run build
npm run preview
```

Run the repository's Node tests:

```bash
node --experimental-strip-types --test tests/*.test.mjs
```

The dev/build scripts copy the Piper phonemizer and ONNX WebAssembly assets into the public runtime directory.

## What “offline-first” means here

- **Local inference:** After setup, Gemma's text generation and Piper's speech synthesis run on-device, without a cloud AI inference API.
- **Initial download required:** Both models and their runtime resources must be downloaded at least once.
- **Browser storage matters:** Cached models may be removed if the browser clears site data.
- **Not yet a guaranteed fully offline web app:** Loading or reloading the entire site without connectivity may still require additional service-worker and application-asset caching. Offline model inference is **not** the same as guaranteed offline site startup.

The long-term goal is a stargazing guide you can reliably take to remote, low-signal locations.

## Lessons from building it

The first voice implementation used Kokoro. On a Samsung Galaxy A55, long pauses between narrated sentences made the experience feel less like a companion and more like a loading screen. Switching to **Piper** improved the practical narration experience.

That trade-off is central to Noxara: **the right on-device model is the one that makes the real-world experience feel natural**, not necessarily the largest one.

## Roadmap

- [ ] Reliable offline reload through application-shell and asset caching
- [ ] Richer, carefully sourced cultural astronomy stories
- [ ] Improved mobile performance and model-loading feedback
- [ ] Better discovery and narration flow for outdoor use
- [ ] Add screenshots and a short demo video to this README

## Hackathon

Built for the **DEV Hackathon 2026 — Google Gemma Challenge** as an exploration of on-device AI that helps people reconnect with the world beyond their screens.

---

**Touch grass. Look up. The universe has stories to tell.** ✨
