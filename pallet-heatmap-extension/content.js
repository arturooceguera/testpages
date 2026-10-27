/*
 * Runs on the Pallet Heatmap page. Passes the page's refresh requests to the extension's
 * background downloader and hands the downloaded files back to the page.
 */
(function () {
	'use strict';

	const FROM = 'pallet-heatmap-extension';
	const reply = (msg) => window.postMessage(Object.assign({ from: FROM }, msg), '*');
	const hello = () => reply({ type: 'pallet-heatmap:ext-hello', version: chrome.runtime.getManifest().version });

	window.addEventListener('message', (e) => {
		const d = e.data;
		if (e.source !== window || !d || d.from === FROM) return;
		if (d.type === 'pallet-heatmap:ext-ping') { hello(); return; }
		if (d.type !== 'pallet-heatmap:ext-refresh') return;

		let finished = false;
		const port = chrome.runtime.connect({ name: 'pallet-heatmap' });
		port.onMessage.addListener((m) => {
			if (m.type === 'status') reply({ type: 'pallet-heatmap:ext-status', id: d.id, text: m.text });
			if (m.type === 'done') {
				finished = true;
				reply({ type: 'pallet-heatmap:ext-data', id: d.id, files: m.files, errors: m.errors });
				port.disconnect();
			}
		});
		port.onDisconnect.addListener(() => {
			if (!finished) reply({ type: 'pallet-heatmap:ext-data', id: d.id, files: {}, errors: { all: 'The extension stopped before the download finished. Press Refresh to try again.' } });
		});
		port.postMessage({ type: 'refresh', links: d.links, interactive: !!d.interactive, signInPage: d.signInPage || '' });
	});

	hello();
})();
