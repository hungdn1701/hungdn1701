# Profile tooling

Maintenance notes for the profile README. Nothing here is shown on the profile page.

| What | How |
| --- | --- |
| Featured repos, "now" filters | Edit `profile.config.json`. |
| Refresh cards and the "now" list | Runs daily in `.github/workflows/update.yml`. Locally: `GITHUB_TOKEN=$(gh auth token) node scripts/update.mjs`. |
| Banner and stack artwork | `node scripts/build-static.mjs` (needs Python with `fonttools` and `brotli`). Output goes to `assets/`. |
| Contribution snake | Generated daily by `.github/workflows/snake.yml` into the `output` branch. |

Add a featured repo by appending an entry to `featured` in `profile.config.json`, then add its `<picture>` block to the "selected work" section of `README.md` (copy an existing one and change the name).

Add a technology by dropping a single-path SVG into `scripts/icons/`, listing it in `GROUPS` in `build-static.mjs`, and re-running the script.

Credits: stack icons from [devicon](https://github.com/devicons/devicon) (MIT), repo/star/fork glyphs from [Primer Octicons](https://github.com/primer/octicons) (MIT), font [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono) (OFL-1.1), snake by [Platane/snk](https://github.com/Platane/snk).
