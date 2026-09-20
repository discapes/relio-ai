# RELEX styling

Receipt uses the colors inspected on RELEX’s website on 20 September 2026. The source research, reference screenshots and original component proposal are in the workspace’s sibling `../brand_plan/` directory. [RELEX’s website stylesheet](https://s32519.pcdn.co/wp-content/themes/relex-theme/build/css/layout.css?ver=1787243339) defines the original color values.

`src/app.css` owns the semantic tokens. White cards sit on `#F7F8F8`; navy `#0A3256` is the primary text color. Blue `#177ABF` is the action color, with navy hover states. Pale blue `#E6F2FF` marks selection and briefing headers. Orange `#FF7110` is available as an accent token. The Outlook simulator retains its distinct blue mail chrome.

Figtree Variable 5.3.0 is bundled locally through Fontsource, including Latin, Latin Extended and italic faces. Its range is 300–900. Body copy uses 15–16px; headings use weight 700 and reduced negative letter-spacing. The [font license](FIGTREE_LICENSE.txt) is OFL-1.1; orig: `@fontsource-variable/figtree/LICENSE`.

## Color roles

| Role | Foreground | Background |
| --- | --- | --- |
| Primary action | White | `#177ABF` |
| Selected navigation, access level | `#0A3256` | `#E6F2FF` |
| Secondary text | `#546467` | White, `#F7F8F8` or `#E6F2FF` |
| Agreed, current, completed | `#3E770C` | `#E9F7DF` |
| Outstanding, superseded, stale | `#0A3256` | `#FFF4CC` |
| Proposed, suggestion | `#773C76` | `#ECE6FF` |
| Corrected, contradicted, failed | `#AF0B2B` | `#FCE3E3` |

`Badge.svelte` assigns status tones while displaying the original status text. Unrecognized status values receive the neutral treatment. Access levels remain neutral and carry their explicit level label.

Compact organization labels use 14px; inline references have a 13px floor and graph labels a 12px floor. Controls use `#617072` borders; decorative dividers use `#DDE0E1`. Focus outlines use navy. Selected navigation has a visible edge marker; selected tabs have an underline. Selected mail rows use navy secondary text to retain contrast against the simulator’s existing background.

The memory graph shares these tokens, including its source-node outline and keyboard focus stroke. Its SVG is an accessible group containing source links. Evidence PNGs read the root colors, load Figtree before measuring, and use the same font for wrapping and rendering. The sidebar uses the official RELEX RGB logo at its original aspect ratio, and the favicon uses the official RELEX symbol. Both are served locally.

- `src/lib/assets/relex_logo.svg`: [official media-kit SVG](https://s32519.pcdn.co/wp-content/uploads/2024/01/relex-primary-logo-RGB-vector.svg); orig: `relex-primary-logo-RGB-vector.svg`.
- `src/lib/assets/favicon.png`: [official site icon](https://s32519.pcdn.co/wp-content/uploads/2024/07/cropped-relex-mark-square-192x192.png); orig: `cropped-relex-mark-square-192x192.png`.

## Verification and operations

The brand review server uses port **41851**, a SQLite backup in `/home/user/aaltoai/artifacts/relex_brand/implementation/data`, and `DISABLE_BACKGROUND=1`. Production remains on port **34342**. Use the review server for browser mutations; its saved data is separate from the deployed service.

```sh
PORT=41851 ORIGIN=http://127.0.0.1:41851 \
  DATA_DIR=/home/user/aaltoai/artifacts/relex_brand/implementation/data \
  DISABLE_BACKGROUND=1 npm start
```

With that server running, execute `PLAYWRIGHT_BASE_URL=http://127.0.0.1:41851 npm run test:e2e`. Broader contrast, keyboard-focus, access-level, export and responsive review evidence is recorded in `docs/VALIDATION.md`. The review scripts and raw reports are in the workspace’s `artifacts/relex_brand/implementation/` directory.
