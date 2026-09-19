# Blank starter

The root layout imports shared CSS and renders the child route. The home route sets only the document title. There is no visible shell, navigation, demo content, settings form or mounted component. There is no server load or form action.

Card, Badge and Dialog components, Signal Room styles, fonts, icons and the SQLite helper remain available for future implementation. The helper is inactive until explicitly called. No product workflow is implemented.

Use port 34342. See the README for setup, checks and operations. The browser smoke test checks that the root route loads without UI elements; the database unit test independently verifies the retained helper. Screenshots show the blank desktop/mobile state.

The initial dependency audit reported three low-severity entries in one transitive cookie advisory chain through SvelteKit and adapter-node; no moderate, high or critical entries. The suggested major downgrade was not applied.
