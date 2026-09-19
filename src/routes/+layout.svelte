<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { Layers, LayoutDashboard, Settings, ArrowUpRight } from '@lucide/svelte';
	let { data, children } = $props();
</script>

<svelte:head><meta name="theme-color" content="#1c7258" /></svelte:head>
<a class="skip-link" href="#main">Skip to content</a>
<div class="app-shell">
	<aside class="sidebar">
		<a class="brand" href="/"
			><span class="brand-icon"><Layers size={22} /></span>Workspace<span class="brand-dot">.</span
			></a
		>
		<div class="workspace">
			<span class="workspace-logo">W</span>
			<div><strong>{data.workspaceName}</strong><small>Project starter</small></div>
		</div>
		<p class="nav-label">WORKSPACE</p>
		<nav aria-label="Main navigation">
			<a href="/" aria-current={page.url.pathname === '/' ? 'page' : undefined}
				><LayoutDashboard size={19} />Overview</a
			>
			<a href="/settings" aria-current={page.url.pathname === '/settings' ? 'page' : undefined}
				><Settings size={19} />Settings</a
			>
		</nav>
		<div class="sidebar-bottom">
			<small>A place to build from.</small><a href="/settings"
				>Make it yours <ArrowUpRight size={16} /></a
			>
		</div>
	</aside>
	<div class="main-wrap">
		<header>
			<span
				>{data.workspaceName} <span class="separator">/</span>
				{page.url.pathname === '/settings' ? 'Settings' : 'Overview'}</span
			><span class="demo-pill">Starter workspace</span>
		</header>
		<main id="main" tabindex="-1">{@render children()}</main>
		<footer><span>Solution 3</span><span>Shared foundations · Room to grow</span></footer>
	</div>
</div>
