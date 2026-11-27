# Profile tooling

Maintenance notes for the profile README. Nothing here is shown on the profile page.

| What | How |
| --- | --- |
| Featured repos, which repos count as course starters | Edit `profile.config.json` (`featured`, `stats.starters`). |
| Refresh cards and stats (stars, forks, contributions by month) | Runs daily in `.github/workflows/update.yml`. Locally: `GITHUB_TOKEN=$(gh auth token) node scripts/update.mjs`. |
| Banner (name, slogan) and stack artwork | `node scripts/build-static.mjs` (needs Python with `fonttools` and `brotli`). Output goes to `assets/`. The name and slogan come from `workspace/IDENTITY.md` in the site repo; the role line is left off the banner. |
| Contribution snake | Generated daily by `.github/workflows/snake.yml` into the `output` branch. |

The README no longer shows a "selected work" section, since the pinned repositories below it already do that job (2026-11-27). The cards for the repos in `featured` are still refreshed in `assets/cards/`; to show them again, add a `<picture>` block per card to `README.md`, as in commit `dc88268`.

Add a technology by dropping a single-path SVG into `scripts/icons/`, listing it in `GROUPS` in `build-static.mjs`, and re-running the script.

Credits: stack icons from [devicon](https://github.com/devicons/devicon) (MIT), repo/star/fork glyphs from [Primer Octicons](https://github.com/primer/octicons) (MIT), font [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono) (OFL-1.1), snake by [Platane/snk](https://github.com/Platane/snk).
