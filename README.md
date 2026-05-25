# Initiative Tracker Plus

A community fork of [Initiative Tracker](https://github.com/valentine195/obsidian-initiative-tracker) for **[Obsidian](https://obsidian.md)** — track initiative, HP, conditions, and XP during TTRPG combat encounters.

This fork is maintained independently and includes community enhancements on top of the original plugin.

## Features

- Add and remove creatures from encounters
- Track HP, AC, initiative, and status conditions
- Calculate encounter difficulty and XP by level or challenge rating
- Award encounter XP directly to players
- Group identical creatures and set display names
- Support dice rolls for random creature counts
- Sort by initiative automatically
- Save and load multiple encounters in `encounter` code blocks
- Integration with [Fantasy Statblocks](https://github.com/javalent/fantasy-statblocks) and [Dice Roller](https://github.com/javalent/obsidian-dice-roller)

## Installation

### From Obsidian Community Plugins

1. Open **Settings → Community plugins**.
2. Browse and search for **Initiative Tracker Plus**.
3. Install and enable the plugin.

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/msweat254/initiative-tracker/releases).
2. Create a folder named `initiative-tracker-plus` in your vault's `.obsidian/plugins/` directory.
3. Copy the three files into that folder.
4. Enable the plugin under **Settings → Community plugins**.

## Quickstart

1. Open a note where you want to track an encounter.
2. Create a code block with the language set to `encounter`:

````markdown
```encounter
name: Example
creatures:
 - 3: Goblin
```
````

3. Add creatures by name, dice roll, or bestiary entry.
4. Click the play button to start tracking initiative.

## Relationship to the original plugin

This plugin is a **fork** of [Initiative Tracker](https://github.com/valentine195/obsidian-initiative-tracker) by Jeremy Valentine. **Initiative Tracker Plus** is maintained independently in [msweat254/initiative-tracker](https://github.com/msweat254/initiative-tracker).

- **Plugin ID:** `initiative-tracker-plus` (do not install alongside the original `initiative-tracker` plugin)
- **License:** GNU GPL v3 — see [LICENSE](LICENSE) and [NOTICE](NOTICE)

## Support

Report bugs and request features on the [Issues](https://github.com/msweat254/initiative-tracker/issues) page.

## Recommended companion plugins

- **[Fantasy Statblocks](https://github.com/javalent/fantasy-statblocks)** — statblocks and bestiary integration
- **[Dice Roller](https://github.com/javalent/obsidian-dice-roller)** — inline dice rolling
