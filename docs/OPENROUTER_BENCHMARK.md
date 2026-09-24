# OpenRouter inference comparison

Run from the solution directory with `OPENROUTER_API_KEY` set:

```sh
python scripts/benchmark-openrouter.py
```

Open `benchmark_results/report.html` afterward. `results.json` contains per-stage responses, token usage, cost, and wall time; `evidence.json` contains the exact source excerpts sent to each model. These files contain synthetic Acme challenge data and are local benchmark artifacts.

The test asks whether bakery is part of the fresh workstream now and how its scope changed. It extracts line-addressed excerpts from eight Acme documents. The harness approximates Relio's Ask path with separate interpretation, draft, and verification JSON calls. Relio's current Ask implementation makes staged model calls; it does not send native function tools to the model. The harness uses the same 0.1 temperature as Relio's normal model calls and sends no output-token cap. It does not use private workspace preferences, prepared memory, Relio's full retrieval inventory, UI streaming, or the application citation validator, so its times should be read as a model comparison for this fixed task rather than an end-to-end UI timing.

The provider is pinned with `provider.only` and fallback disabled. The program omits the reasoning parameter so each model uses its default. A failed stage remains visible in the report. `cost_usd` uses OpenRouter's returned usage cost; reasoning tokens are shown when returned. The reported TPS divides all completion tokens by total wall time, including network and request overhead. A single run per combination is a snapshot, not a reliable latency distribution. Repeat the benchmark at different times before changing the deployed inference provider.

The example corpus is synthetic, but sending it through OpenRouter changes the inference path and may affect the challenge's EU residency condition. Check the selected provider's processing location before using real customer data or claiming EU-only inference.
