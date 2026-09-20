<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll, goto, afterNavigate, beforeNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import {
		ArrowUpRight,
		BookOpen,
		CalendarDays,
		ChevronRight,
		CircleHelp,
		FileText,
		GitBranch,
		Mail,
		MessageSquare,
		Plus,
		RefreshCw,
		Search,
		ShieldCheck,
		LayoutDashboard,
		Trash2,
		Users
	} from '@lucide/svelte';
	import Evidence from '$lib/components/Evidence.svelte';
	import ChatStream from '$lib/components/ChatStream.svelte';
	import GuideArticle from '$lib/components/GuideArticle.svelte';
	import NameText from '$lib/components/NameText.svelte';
	import { affiliation } from '$lib/people';
	import Badge from '$lib/components/Badge.svelte';
	import relexLogo from '$lib/assets/relex_logo.svg';
	import MemoryGraph from '$lib/components/MemoryGraph.svelte';
	import type { WorkspaceData, Answer, Source, Mail as MailRecord } from '$lib/types';
	let {
		data,
		form
	}: {
		data: WorkspaceData;
		form?: { answer?: Answer; error?: string; success?: string | boolean; mail?: MailRecord };
	} = $props();
	const view = $derived(page.url.searchParams.get('view') || 'workspace');
	const viewTitle = $derived(
		(
			{
				workspace: 'My workspace',
				memory: 'Project memory',
				people: 'People',
				email: 'Email demo',
				design: 'Design',
				'how-to-use': 'How to use',
				about: 'How it works',
				practice: 'Practice answers'
			} as Record<string, string>
		)[view] || 'My workspace'
	);
	const firstName = $derived(data.context.persona.name.split(' ')[0]);
	let sessionPersona = $state('');
	let sessionLevel = $state(0);
	const selectedSessionPersona = $derived(
		data.personas.find((p) => p.id === (sessionPersona || data.context.persona.id)) ??
			data.context.persona
	);
	let busy = $state('');
	let search = $state('');
	let memoryTab = $state('sources');
	let personSearch = $state('');
	const selectedPerson = $derived(page.url.searchParams.get('person') || '');
	let organization = $state('all');
	let confirmErase = $state(false);
	let preferenceText = $state('');
	let preferenceId = $state('');
	let promoteText = $state('');
	let previewPromote = $state(false);
	let showMemory = $state(false);
	let showDemo = $state(false);
	let navigating = false;
	let pollController: AbortController | undefined;
	beforeNavigate(() => {
		navigating = true;
		pollController?.abort();
	});
	afterNavigate(() => {
		showDemo = false;
		navigating = false;
	});
	let to = $state('');
	let cc = $state('');
	let subject = $state('');
	let body = $state('');
	let threadId = $state('');
	let eventId = $state('');
	let mailId = $state('');
	let composing = $state(false);
	let includeAgent = $state(false);
	const agent = 'acme-memory@relexsolutions.example';
	const action: SubmitFunction = ({ formElement }) => {
		const started = {
			workspaceId: data.context.workspaceId,
			epoch: data.context.epoch,
			personaId: data.context.persona.id,
			level: data.context.level
		};
		busy = formElement.dataset.label || 'Working';
		return async ({ update }) => {
			try {
				const current = await fetch('/state').then((r) => r.json());
				if (
					Object.keys(started).some((key) => current[key] !== started[key as keyof typeof started])
				) {
					form = undefined;
					await invalidateAll();
				} else await update({ reset: false });
			} finally {
				busy = '';
			}
		};
	};
	let searchedSources = $state<Source[] | null>(null);
	let searchBusy = $state(false);
	let searchTotal = $state(0);
	let sourceOffset = $state(0);
	let searchRequest: AbortController | undefined;
	let searchGeneration = 0;
	const sourceScope = $derived(
		JSON.stringify({
			workspaceId: data.context.workspaceId,
			epoch: data.context.epoch,
			personaId: data.context.persona.id,
			level: data.context.level
		})
	);
	function cancelSourceRequest() {
		searchGeneration++;
		searchRequest?.abort();
		searchBusy = false;
	}
	async function fetchSources(query: string, offset: number) {
		cancelSourceRequest();
		const generation = searchGeneration;
		const scope = sourceScope;
		const controller = new AbortController();
		searchRequest = controller;
		searchBusy = true;
		try {
			const response = await fetch(`/search?q=${encodeURIComponent(query)}&offset=${offset}`, {
				signal: controller.signal,
				cache: 'no-store'
			});
			if (!response.ok) throw new Error('Source search failed.');
			const next = await response.json();
			const current = await fetch('/state', { signal: controller.signal, cache: 'no-store' }).then(
				(r) => r.json()
			);
			if (
				generation !== searchGeneration ||
				scope !== sourceScope ||
				query !== search ||
				controller.signal.aborted
			)
				return;
			if (Object.entries(JSON.parse(scope)).some(([key, value]) => current[key] !== value)) {
				await invalidateAll();
				return;
			}
			searchedSources = [...(offset ? searchedSources || [] : []), ...next.sources];
			sourceOffset = offset + next.sources.length;
			searchTotal = next.total;
		} catch {
			/* A changed query or access scope discards its pending response. */
		} finally {
			if (generation === searchGeneration) searchBusy = false;
		}
	}
	function loadMoreSources() {
		return fetchSources(search, sourceOffset);
	}
	$effect(() => {
		const query = search;
		void sourceScope;
		cancelSourceRequest();
		searchedSources = null;
		sourceOffset = 0;
		searchTotal = 0;
		if (!query.trim()) return;
		const timer = setTimeout(() => {
			void fetchSources(query, 0);
		}, 200);
		return () => {
			clearTimeout(timer);
			cancelSourceRequest();
		};
	});
	afterNavigate(cancelSourceRequest);
	const visibleSources = $derived(searchedSources || data.sources);
	const visibleClaims = $derived(
		data.claims.filter((c) =>
			`${c.kind} ${c.status} ${c.text}`.toLowerCase().includes(search.toLowerCase())
		)
	);
	const people = $derived(
		data.people.filter(
			(p) =>
				`${p.name} ${p.role} ${affiliation(p).label} ${p.aliases.join(' ')}`
					.toLowerCase()
					.includes(personSearch.toLowerCase()) &&
				(organization === 'all' || affiliation(p).kind === organization)
		)
	);
	const person = $derived(data.people.find((p) => p.id === selectedPerson));
	const selectedMail = $derived(data.mails.find((m) => m.id === mailId));
	const thread = $derived(
		selectedMail
			? data.mails
					.filter((m) => m.threadId === selectedMail.threadId)
					.sort((a, b) => a.date.localeCompare(b.date))
			: []
	);
	const threads = $derived(
		data.mails.filter((m, i, list) => list.findIndex((x) => x.threadId === m.threadId) === i)
	);
	const running = $derived(
		data.jobs.filter((j) => ['queued', 'running', 'pending'].includes(j.status))
	);
	function setAgent(value: boolean) {
		includeAgent = value;
		cc = cc
			.split(',')
			.map((v) => v.trim())
			.filter((v) => v && v !== agent)
			.concat(value ? [agent] : [])
			.join(', ');
	}
	function compose(mail?: MailRecord) {
		composing = true;
		subject = mail ? (mail.subject.startsWith('Re:') ? mail.subject : `Re: ${mail.subject}`) : '';
		to = mail ? (mail.from === data.context.persona.email ? mail.to.join(', ') : mail.from) : '';
		cc = mail?.cc.join(', ') || '';
		body = '';
		threadId = mail?.threadId || '';
		eventId = crypto.randomUUID();
		includeAgent = cc.includes(agent);
	}
	function scenario(kind: string) {
		compose();
		includeAgent = true;
		if (kind === 'schedule') {
			threadId = 'emails/19_meridian-environment-access';
			subject = 'Re: Meridian - environment access';
			to = 'priya.nair@acme-org.example';
			cc = `n.haddad@relexsolutions.example, ${agent}`;
			body =
				"For everyone's calendar: I have scheduled the bakery evidence review for Thursday 9 July at 10:00 Helsinki time. I will prepare the comparison of prepared extracts and a separate environment, including the earlier access decision and the setup estimate. Priya, please bring any updated requirements from Acme. Nadia, please bring the current integration questions.\n\n" +
				firstName;
		} else {
			threadId = 'emails/15_uat-signoff';
			subject = 'Re: UAT sign-off - core replenishment';
			to = 'lena.fischer@acme-org.example';
			cc = `marco.rossi@relexsolutions.example, ${agent}`;
			body =
				'Lena,\n\nFor the steering pack I have described the January 2025 sign-off as acceptance of the whole programme, including fresh categories. I am carrying that wording into the approval summary.\n\n' +
				firstName;
		}
	}
	onMount(() => {
		const timer = setInterval(() => {
			if (navigating || pollController) return;
			const controller = new AbortController();
			pollController = controller;
			void fetch('/state', { signal: controller.signal })
				.then((r) => r.json())
				.then(async (state) => {
					if (controller.signal.aborted || navigating) return;
					if (
						state.workspaceId !== data.context.workspaceId ||
						state.epoch !== data.context.epoch ||
						state.personaId !== data.context.persona.id ||
						state.level !== data.context.level
					) {
						form = undefined;
						searchedSources = null;
						search = '';
						mailId = '';
						body = '';
						to = '';
						cc = '';
						subject = '';
						preferenceText = '';
						preferenceId = '';
						promoteText = '';
						previewPromote = false;
						composing = false;
						await invalidateAll();
					} else if (
						(running.length || (view === 'people' && selectedPerson && !data.personGuidance)) &&
						!busy &&
						!data.reviewerGuide
					) {
						await invalidateAll();
					}
				})
				.catch(() => {})
				.finally(() => {
					if (pollController === controller) pollController = undefined;
				});
		}, 4500);
		return () => {
			clearInterval(timer);
			pollController?.abort();
		};
	});
</script>

<svelte:head
	><title>{viewTitle} · Receipt</title><meta
		name="description"
		content="Your Acme project memory, with evidence for every answer."
	/></svelte:head
>
<a class="skip-link" href="#main">Skip to content</a>
<div class="app-shell">
	<aside class="sidebar" aria-label="Workspace navigation">
		<a class="brand" href="/" aria-label="RELEX workspace"
			><img src={relexLogo} alt="RELEX" width="145" height="44" /></a
		>
		<div class="workspace">
			<span class="workspace-logo">A</span>
			<div><strong>Acme Org</strong></div>
			<ChevronRight size={16} />
		</div>
		<p class="nav-label">YOUR WORKSPACE</p>
		<nav aria-label="Main navigation">
			<a href="/?view=workspace" aria-current={view === 'workspace' ? 'page' : undefined}
				><LayoutDashboard size={19} />My workspace</a
			>
			<a href="/?view=memory" aria-current={view === 'memory' ? 'page' : undefined}
				><GitBranch size={19} />Project memory<span class="nav-count">{data.stats.documents}</span
				></a
			>
			<a href="/?view=people" aria-current={view === 'people' ? 'page' : undefined}
				><Users size={19} />People</a
			>
			<a href="/?view=design" aria-current={view === 'design' ? 'page' : undefined}
				><FileText size={19} />Design</a
			>
			<a href="/?view=how-to-use" aria-current={view === 'how-to-use' ? 'page' : undefined}
				><BookOpen size={19} />How to use</a
			>
			<a href="/?view=about" aria-current={view === 'about' ? 'page' : undefined}
				><CircleHelp size={19} />How it works</a
			>
			<a href="/?view=practice" aria-current={view === 'practice' ? 'page' : undefined}
				><MessageSquare size={19} />Practice answers</a
			>
		</nav>
		<div class="demo-nav">
			<span class="nav-label">DEMONSTRATION</span><a
				href="/?view=email"
				class:active={view === 'email'}><Mail size={19} />Email demo<ArrowUpRight size={16} /></a
			>
		</div>
		<div class="sidebar-bottom">
			<div class="connection" title="GLM 5.3 Flash on Verda (formerly DataCrunch), Helsinki">
				<span></span>Verda · Helsinki
			</div>
			<div class="profile">
				<span class="avatar"
					>{data.context.persona.name
						.split(' ')
						.map((n) => n[0])
						.join('')}</span
				>
				<div>
					<strong>{data.context.persona.name}</strong><small>{data.context.persona.role}</small>
				</div>
			</div>
		</div>
	</aside>
	<div class="main-wrap">
		<header class="topbar">
			<div>
				Acme Org<span class="separator">/</span><strong>{viewTitle}</strong>
			</div>
			<div class="header-right">
				<span class="access-pill"
					><ShieldCheck size={15} />L{data.context.level} · {data.context.level === 1
						? 'Customer-shareable'
						: data.context.level === 2
							? 'RELEX internal'
							: 'Restricted'}</span
				><button
					class="text-button"
					aria-expanded={showDemo}
					aria-controls="view-settings"
					onclick={() => (showDemo = !showDemo)}>Switch view</button
				>
			</div>
		</header>
		{#if showDemo}<section class="demo-controls" id="view-settings" aria-label="Switch view">
				<div>
					<strong>Switch view</strong>
					<p>
						Choose a simulated employee and their permitted access level. Each browser has its own
						workspace.
					</p>
				</div>
				<form method="POST" action="/session" class="session-form">
					<label
						>Employee<select
							name="personaId"
							value={sessionPersona || data.context.persona.id}
							onchange={(e) => {
								sessionPersona = e.currentTarget.value;
								sessionLevel = data.personas.find((p) => p.id === sessionPersona)?.level || 1;
							}}
							>{#each data.personas as persona}<option value={persona.id}
									>{persona.name} · {persona.role}</option
								>{/each}</select
						></label
					><label
						>View level<select name="level" value={sessionLevel || data.context.level}
							><option value="1">L1 · Customer-shareable</option
							>{#if selectedSessionPersona.level >= 2}<option value="2">L2 · RELEX internal</option
								>{/if}{#if selectedSessionPersona.level >= 3}<option value="3"
									>L3 · Restricted</option
								>{/if}</select
						></label
					><button class="button">Apply</button>
				</form>
				<form
					method="POST"
					action="?/reset"
					use:enhance={action}
					data-label="Creating a new demo workspace"
				>
					<button
						class="text-button"
						onclick={(e) => {
							if (
								!confirm(
									'Create a fresh isolated demonstration workspace? The current workspace remains stored.'
								)
							)
								e.preventDefault();
						}}>Start a fresh demo</button
					>
				</form>
			</section>{/if}
		<main id="main">
			{#if data.sessionNotice}<p class="notice" role="status">{data.sessionNotice}</p>{/if}
			{#if (busy && busy !== 'Reading project evidence') || running.length}<div
					class="working"
					role="status"
				>
					<span class="spinner"></span>{busy && busy !== 'Reading project evidence'
						? busy
						: `Preparing ${running[0]?.kind.replaceAll('_', ' ')}`}<small
						>You can keep exploring the project.</small
					>
				</div>{/if}
			{#each data.jobs.filter((j) => j.status === 'failed') as job}<div class="notice error-notice">
					<strong>{job.kind.replaceAll('_', ' ')} needs attention</strong>
					<p>{job.error || 'The latest attempt did not complete.'}</p>
					<form
						method="POST"
						action="?/retryJob"
						use:enhance={action}
						data-label="Retrying background preparation"
					>
						<input type="hidden" name="id" value={job.id} /><button
							class="text-button"
							disabled={!!busy}>Retry preparation</button
						>
					</form>
				</div>{/each}
			{#if form?.error}<div class="notice error-notice" role="alert">{form.error}</div>{/if}
			{#if form?.success}<div class="notice" role="status">
					{typeof form.success === 'string' ? form.success : 'Update completed.'}
				</div>{/if}
			{#if view === 'workspace'}
				<div class="page-heading">
					<div>
						<p class="eyebrow">YOUR ACME PROJECT</p>
						<h1>Good morning, {firstName}.</h1>
						<p>Your project context, ready for the day ahead.</p>
					</div>
					<div class="date-mark">
						<CalendarDays size={18} />
						<div><strong>Monday, 6 July 2026</strong><small>Demonstration project date</small></div>
					</div>
				</div>
				<div class="workspace-grid">
					<div class="main-column">
						<section class="card brief-card">
							<div class="section-heading">
								<div class="heading-icon">
									<BookOpen size={20} />
									<h2>Your morning brief</h2>
								</div>
								<form
									method="POST"
									action="?/refreshBrief"
									use:enhance={action}
									data-label="Refreshing your morning brief"
								>
									<button class="text-button" disabled={!!busy}
										><RefreshCw size={15} />Refresh</button
									>
								</form>
							</div>
							<div class="brief-context">
								<span class="status-dot"></span>Prepared for {data.context.persona.role}<span
									>Archive through {data.archiveDate}</span
								>
							</div>
							<div class="card-body">
								{#if data.brief}<Evidence
										people={data.people}
										answer={data.brief}
										compact
									/>{:else}<div class="brief-empty">
										<BookOpen size={30} />
										<h3>Your briefing is being prepared</h3>
										<p>
											Receipt is reading the project's evidence, your responsibilities and followed
											topics. The prepared brief will stay here between visits.
										</p>
										<form
											method="POST"
											action="?/refreshBrief"
											use:enhance={action}
											data-label="Preparing your first brief"
										>
											<button class="button secondary" disabled={!!busy}>Prepare my brief</button>
										</form>
									</div>{/if}
							</div>
							<div class="brief-bottom">
								<ShieldCheck size={16} />Uses your permitted project evidence and personal
								preferences
							</div>
						</section>
						<section class="card conversation" id="conversation">
							<div class="section-heading">
								<div class="heading-icon">
									<MessageSquare size={20} />
									<h2>Ask your project</h2>
								</div>
								<span class="subtle">Private to you</span>
							</div>
							<div class="card-body">
								<p class="section-description">
									Find an agreement, prepare a conversation, or ask what changed.
								</p>
								<ChatStream
									context={data.context}
									people={data.people}
									onanswer={(answer) => {
										form = { answer };
									}}
									onbusy={(value) => {
										busy = value ? 'Reading project evidence' : '';
									}}
									disabled={!!busy}
								/>
								{#if form?.answer}<div class="answer-result">
										<Evidence people={data.people} answer={form.answer} />
									</div>{/if}{#each [...data.chat]
									.reverse()
									.slice(0, 8) as answer}{#if answer.id !== form?.answer?.id}<div
											class="answer-result"
										>
											<Evidence people={data.people} {answer} />
										</div>{/if}{/each}
							</div>
						</section>
					</div>
					<aside class="right-column" aria-label="Personal context">
						<section class="card personal-card">
							<div class="section-heading">
								<h2>Your focus</h2>
								<button class="text-button" onclick={() => (showMemory = !showMemory)}
									>{showMemory ? 'Close' : 'Manage'}</button
								>
							</div>
							<div class="card-body">
								<p class="section-description">What your assistant remembers for you.</p>
								{#if !data.preferences.length}<p class="muted">
										Add a topic or goal to shape your next briefing.
									</p>{/if}{#each data.preferences as preference}<div class="preference">
										<span class="focus-dot"></span>
										<p>{preference.text}</p>
										{#if showMemory}<div class="preference-actions">
												<button
													class="text-button"
													onclick={() => {
														preferenceText = preference.text;
														preferenceId = preference.id;
													}}>Edit</button
												>
												<form
													method="POST"
													action="?/forgetPreference"
													use:enhance={action}
													data-label="Forgetting preference"
												>
													<input type="hidden" name="id" value={preference.id} /><button
														class="icon-button small"
														aria-label="Forget this preference"><Trash2 size={15} /></button
													>
												</form>
											</div>{/if}
									</div>{/each}
								<form
									method="POST"
									action="?/preference"
									use:enhance={action}
									data-label="Saving personal memory"
									class="stack-form"
								>
									<input type="hidden" name="id" value={preferenceId} /><label for="preference"
										>{preferenceId ? 'Edit remembered goal' : 'Follow a topic'}</label
									><textarea
										id="preference"
										name="text"
										bind:value={preferenceText}
										rows="2"
										required
										placeholder="Follow bakery integration and Acme decisions"></textarea><button
										class="button secondary"
										disabled={!!busy}
										><Plus size={15} />{preferenceId ? 'Save changes' : 'Remember this'}</button
									>
								</form>
							</div>
						</section>
						<section class="card">
							<div class="section-heading">
								<div class="heading-icon">
									<CalendarDays size={18} />
									<h2>Coming up</h2>
								</div>
							</div>
							<div class="card-body">
								<p class="section-description">Simulated calendar · Helsinki time</p>
								{#each data.meetings as meeting}<div class="meeting">
										<span class="eyebrow"
											>{new Intl.DateTimeFormat('en-GB', {
												weekday: 'short',
												day: 'numeric',
												month: 'short',
												hour: '2-digit',
												minute: '2-digit',
												timeZone: 'Europe/Helsinki'
											}).format(new Date(meeting.date))}</span
										>
										<h3><NameText text={meeting.title} people={data.people} /></h3>
										<p><NameText text={meeting.purpose} people={data.people} /></p>
										<small
											><NameText text={meeting.attendees.join(' · ')} people={data.people} /></small
										>
										<form
											method="POST"
											action="?/refreshBrief"
											use:enhance={action}
											data-label="Preparing for your meeting"
										>
											<input type="hidden" name="meetingId" value={meeting.id} /><button
												class="text-button"
												disabled={!!busy}>Prepare for this meeting<ArrowUpRight size={15} /></button
											>
										</form>
									</div>{/each}
							</div>
						</section>
						<details class="card personal-note">
							<summary>Share a private note with the project</summary>
							<div class="card-body">
								<label for="promote">Note content</label><textarea
									id="promote"
									bind:value={promoteText}
									rows="3"
									placeholder="Write the information you want to share"></textarea><button
									class="button secondary"
									onclick={() => (previewPromote = true)}
									disabled={!promoteText.trim()}>Preview sharing</button
								>{#if previewPromote}<form
										method="POST"
										action="?/promote"
										use:enhance={action}
										data-label="Adding your note to project memory"
										class="stack-form"
									>
										<strong>Preview · Acme Org</strong>
										<p>{promoteText}</p>
										<input type="hidden" name="text" value={promoteText} /><label
											>Shared access level<select name="level"
												>{#each [1, 2, 3].filter((l) => l <= data.context.level) as level}<option
														value={level}
														>L{level} · {level === 1
															? 'Customer-shareable'
															: level === 2
																? 'RELEX internal'
																: 'Restricted'}</option
													>{/each}</select
											></label
										><small
											>This note will be attributed to {data.context.persona.name} and available to project
											members at this level.</small
										><button class="button" disabled={!!busy}>Add to project memory</button>
									</form>{/if}
							</div>
						</details>
					</aside>
				</div>
			{:else if view === 'memory'}
				<div class="page-heading">
					<div>
						<p class="eyebrow">ACME ORG</p>
						<h1>Project memory</h1>
						<p>Explore the conversations and decisions behind the current picture.</p>
					</div>
					<div class="count-label">
						<strong>{data.stats.sources.toLocaleString()}</strong><span
							>permitted source passages</span
						>
					</div>
				</div>
				<div class="memory-toolbar">
					<div class="segmented">
						<button class:chosen={memoryTab === 'sources'} onclick={() => (memoryTab = 'sources')}
							><FileText size={16} />Sources</button
						><button class:chosen={memoryTab === 'claims'} onclick={() => (memoryTab = 'claims')}
							>Decisions & observations</button
						><button class:chosen={memoryTab === 'graph'} onclick={() => (memoryTab = 'graph')}
							><GitBranch size={16} />Graph</button
						>
					</div>
					<label class="search"
						><Search size={18} /><input
							aria-label="Search project memory"
							bind:value={search}
							placeholder="Search topics, people, passages…"
						/></label
					>
				</div>
				{#if memoryTab === 'graph'}<section class="card">
						<div class="section-heading">
							<h2>Evidence connections</h2>
							<span class="subtle">Select a numbered claim to inspect its sources</span>
						</div>
						<MemoryGraph people={data.people} claims={visibleClaims} sources={data.sources} />
					</section>{:else if memoryTab === 'claims'}<div class="claims-grid">
						{#each visibleClaims.slice(0, 60) as claim}<article class="card claim-card">
								<div class="pills">
									<span class="badge">{claim.kind.replaceAll('_', ' ')}</span><Badge
										status={claim.status}>{claim.status}</Badge
									><span class="subtle">L{claim.level}</span>
								</div>
								<p><NameText text={claim.text} people={data.people} /></p>
								<div class="claim-sources">
									{#each claim.sourceIds.slice(0, 4) as id, i}<a
											href={`/source/${encodeURIComponent(id)}`}
											><FileText size={14} />Source {i + 1}<ArrowUpRight size={13} /></a
										>{/each}
								</div>
							</article>{/each}
					</div>
					{#if !visibleClaims.length}<div class="empty card">
							No matching claims. Source records remain available in the Sources view.
						</div>{/if}{:else}<section class="card source-list">
						<div class="list-head">
							<strong>{visibleSources.length.toLocaleString()} matching passages</strong><span
								class="subtle">Search the complete archive or load more passages</span
							>
						</div>
						{#each visibleSources as source}<article class="source-row">
								<span class="source-icon"
									>{#if source.type === 'email'}<Mail size={19} />{:else}<FileText
											size={19}
										/>{/if}</span
								>
								<div>
									<div class="source-title">
										<a href={`/source/${encodeURIComponent(source.id)}`}
											><strong>{source.title}</strong></a
										><span class="badge">L{source.level}</span>
									</div>
									<small
										><NameText text={source.author} people={data.people} /> · {source.date} · {source.position}</small
									>
									<p>
										<NameText text={source.text.slice(0, 190)} people={data.people} />{source.text
											.length > 190
											? '…'
											: ''}
									</p>
								</div>
								<a
									aria-label={`Open source: ${source.title}`}
									href={`/source/${encodeURIComponent(source.id)}`}><ArrowUpRight size={18} /></a
								>
							</article>{/each}{#if !visibleSources.length}<div class="empty">
								No passages match this search.
							</div>{/if}
					</section>{/if}
				{#if memoryTab === 'sources'}<div class="source-pagination">
						<button
							class="button secondary"
							onclick={loadMoreSources}
							disabled={searchBusy || (searchedSources !== null && sourceOffset >= searchTotal)}
							>{searchBusy
								? 'Searching archive…'
								: searchedSources === null
									? 'Browse all source passages'
									: 'Load more passages'}</button
						>{#if searchTotal}<small>{searchedSources?.length || 0} of {searchTotal} matches</small
							>{/if}
					</div>{/if}
				<section class="card share-card">
					<div>
						<h2>Share an evidence card</h2>
						<p>Create a customer-shareable answer from L1 sources.</p>
					</div>
					<form
						method="POST"
						action="?/share"
						use:enhance={action}
						data-label="Preparing a customer-shareable answer"
					>
						<label class="sr-only" for="share-question">Question for the evidence card</label><input
							id="share-question"
							name="question"
							required
							placeholder="What was approved in the January UAT sign-off?"
						/><button class="button" disabled={!!busy}>Create preview</button>
					</form>
					{#if form?.answer}<Evidence people={data.people} answer={form.answer} />{/if}
				</section>
			{:else if view === 'people'}
				<div class="page-heading">
					<div>
						<p class="eyebrow">ACME ORG</p>
						<h1>People & context</h1>
						<p>Roles, expressed priorities and the evidence for your next conversation.</p>
					</div>
				</div>
				<div class="people-layout">
					<section class="card">
						<div class="card-body">
							<label class="search"
								><Search size={18} /><input
									bind:value={personSearch}
									placeholder="Find a person"
									aria-label="Find a person"
								/></label
							>
						</div>
						<div class="people-filter">
							<label for="organization">Organization</label><select
								id="organization"
								bind:value={organization}
								><option value="all">All organizations</option><option value="customer"
									>Acme · Customer</option
								><option value="relex">RELEX</option><option value="partner"
									>Meridian · Partner</option
								><option value="other">Other organizations</option><option value="unknown"
									>Unconfirmed / multiple</option
								></select
							>
						</div>
						<div class="people-list">
							{#each people as p}<button
									class:selected={person?.id === p.id}
									onclick={() => {
										void goto(`/?view=people&person=${encodeURIComponent(p.id)}`, {
											keepFocus: true,
											noScroll: true
										});
										confirmErase = false;
									}}
									><span class="avatar"
										>{p.name
											.split(' ')
											.map((n) => n[0])
											.slice(0, 2)
											.join('')}</span
									><span
										><strong>{p.name}</strong><span class="organization-label"
											>{affiliation(p).label}</span
										><small>{p.role || 'Project participant'}</small></span
									><ChevronRight size={16} /></button
								>{/each}
						</div>
					</section>
					<section class="card person-detail">
						{#if person}<div class="card-body">
								<span class="badge" title={affiliation(person).basis}
									>{affiliation(person).label}</span
								>
								<h2>{person.name}</h2>
								<p>{person.role}</p>
								<p class="subtle">{affiliation(person).basis}</p>
								<small>{person.email}</small>{#if person.aliases.length}<p class="alias-list">
										Recorded names: {person.aliases.join(', ')}
									</p>{/if}

								<p class="section-description">
									{affiliation(person).kind === 'customer'
										? 'Review expressed priorities, responses to proposals and suggested next steps.'
										: affiliation(person).kind === 'relex'
											? 'Review responsibilities, shared decisions and open handoffs with this colleague.'
											: 'Review their recorded role, contributions and open questions.'}
								</p>
								{#if data.personGuidance}<Evidence
										people={data.people}
										answer={data.personGuidance}
									/>{:else}<p class="subtle" role="status">
										Preparing guidance for this project view…
									</p>{/if}
								<h3 class="section-subheading">Source connections</h3>
								{#each person.sourceIds.slice(0, 8) as id}{@const s = data.sources.find(
										(s) => s.id === id
									)}{#if s}<a class="person-source" href={`/source/${encodeURIComponent(id)}`}
											><FileText size={16} /><span
												>{s.title}<small>{s.date} · {s.author}</small></span
											><ArrowUpRight size={15} /></a
										>{/if}{/each}{#if data.context.level === 3}<div class="erasure-box">
										<h3>Remove this person</h3>
										<p>
											Erase identifying material from this workspace's source copies and invalidate
											affected answers, briefs and other derived content.
										</p>
										<button
											class="button danger secondary"
											onclick={() => (confirmErase = !confirmErase)}>Review erasure</button
										>{#if confirmErase}<form
												method="POST"
												action="?/erase"
												use:enhance={action}
												data-label="Erasing person and checking affected memory"
											>
												<input type="hidden" name="personId" value={person.id} />
												<p>
													Remove {person.name} from this workspace? This operation persists across restarts.
													Evidence independently supported by other people can remain.
												</p>
												<button class="button danger" disabled={!!busy}
													>Confirm person erasure</button
												>
											</form>{/if}
									</div>{/if}
							</div>{:else}<div class="person-empty">
								<Users size={38} />
								<h2>Select a person</h2>
								<p>
									Inspect their role, source connections and evidence-backed conversation guidance.
								</p>
							</div>{/if}
					</section>
				</div>
				{#if data.receipts.length}<section class="card receipt-history">
						<div class="section-heading"><h2>Erasure receipts</h2></div>
						<div class="card-body">
							{#each data.receipts as receipt}<div class="erasure-receipt">
									<ShieldCheck size={19} />
									<div>
										<strong>Erasure completed</strong>
										<p>
											{receipt.sourcesRemoved} source records affected · {receipt.artifactsRemoved} derived
											artifacts removed
										</p>
										<small>{receipt.createdAt} · Receipt {receipt.id}</small>
									</div>
								</div>{/each}
						</div>
					</section>{/if}
			{:else if view === 'email'}
				<div class="page-heading">
					<div>
						<p class="eyebrow">DEMONSTRATION · EMPLOYEE EMAIL</p>
						<h1>Acme, in your inbox.</h1>
						<p>
							This simulator represents {data.context.persona.name}'s email. Add the project agent
							in Cc to bring a conversation into shared memory.
						</p>
					</div>
					<button class="button" onclick={() => compose()}><Plus size={17} />New message</button>
				</div>
				<div class="scenario-bar">
					<span>Load an editable example</span><button onclick={() => scenario('schedule')}
						>1. Schedule the bakery review</button
					><button onclick={() => scenario('scope')}>2. Continue the UAT discussion</button><small
						>Demo additions · 6 July 2026 · Helsinki</small
					>
				</div>
				<div class="outlook">
					<div class="outlook-top">
						<span class="outlook-mark">O</span><strong>Mail</strong><span
							>{data.context.persona.email}</span
						><span class="sim-badge">Simulated Outlook</span>
					</div>
					<div class="mail-layout">
						<aside class="mail-list" aria-label="Mail folders and threads">
							<div class="mail-list-heading">
								<strong>Inbox & sent</strong><span>{threads.length}</span>
							</div>
							{#each threads.slice(0, 60) as mail}<button
									class:selected={selectedMail?.threadId === mail.threadId}
									onclick={() => {
										mailId = mail.id;
										composing = false;
									}}
									><strong>{mail.subject}</strong><small>{mail.from}</small>
									<p>{mail.body.slice(0, 90)}</p>
									<span class="mail-date">{mail.date.slice(0, 16).replace('T', ' ')}</span></button
								>{/each}{#if !threads.length}<p class="empty">
									Your simulated mailbox is ready. Start with one of the examples above.
								</p>{/if}
						</aside>
						<section class="mail-content">
							{#if composing}<form
									method="POST"
									action="?/sendMail"
									use:enhance={({ formElement, ...rest }) => {
										const fn = action({ formElement, ...rest });
										return async (result) => {
											if (typeof fn === 'function') await fn(result);
											if (result.result.type === 'success') {
												mailId = form?.mail?.id || mailId;
												eventId = crypto.randomUUID();
												composing = false;
											}
										};
									}}
									data-label="Delivering the message and updating project memory"
									class="composer"
								>
									<div class="composer-heading">
										<h2>{threadId ? 'Reply' : 'New message'}</h2>
										<button type="button" class="text-button" onclick={() => (composing = false)}
											>Close</button
										>
									</div>
									<input type="hidden" name="threadId" value={threadId} /><input
										type="hidden"
										name="eventId"
										value={eventId}
									/>
									<div class="mail-field">
										<span>From</span><strong>{data.context.persona.email}</strong>
									</div>
									<label class="mail-field"
										><span>To</span><input
											name="to"
											bind:value={to}
											required
											placeholder="Recipient email addresses"
										/></label
									><label class="mail-field"
										><span>Cc</span><input
											name="cc"
											bind:value={cc}
											placeholder="Copy recipients"
										/></label
									><label class="include-agent"
										><input
											type="checkbox"
											checked={cc.includes(agent)}
											onchange={(e) => setAgent(e.currentTarget.checked)}
										/><span>Include project memory<small>{agent}</small></span></label
									><label class="mail-field"
										><span>Subject</span><input
											name="subject"
											bind:value={subject}
											required
											placeholder="Subject"
										/></label
									><label class="sr-only" for="mail-body">Message body</label><textarea
										id="mail-body"
										name="body"
										bind:value={body}
										required
										rows="12"
										placeholder="Write your message…"></textarea>
									<div class="composer-bottom">
										<small
											>Only this message and explicitly included history are delivered to the agent.</small
										><button class="button" disabled={!!busy}><Mail size={17} />Send message</button
										>
									</div>
								</form>{:else if selectedMail}<div class="thread-heading">
									<h2><NameText text={selectedMail.subject} people={data.people} /></h2>
									<button class="button secondary" onclick={() => compose(selectedMail)}
										>Reply</button
									>
								</div>
								{#each thread as mail}<article class="mail-message">
										<div class="mail-message-heading">
											<span class="avatar"
												>{mail.from.includes('memory') ? 'R' : mail.from[0]?.toUpperCase()}</span
											>
											<div>
												<strong><NameText text={mail.from} people={data.people} /></strong><small
													>{mail.date}</small
												>
											</div>
											<span class="badge">{mail.status.replaceAll('_', ' ')}</span>
										</div>
										<div class="mail-recipients">
											<p>
												<strong>To:</strong>
												<NameText text={mail.to.join(', ')} people={data.people} />
											</p>
											<p>
												<strong>Cc:</strong>
												<NameText text={mail.cc.join(', ') || '—'} people={data.people} />
											</p>
										</div>
										<div class="mail-body"><NameText text={mail.body} people={data.people} /></div>
										{#if mail.answer}<Evidence
												people={data.people}
												answer={mail.answer}
											/>{/if}{#if mail.error}<div class="notice error-notice">
												{mail.error}
												<form
													method="POST"
													action="?/retryMail"
													use:enhance={action}
													data-label="Retrying message processing"
												>
													<input type="hidden" name="id" value={mail.id} /><button
														class="button secondary">Retry processing</button
													>
												</form>
											</div>{/if}
									</article>{/each}{:else}<div class="mail-empty">
									<Mail size={42} />
									<h2>Your conversations become project memory</h2>
									<p>
										Select a thread or load an example. Messages addressed to the project agent
										enter the same memory used by your workspace.
									</p>
									<button class="button secondary" onclick={() => scenario('schedule')}
										>Try the bakery review example</button
									>
								</div>{/if}
						</section>
					</div>
				</div>
			{:else if data.reviewerGuide}
				<GuideArticle document={data.reviewerGuide} />
			{:else}
				<div class="page-heading"><h1>Page unavailable</h1></div>
				<p>Choose a page from the sidebar.</p>
			{/if}
		</main>
		<footer>
			<span>Receipt · Acme project memory</span><span
				>Archive through {data.archiveDate} · Workspace {data.context.workspaceId.slice(0, 8)}</span
			>
		</footer>
	</div>
</div>
