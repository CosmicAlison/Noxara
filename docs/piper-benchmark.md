# Offline Piper vs Kokoro benchmark

Noxara now defaults to the Piper `en_US-hfc_female-medium` voice, while Kokoro remains selectable. Piper's ONNX and phonemizer WASM assets are bundled with the Vite build. The voice model and config are downloaded once and stored in browser origin-private storage (OPFS). Inference runs on-device. An initial online download is required, and clearing browser storage removes the model. The overall website is not yet an installable offline PWA; an airplane-mode reload of the entire application is not guaranteed.

## Compare on the Galaxy A55

1. Install Gemma normally and open any star story.
2. Select **Piper — faster offline voice**, wait for the first voice download, and listen.
3. Tap **Compare Piper vs Kokoro speed**. The benchmark warms both engines and synthesizes the **same 86-character sentence** once with each. Downloads, first initialization, and audio playback are excluded from the reported latency.
4. Repeat after a fresh reload and compare Piper/Kokoro times. Lower synthesis milliseconds is better.
5. With the page and voice model already loaded, switch to airplane mode and narrate a new story. Check browser network logs for unexpected model/runtime fetches. Separately test whether the app itself can reload offline; that requires PWA caching outside this PR.

## CI and limitations

`npm run build` copies the local ONNX and phonemizer WASM runtime assets before Vite bundles the application. `node --experimental-strip-types --test tests/*.test.mjs` checks benchmark math and existing worker behavior.

**Benchmark results are measured on the user's actual device**, not predicted by the PR. A cold Piper download or Kokoro model initialization may take significantly longer than synthesis. The benchmark runs the two engines sequentially to avoid competing for CPU and RAM. Browser storage quotas, model downloads and Android WebAssembly support may still affect reliability.
