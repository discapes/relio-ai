type ClientEvent = Record<string, string | number>;
export function installUsageObserver(getScope: () => Record<string, unknown>) {
	let queue: ClientEvent[] = [];
	let timer: ReturnType<typeof setTimeout> | undefined;
	const pageId = crypto.randomUUID();
	let sequence = 0;
	const toggled = new WeakSet<HTMLDetailsElement>();
	const started = performance.now();
	const id = () => crypto.randomUUID();
	const storedId = (storage: Storage, key: string) => {
		const existing = storage.getItem(key);
		if (existing) return existing;
		const value = id();
		storage.setItem(key, value);
		return value;
	};
	let clientId = '',
		tabId = '';
	try {
		clientId = storedId(localStorage, 'relio_usage_client');
		tabId = storedId(sessionStorage, 'relio_usage_tab');
	} catch {
		/* Storage may be unavailable. */
	}
	function flush() {
		try {
			if (timer) clearTimeout(timer);
			timer = undefined;
			if (!queue.length) return;
			const events = queue;
			queue = [];
			const body = JSON.stringify({ events });
			if (!navigator.sendBeacon('/usage', new Blob([body], { type: 'application/json' }))) {
				void fetch('/usage', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body,
					keepalive: true
				}).catch(() => {});
			}
		} catch {
			/* Browser behavior does not depend on analytics. */
		}
	}
	function emit(kind: string, details: ClientEvent = {}) {
		try {
			if (queue.length >= 10) flush();
			const context = getScope();
			const event: ClientEvent = {
				kind,
				...details,
				clientId,
				tabId,
				eventId: `${pageId}:${++sequence}`,
				at: new Date().toISOString(),
				path: (location.pathname + location.search + location.hash).slice(0, 1200),
				elapsedMs: Math.round(performance.now() - started)
			};
			for (const key of ['workspaceId', 'personaId', 'level'])
				if (context[key] !== undefined) event[key] = String(context[key]);
			queue.push(event);
			if (!timer) timer = setTimeout(flush, 1500);
		} catch {
			/* Includes controls disappearing during navigation. */
		}
	}
	const label = (element: Element) =>
		(
			element.getAttribute('aria-label') ||
			element.getAttribute('title') ||
			element.textContent ||
			''
		)
			.trim()
			.replace(/\s+/g, ' ')
			.slice(0, 160);
	const target = (element: Element) =>
		`${element.tagName.toLowerCase()}${element.id ? '#' + element.id : ''}${element.getAttribute('name') ? '[name=' + element.getAttribute('name') + ']' : ''}`.slice(
			0,
			180
		);
	const click = (event: Event) => {
		try {
			const element =
				event.target instanceof Element
					? event.target.closest('a, button, summary, [role="button"]')
					: null;
			if (element?.tagName === 'SUMMARY' && element.parentElement instanceof HTMLDetailsElement)
				toggled.add(element.parentElement);
			if (element)
				emit('click', {
					label: label(element),
					target: target(element),
					...(element instanceof HTMLAnchorElement ? { href: element.href.slice(0, 1200) } : {})
				});
		} catch {
			/* Observer only. */
		}
	};
	const change = (event: Event) => {
		try {
			const element = event.target;
			if (element instanceof HTMLSelectElement)
				emit('change', {
					target: target(element),
					value: element.value.slice(0, 200),
					label: element.selectedOptions[0]?.text || ''
				});
			else if (element instanceof HTMLInputElement && ['checkbox', 'radio'].includes(element.type))
				emit('change', { target: target(element), state: String(element.checked) });
			else if (
				element instanceof HTMLInputElement &&
				(element.type === 'search' || /search|filter|find/i.test(element.placeholder))
			)
				emit('change', { target: target(element), value: element.value.slice(0, 200) });
		} catch {
			/* Observer only. */
		}
	};
	const toggle = (event: Event) => {
		try {
			if (event.target instanceof HTMLDetailsElement && toggled.delete(event.target))
				emit('toggle', {
					target: target(event.target),
					label: label(event.target.querySelector('summary') || event.target),
					state: event.target.open ? 'open' : 'closed'
				});
		} catch {}
	};
	const submit = (event: Event) => {
		try {
			if (event.target instanceof HTMLFormElement)
				emit('submit', {
					label: event.target.dataset.label || '',
					target: target(event.target),
					href: event.target.action
				});
		} catch {}
	};
	const visibility = () => {
		emit('visibility', { state: document.visibilityState });
		if (document.hidden) flush();
	};
	const error = (event: ErrorEvent) => emit('error', { message: event.message.slice(0, 1000) });
	document.addEventListener('click', click, { capture: true, passive: true });
	document.addEventListener('change', change, { capture: true, passive: true });
	document.addEventListener('toggle', toggle, { capture: true, passive: true });
	document.addEventListener('submit', submit, { capture: true, passive: true });
	document.addEventListener('visibilitychange', visibility);
	window.addEventListener('pagehide', flush);
	window.addEventListener('error', error);
	// The initial navigation is recorded server-side; this establishes browser identity.
	emit('visibility', { state: 'initial', width: innerWidth, height: innerHeight });
	return {
		navigate: () => emit('navigation'),
		destroy() {
			flush();
			document.removeEventListener('click', click, true);
			document.removeEventListener('change', change, true);
			document.removeEventListener('toggle', toggle, true);
			document.removeEventListener('submit', submit, true);
			document.removeEventListener('visibilitychange', visibility);
			window.removeEventListener('pagehide', flush);
			window.removeEventListener('error', error);
		}
	};
}
