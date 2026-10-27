/*
 * Pallet Heatmap Auto-Update: downloads the export links with your signed-in session.
 *
 * When the SSO session has expired, it opens the export site in a background tab so the
 * sign-in can finish by itself, then tries again and closes the tab. If the sign-in needs
 * you (a password or a prompt) and you pressed Refresh, the tab is brought to the front.
 */
'use strict';

const QUIET_SIGN_IN_MS = 25000;       // how long to let SSO finish on its own in the background
const USER_SIGN_IN_MS = 5 * 60000;    // how long to wait for you to sign in

chrome.runtime.onConnect.addListener((port) => {
	if (port.name !== 'pallet-heatmap') return;
	port.onMessage.addListener(async (msg) => {
		if (msg.type !== 'refresh') return;
		// Keeps the background worker awake during a long sign-in.
		const keepAlive = setInterval(() => chrome.runtime.getPlatformInfo(() => {}), 20000);
		let result;
		try {
			result = await refresh(msg, port);
		} catch (e) {
			result = { files: {}, errors: { all: String((e && e.message) || e) } };
		} finally {
			clearInterval(keepAlive);
		}
		try { port.postMessage(Object.assign({ type: 'done' }, result)); } catch (e) { /* page closed */ }
	});
});

const originOf = (url) => new URL(url).origin;

async function allowed(url) {
	try { return await chrome.permissions.contains({ origins: [originOf(url) + '/*'] }); }
	catch (e) { return false; }
}

function toBase64(buf) {
	const bytes = new Uint8Array(buf);
	let s = '';
	for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
	return btoa(s);
}

/** One export download. { data } on success, { signIn: true } when the session has expired. */
async function download(url) {
	let res;
	try {
		res = await fetch(url, { credentials: 'include', cache: 'no-store' });
	} catch (e) {
		return { signIn: true };   // redirected to the SSO page, which the extension cannot read
	}
	if (res.status === 401 || res.status === 403) return { signIn: true };
	if (res.redirected && originOf(res.url) !== originOf(url)) return { signIn: true };
	if (!res.ok) return { error: 'HTTP ' + res.status };
	const buf = await res.arrayBuffer();
	// A sign-in form served by the export site itself instead of the file.
	if (/text\/html/i.test(res.headers.get('content-type') || '') &&
		/type\s*=\s*["']?password/i.test(new TextDecoder().decode(buf.slice(0, 200000)))) return { signIn: true };
	return { data: toBase64(buf) };
}

async function refresh(msg, port) {
	const files = {}, errors = {};
	const links = Object.entries(msg.links || {}).filter((l) => /^https?:\/\//i.test(l[1] || ''));
	const retry = [];
	for (const [key, url] of links) {
		if (!(await allowed(url))) {
			errors[key] = 'the extension is not allowed to open ' + originOf(url) + '. Put that address in host_permissions in manifest.json, then reload the extension.';
			continue;
		}
		const r = await download(url);
		if (r.data) files[key] = r.data;
		else if (r.signIn) retry.push([key, url]);
		else errors[key] = r.error;
	}

	// Sign in once per export site, then try those downloads again.
	const origins = Array.from(new Set(retry.map((r) => originOf(r[1]))));
	for (const origin of origins) {
		const page = msg.signInPage && originOf(msg.signInPage) === origin ? msg.signInPage : origin + '/';
		const ok = await signIn(origin, page, msg.interactive, port);
		for (const [key, url] of retry.filter((r) => originOf(r[1]) === origin)) {
			const r = ok ? await download(url) : { signIn: true };
			if (r.data) files[key] = r.data;
			else errors[key] = r.signIn
				? 'the export site needs you to sign in. Press Refresh on the heatmap to sign in.'
				: r.error;
		}
	}
	return { files, errors };
}

async function signIn(origin, page, interactive, port) {
	port.postMessage({ type: 'status', text: 'Signing in to the export site…' });
	const tab = await chrome.tabs.create({ url: page, active: false });
	try {
		if (await landedOn(tab.id, origin, QUIET_SIGN_IN_MS)) return true;
		if (!interactive) return false;

		port.postMessage({ type: 'status', text: 'Sign in on the export site tab. The heatmap updates when you are done.' });
		const t = await chrome.tabs.update(tab.id, { active: true });
		await chrome.windows.update(t.windowId, { focused: true });
		const ok = await landedOn(tab.id, origin, USER_SIGN_IN_MS);
		// Back to the heatmap.
		const heatmapTab = port.sender && port.sender.tab;
		if (heatmapTab) {
			chrome.tabs.update(heatmapTab.id, { active: true }).catch(() => {});
			chrome.windows.update(heatmapTab.windowId, { focused: true }).catch(() => {});
		}
		return ok;
	} finally {
		chrome.tabs.remove(tab.id).catch(() => {});
	}
}

/** Resolves true once the tab has finished loading a page on the export site. */
function landedOn(tabId, origin, ms) {
	return new Promise((resolve) => {
		let done = false;
		const finish = (value) => {
			if (done) return;
			done = true;
			clearTimeout(timer);
			chrome.tabs.onUpdated.removeListener(onUpdated);
			chrome.tabs.onRemoved.removeListener(onRemoved);
			resolve(value);
		};
		const check = (tab) => {
			if (tab && tab.status === 'complete' && tab.url && tab.url.indexOf(origin + '/') === 0) finish(true);
		};
		const onUpdated = (id, info, tab) => { if (id === tabId) check(tab); };
		const onRemoved = (id) => { if (id === tabId) finish(false); };
		const timer = setTimeout(() => finish(false), ms);
		chrome.tabs.onUpdated.addListener(onUpdated);
		chrome.tabs.onRemoved.addListener(onRemoved);
		chrome.tabs.get(tabId).then(check, () => finish(false));
	});
}
