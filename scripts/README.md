# Profile tooling

Maintenance notes for the profile README. Nothing here is shown on the profile page.

| What | How |
| --- | --- |
| Featured repos | GitHub's pinned repositories: "Customize your pins" on the profile page. Nothing to edit here. |
| Which repos count as course starters | Edit `stats.starters` in `profile.config.json`. |
| Refresh stats (stars, forks, contributions by month) | Runs daily in `.github/workflows/update.yml`. Locally: `GITHUB_TOKEN=$(gh auth token) node scripts/update.mjs`. |
| Banner (slogan) and stack artwork | `node scripts/build-static.mjs` (needs Python with `fonttools` and `brotli`). Output goes to `assets/`. The slogan comes from `workspace/IDENTITY.md` in the site repo; the name and role line are left off, since the profile column beside the README shows them. |
| Contribution snake | Generated daily by `.github/workflows/snake.yml` into the `output` branch. |

The README has no "selected work" section and the repo cards are no longer generated (2026-11-27): the pinned repositories show the same information and are set without code. The old card generator is in commit `dc88268`.

Add a technology by dropping a single-path SVG into `scripts/icons/`, listing it in `GROUPS` in `build-static.mjs`, and re-running the script.

Credits: stack icons from [devicon](https://github.com/devicons/devicon) (MIT), star, fork and commit glyphs from [Primer Octicons](https://github.com/primer/octicons) (MIT), font [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono) (OFL-1.1), snake by [Platane/snk](https://github.com/Platane/snk).
