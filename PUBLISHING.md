# Publishing checklist

Use this checklist before submitting **Initiative Tracker Plus** to the Obsidian community plugin directory.

## Before you publish

- [ ] Create a public GitHub repository for this fork.
- [x] Replace every `YOUR_GITHUB_USERNAME` placeholder in `README.md` with your GitHub username (`msweat254`).
- [ ] Add your GitHub URL to `manifest.json` as `authorUrl` (optional but recommended).
- [ ] Confirm you are **not** installing this alongside the original `initiative-tracker` plugin (different plugin IDs, but similar functionality).
- [ ] Build locally: `npm ci && npm run build`
- [ ] Verify `main.js`, `manifest.json`, and `styles.css` are produced.

## Create a GitHub release

Obsidian requires release assets attached to a GitHub release whose tag matches `manifest.json` version.

1. Commit and push all changes to your repository.
2. Create a release tagged **`1.0.0`** (must match `manifest.json`).
3. Attach these files to the release:
   - `main.js`
   - `manifest.json`
   - `styles.css`

Alternatively, push to `main` and let the included GitHub Actions workflow create releases via release-please.

## Submit to Obsidian

1. Read the [submission requirements](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins).
2. Fork [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases).
3. Add an entry to `community-plugins.json`:

```json
{
  "id": "initiative-tracker-plus",
  "name": "Initiative Tracker Plus",
  "author": "Mike",
  "description": "Track TTRPG combat initiative, HP, conditions, and XP in Obsidian encounter blocks. A community fork of Initiative Tracker.",
  "repo": "msweat254/initiative-tracker"
}
```

4. Open a pull request against `obsidianmd/obsidian-releases`.

## GPL compliance

This fork is licensed under **GPL v3**. When you distribute it:

- Keep the [LICENSE](LICENSE) file in the repository.
- Keep the [NOTICE](NOTICE) file with upstream attribution.
- Publish the full corresponding source code on GitHub.
- License your modifications under GPL v3 as well.

## Manifest fields (current)

| Field | Value |
| --- | --- |
| id | `initiative-tracker-plus` |
| name | Initiative Tracker Plus |
| version | 1.0.0 |
| minAppVersion | 1.7.2 |
| isDesktopOnly | false |
