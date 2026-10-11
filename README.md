# Revision Intelligence: Local AI Compatibility Test

This is a separate test page for checking whether an iPhone's Safari can run a small language model locally through WebLLM/WebGPU. It does not change the main Revision Tracker, does not use your Supabase account, and does not alter revision data.

## Publish it to the existing GitHub Pages website

1. Download and extract this ZIP.
2. Open the existing repository: https://github.com/revisiontracker/RevisionTracker
3. Use **Add file → Upload files** and upload only `local-ai-test.html` to the repository root.
4. Commit to `main` and wait for GitHub Pages to publish.
5. Open this URL in Safari on the iPhone:
   `https://revisiontracker.github.io/RevisionTracker/local-ai-test.html`

Do not replace `index.html`, `app.js`, `styles.css`, `service-worker.js`, `supabase-config.js`, or any other live app files for this test.

## How to test

1. Connect the iPhone to Wi-Fi and make sure it has sufficient free storage and battery.
2. Open the URL in Safari. The page checks for WebGPU, but does not download a model automatically.
3. Start with **Tiny compatibility test · SmolLM2 135M** and press **Download and load local AI**. This first download may be several hundred MB and can take a while.
4. Keep Safari open while downloading and loading. Once the model is ready, press **Run local AI test**.
5. Record whether WebGPU is available, whether the model loaded, how long it took, and whether the answer was coherent.

If the tiny model succeeds, optionally reload the page and test the 360M option. It is heavier and may terminate Safari on some devices. If Safari closes, do not repeatedly retry the larger model; return to the small model.

## Free and privacy notes

- No AI API key or AI inference endpoint is used. The model's inference runs on the user's device.
- The browser downloads the WebLLM library and model weights from external hosting, so internet is required for the first setup. This test does not promise the cached model will remain available offline indefinitely.
- The prompt you type is not sent to a paid AI inference service by this page. Normal network requests are still made to download code and model files.
- The 135M model is only a compatibility test; it may give poor or incorrect answers. Do not rely on the result for actual exam preparation.
- WebLLM requires compatible WebGPU support. Availability can vary by iOS version, device, browser, and memory pressure.

Official references:
- https://webllm.mlc.ai/docs/user/get_started.html
- https://webllm.mlc.ai/docs/user/basic_usage.html
- https://github.com/mlc-ai/web-llm/issues/753
