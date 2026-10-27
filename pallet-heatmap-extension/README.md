# Pallet Heatmap Auto-Update

A small Chrome / Edge extension that lets the Pallet Heatmap refresh itself, hands-free,
even though the export site sits behind an SSO sign-in.

It downloads the Verification and Ready to Stow exports in the background with your
signed-in session and hands them to the heatmap page. If your sign-in has expired it
opens the export site in a background tab so SSO can sign you back in, then closes it.
When the sign-in needs you to type something, that tab comes to the front after you
press Refresh on the heatmap.

## Set up (once)

1. In `manifest.json`, replace the two placeholders:
   - `https://paste-export-site-domain-here/*` with the export site's address, for example
     `https://export.example.com/*` (the start of your export links, ending in `/*`).
   - `https://paste-heatmap-site-domain-here/*` with the address the heatmap page is
     opened from, for example `https://arturooceguera.github.io/*`.
     The heatmap's Data sources section shows both values ready to copy.
2. Open `chrome://extensions` (Edge: `edge://extensions`) and turn on **Developer mode**.
3. Click **Load unpacked** and pick this folder.
4. Reload the heatmap page. Data sources shows **Connected**.

If you open the heatmap as a file on your computer instead of from a web address, also
click **Details** on the extension and turn on **Allow access to file URLs**.

After changing `manifest.json`, press the reload button on the extension's card in
`chrome://extensions`.

The export links themselves stay in `DATA_LINKS` in `pallet-heatmap.html`.
