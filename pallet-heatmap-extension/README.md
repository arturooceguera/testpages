# Pallet Heatmap Auto-Update

A small Chrome / Edge extension that lets the Pallet Heatmap refresh itself, hands-free,
even though the export site sits behind an SSO sign-in.

It downloads the Verification and Ready to Stow exports in the background with your
signed-in session and hands them to the heatmap page. If your sign-in has expired it
opens the export site in a background tab so SSO can sign you back in, then closes it.
When the sign-in needs you to type something, that tab comes to the front after you
press Refresh on the heatmap.

Works in Chrome, Edge and Firefox (128 or newer) from the same folder.

## Set up (once)

1. In `manifest.json`, replace the two placeholders:
   - `https://paste-export-site-domain-here/*` with the export site's address, for example
     `https://export.example.com/*` (the start of your export links, ending in `/*`).
   - `https://paste-heatmap-site-domain-here/*` with the address the heatmap page is
     opened from, for example `https://arturooceguera.github.io/*`.
     The heatmap's Data sources section shows both values ready to copy.
2. Install it in your browser (below).
3. Reload the heatmap page. Data sources shows **Connected**.

### Chrome / Edge

1. Open `chrome://extensions` (Edge: `edge://extensions`) and turn on **Developer mode**.
2. Click **Load unpacked** and pick this folder.

If you open the heatmap as a file on your computer instead of from a web address, also
click **Details** on the extension and turn on **Allow access to file URLs**.

After changing `manifest.json`, press the reload button on the extension's card.

### Firefox

Firefox only keeps add-ons that Mozilla has signed, so there are two ways in:

- **Quick try (until Firefox closes):** open `about:debugging#/runtime/this-firefox`, click
  **Load Temporary Add-on…** and pick `manifest.json` in this folder. Firefox removes it
  when it restarts.
- **Permanent:** get it signed for free as a private add-on. It is not published anywhere.
  1. Fill in the placeholders in `manifest.json` first. Signing locks the file, so any later
     change needs a new signature (and a higher `version`).
  2. Zip the *contents* of this folder (manifest.json at the top of the zip).
  3. On https://addons.mozilla.org/developers/ choose **Submit a New Add-on** →
     **On your own** and upload the zip. The automatic check usually passes in minutes.
  4. Download the signed `.xpi` it gives you and open it in Firefox to install.

  Firefox Developer Edition, Nightly and ESR can also install the unsigned zip if
  `xpinstall.signatures.required` is set to `false` in `about:config`; IT can push that
  setting on company computers.

Then open `about:addons` → **Pallet Heatmap Auto-Update** → **Permissions** and make sure
access to the export site and the heatmap site is turned on.

The export links themselves stay in `DATA_LINKS` in `pallet-heatmap.html`.
