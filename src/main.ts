import {
    type FrontMatterCache,
    Notice,
    parseYaml,
    Plugin,
    TFile,
    WorkspaceLeaf,
    setIcon
} from "obsidian";

import {
    BUILDER_VIEW,
    Conditions,
    CREATURE_TRACKER_VIEW,
    DEFAULT_SETTINGS,
    INITIATIVE_TRACKER_VIEW,
    PLUGIN_ID,
    getRpgSystem,
    registerIcons
} from "./utils";

import { PLAYER_VIEW_VIEW } from "./utils/constants";
import type { InitiativeTrackerData } from "./settings/settings.types";
import type { InitiativeViewState } from "./tracker/view.types";
import type { HomebrewCreature } from "./types/creatures";
import type { SRDMonster } from "./types/creatures";
import InitiativeTrackerSettings from "./settings/settings";
import { EncounterBlock, EncounterParser } from "./encounter";
import EncounterLine from "./encounter/ui/EncounterLine.svelte";
import { Creature, getId } from "./utils/creature";
import TrackerView, { CreatureView } from "./tracker/view";
import BuilderView from "./builder/view";
import PlayerView from "./tracker/player-view";
import { tracker } from "./tracker/stores/tracker";
import { EncounterSuggester } from "./encounter/editor-suggestor";
import { API } from "./api/api";

import "@javalent/fantasy-statblocks";
import type { StackRoller } from "@javalent/dice-roller";

export default class InitiativeTracker extends Plugin {
    api = new API(this);
    public data: InitiativeTrackerData;
    public tracker = tracker;
    playerCreatures: Map<string, Creature> = new Map();
    private lastCombatantLeaf: WorkspaceLeaf | null = null;
    watchers: Map<TFile, HomebrewCreature> = new Map();
    private hpSyncTimer: ReturnType<typeof setTimeout> | null = null;
    hpSyncFromVault = false;
    getRoller(str: string) {
        if (!this.canUseDiceRoller) return;
        const roller = window.DiceRoller.getRoller(str, "statblock");
        if (roller === null) return null;
        return roller as StackRoller;
    }
    get canUseDiceRoller() {
        if (window.DiceRoller != null) {
            if (!window.DiceRoller.getRoller) {
                new Notice(
                    "Please update Dice Roller to the latest version to use with Initiative Tracker."
                );
            } else {
                return true;
            }
        }
        return false;
    }

    getInitiativeValue(modifier: number | number[] = 0): number {
        const defaultIfNoResult =
            Math.floor(Math.random() * 19 + 1) +
            [modifier].flat().reduce((a, b) => a + b, 0);
        if (!this.canUseDiceRoller) {
            return defaultIfNoResult;
        }
        let dice = this.data.initiative;
        if (typeof modifier == "number") {
            dice = dice.replace(/%mod\d?%/g, `${modifier}`);
        } else {
            for (let i = 0; i < modifier.length; i++) {
                dice = dice.replace(`%mod${i + 1}%`, `${modifier[i]}`);
            }
        }
        const roller = this.getRoller(dice);
        const initiative = roller?.rollSync() ?? defaultIfNoResult;
        if (isNaN(initiative)) return defaultIfNoResult;
        return initiative;
    }

    getPlayerByName(name: string) {
        if (!this.players.has(name)) return new Creature({ name });
        return Creature.from(this.players.get(name));
    }
    getPlayerNamesForParty(party: string): string[] {
        return this.data.parties?.find((p) => p.name === party)?.players ?? [];
    }
    getPlayersForParty(party: string) {
        return (
            this.data.parties
                ?.find((p) => p.name == party)
                ?.players.map((p) => this.getPlayerByName(p))
                ?.filter((p) => p) ?? []
        );
    }

    get canUseStatBlocks(): boolean {
        if (this.app.plugins.enabledPlugins.has("obsidian-5e-statblocks")) {
            return (window["FantasyStatblocks"]?.getVersion()?.major ?? 0) >= 4;
        }
        return false;
    }
    get statblockVersion() {
        return window.FantasyStatblocks?.getVersion() ?? { major: 0 };
    }
    get statblock_creatures() {
        if (!window.FantasyStatblocks) return [];
        return window.FantasyStatblocks.getBestiaryCreatures() as SRDMonster[];
    }
    get bestiary() {
        return this.statblock_creatures.filter(
            (p) => !p.player && p.bestiary !== false
        );
    }

    addEncounter(name: string, encounter: InitiativeViewState) {
        this.data.encounters[name] = encounter;
        this.registerCommand(name);
    }
    removeEncounter(name: string) {
        delete this.data.encounters[name];
        this.unregisterCommandsFor(name);
    }

    registerCommand(encounter: string) {
        this.addCommand({
            id: `start-${encounter}`,
            name: `Start ${encounter}`,
            checkCallback: (checking) => {
                // checking if the command should appear in the Command Palette
                if (checking) {
                    // make sure the active view is a MarkdownView.
                    return encounter in this.data.encounters;
                }
                if (!(encounter in this.data.encounters)) return;
                tracker.new(this, this.data.encounters[encounter]);
            }
        });
    }
    unregisterCommandsFor(encounter: string) {
        const commandId = `${this.manifest.id}:start-${encounter}`;
        if (this.app.commands.findCommand(commandId)) {
            delete this.app.commands.commands[commandId];
        }
    }

    get bestiaryNames(): string[] {
        if (!window.FantasyStatblocks) return [];
        return window.FantasyStatblocks.getBestiaryNames();
    }
    get view() {
        const leaves = this.app.workspace.getLeavesOfType(
            INITIATIVE_TRACKER_VIEW
        );
        const leaf = leaves?.length ? leaves[0] : null;
        if (leaf && leaf.view && leaf.view instanceof TrackerView)
            return leaf.view;
    }
    get combatant() {
        const leaves = this.app.workspace.getLeavesOfType(
            CREATURE_TRACKER_VIEW
        );
        const leaf = leaves?.length ? leaves[0] : null;
        if (leaf && leaf.view && leaf.view instanceof CreatureView)
            return leaf.view;
    }

    get defaultParty() {
        return this.data.parties.find((p) => p.name == this.data.defaultParty);
    }

    getBaseCreatureFromBestiary(name: string): SRDMonster {
        /** Check statblocks */
        try {
            if (
                this.canUseStatBlocks &&
                window.FantasyStatblocks.hasCreature(name)
            ) {
                return window.FantasyStatblocks.getCreatureFromBestiary(
                    name
                ) as SRDMonster;
            }
        } catch (e) {}
        return null;
    }
    getCreatureFromBestiary(name: string) {
        let creature = this.getBaseCreatureFromBestiary(name);
        if (creature) return Creature.from(creature);
    }
    getCreatureFromBestiaryByDefinition(
        creature: SRDMonster | HomebrewCreature
    ): Creature {
        if (creature.player && this.playerCreatures.has(creature.name)) {
            return this.playerCreatures.get(creature.name);
        }
        return (
            this.getCreatureFromBestiary(creature.name) ??
            Creature.from(creature)
        );
    }
    get statblock_players() {
        return this.statblock_creatures
            .filter((p) => p.player)
            .map((p) => [p.name, Creature.from(p)] as [string, Creature]);
    }
    get players() {
        return new Map([
            ...this.playerCreatures.entries(),
            ...this.statblock_players
        ]);
    }

    async onload() {
        registerIcons();

        await this.loadSettings();
        tracker.setPlugin(this);

        this.setBuilderIcon();

        this.addSettingTab(new InitiativeTrackerSettings(this));

        this.registerView(
            INITIATIVE_TRACKER_VIEW,
            (leaf: WorkspaceLeaf) => new TrackerView(leaf, this)
        );
        this.registerView(
            PLAYER_VIEW_VIEW,
            (leaf: WorkspaceLeaf) => new PlayerView(leaf, this)
        );
        this.registerView(
            CREATURE_TRACKER_VIEW,
            (leaf: WorkspaceLeaf) => new CreatureView(leaf, this)
        );
        this.registerView(
            BUILDER_VIEW,
            (leaf: WorkspaceLeaf) => new BuilderView(leaf, this)
        );

        this.registerHoverLinkSource(INITIATIVE_TRACKER_VIEW, {
            display: "Initiative Tracker",
            defaultMod: false
        });

        this.addCommands();
        this.addEvents();

        this.registerEditorSuggest(new EncounterSuggester(this));
        this.registerMarkdownCodeBlockProcessor("encounter", (src, el, ctx) => {
            if (
                this.canUseStatBlocks &&
                !window["FantasyStatblocks"].isResolved()
            ) {
                el.addClasses(["waiting-for-bestiary", "is-loading"]);
                const loading = el.createEl("p", {
                    text: "Waiting for Fantasy Statblocks Bestiary..."
                });
                const unload = window["FantasyStatblocks"].onResolved(() => {
                    el.removeClasses(["waiting-for-bestiary", "is-loading"]);
                    loading.detach();
                    const handler = new EncounterBlock(this, src, el);
                    ctx.addChild(handler);
                    unload();
                });
            } else {
                const handler = new EncounterBlock(this, src, el);
                ctx.addChild(handler);
            }
        });
        this.registerMarkdownCodeBlockProcessor(
            "encounter-table",
            (src, el, ctx) => {
                if (
                    this.canUseStatBlocks &&
                    !window["FantasyStatblocks"].isResolved()
                ) {
                    el.addClasses(["waiting-for-bestiary", "is-loading"]);
                    const loading = el.createEl("p", {
                        text: "Waiting for Fantasy Statblocks Bestiary..."
                    });
                    const unload = window["FantasyStatblocks"].onResolved(
                        () => {
                            el.removeClasses([
                                "waiting-for-bestiary",
                                "is-loading"
                            ]);
                            loading.detach();
                            const handler = new EncounterBlock(
                                this,
                                src,
                                el,
                                true
                            );
                            ctx.addChild(handler);
                            unload();
                        }
                    );
                } else {
                    const handler = new EncounterBlock(this, src, el, true);
                    ctx.addChild(handler);
                }
            }
        );

        this.registerMarkdownPostProcessor(async (el, ctx) => {
            if (!el || !el.firstElementChild) return;

            const codeEls = el.querySelectorAll<HTMLElement>("code");
            if (!codeEls || !codeEls.length) return;

            const codes = Array.from(codeEls).filter((code) =>
                /^encounter:\s/.test(code.innerText)
            );
            if (!codes.length) return;

            for (const code of codes) {
                const target = createSpan("initiative-tracker-encounter-line");

                code.replaceWith(target);

                const buildEncounter = async () => {
                    const definitions = code.innerText.replace(
                        `encounter:`,
                        ""
                    );

                    const creatures = parseYaml("[" + definitions.trim() + "]");
                    const parser = new EncounterParser(this);
                    const parsed = await parser.parse({ creatures });

                    if (
                        !parsed ||
                        !parsed.creatures ||
                        !parsed.creatures.size
                    ) {
                        target.setText("No creatures found.");
                        return;
                    }
                    new EncounterLine({
                        target,
                        props: {
                            ...parsed,
                            plugin: this
                        }
                    });
                };
                if (
                    this.canUseStatBlocks &&
                    !window["FantasyStatblocks"].isResolved()
                ) {
                    const loading = target.createSpan(
                        "waiting-for-bestiary inline"
                    );
                    const delay = Math.floor(200 * Math.random());

                    setIcon(
                        loading.createDiv({
                            cls: "icon",
                            attr: {
                                style: `animation-delay: ${delay}ms`
                            }
                        }),
                        "loader-2"
                    );
                    loading.createEl("em", {
                        text: "Loading Bestiary..."
                    });
                    const unload = window["FantasyStatblocks"].onResolved(
                        () => {
                            el.removeClasses([
                                "waiting-for-bestiary",
                                "inline"
                            ]);
                            loading.detach();
                            buildEncounter();
                            unload();
                        }
                    );
                } else {
                    buildEncounter();
                }
            }
        });

        this.playerCreatures = new Map(
            this.data.players.map((p) => [p.name, Creature.from(p)])
        );

        this.app.workspace.onLayoutReady(async () => {
            this.addTrackerView();
            //Update players from < 7.2
            for (const player of this.data.players) {
                if (player.path) continue;
                if (!player.note) continue;
                const file = await this.app.metadataCache.getFirstLinkpathDest(
                    player.note,
                    ""
                );
                if (
                    !file ||
                    !this.app.metadataCache.getFileCache(file)?.frontmatter
                ) {
                    new Notice(
                        `Initiative Tracker: There was an issue with the linked note for ${player.name}.\n\nPlease re-link it in settings.`
                    );
                    continue;
                }
            }
            this.registerEvent(
                this.app.metadataCache.on("changed", (file) => {
                    if (!(file instanceof TFile)) return;
                    if (this.hpSyncFromVault) return;
                    const players = this.data.players.filter(
                        (p) => p.path == file.path
                    );
                    if (!players.length) return;
                    const frontmatter: FrontMatterCache =
                        this.app.metadataCache.getFileCache(file)?.frontmatter;
                    if (!frontmatter) return;
                    for (let player of players) {
                        const { ac, modifier, level, name } = frontmatter;
                        player.ac = ac;
                        player.modifier = modifier;
                        player.level = level;
                        player.name = name ? name : player.name;
                        player["statblock-link"] =
                            frontmatter["statblock-link"];

                        this.applyPlayerHpFromFrontmatter(player, frontmatter);
                        this.applyPlayerXpFromFrontmatter(player, frontmatter);

                        if (this.view) {
                            const creature = tracker
                                .getOrderedCreatures()
                                .find((c) => c.name == player.name);
                            if (creature) {
                                tracker.updateCreatures({
                                    creature,
                                    change: {
                                        set_max_hp: player.hp,
                                        set_hp: player.currentHp,
                                        ac: player.ac
                                    }
                                });
                            }
                        }
                    }
                    void this.saveSettings();
                })
            );
            this.registerEvent(
                this.app.vault.on("rename", (file, old) => {
                    if (!(file instanceof TFile)) return;
                    const players = this.data.players.filter(
                        (p) => p.path == old
                    );
                    if (!players.length) return;
                    for (const player of players) {
                        player.path = file.path;
                        player.note = file.basename;
                    }
                })
            );
            this.registerEvent(
                this.app.vault.on("delete", (file) => {
                    if (!(file instanceof TFile)) return;
                    const players = this.data.players.filter(
                        (p) => p.path == file.path
                    );
                    if (!players.length) return;
                    for (const player of players) {
                        player.path = null;
                        player.note = null;
                    }
                })
            );
        });

        console.log("Initiative Tracker v" + this.manifest.version + " loaded");
    }

    addCommands() {
        this.addCommand({
            id: "open-tracker",
            name: "Open Initiative Tracker",
            checkCallback: (checking) => {
                if (!this.view) {
                    if (!checking) {
                        this.addTrackerView();
                    }
                    return true;
                }
            }
        });
        this.addCommand({
            id: "open-builder",
            name: "Open Encounter Builder",
            checkCallback: (checking) => {
                if (!this.builder) {
                    if (!checking) {
                        this.addBuilderView();
                    }
                    return true;
                }
            }
        });

        this.addCommand({
            id: "toggle-encounter",
            name: "Toggle Encounter",
            checkCallback: (checking) => {
                const view = this.view;
                if (view) {
                    if (!checking) {
                        tracker.toggleState();
                    }
                    return true;
                }
            }
        });

        this.addCommand({
            id: "next-combatant",
            name: "Next Combatant",
            checkCallback: (checking) => {
                const view = this.view;
                if (view && tracker.getState()) {
                    if (!checking) {
                        tracker.goToNext();
                    }
                    return true;
                }
            }
        });

        this.addCommand({
            id: "prev-combatant",
            name: "Previous Combatant",
            checkCallback: (checking) => {
                const view = this.view;
                if (view && tracker.getState()) {
                    if (!checking) {
                        tracker.goToPrevious();
                    }
                    return true;
                }
            }
        });

        for (const encounter in this.data.encounters) {
            this.registerCommand(encounter);
        }
    }

    addEvents() {
        this.registerEvent(
            this.app.workspace.on(
                `${PLUGIN_ID}:should-save`,
                async () => await this.saveSettings()
            )
        );
        this.registerEvent(
            this.app.workspace.on(
                `${PLUGIN_ID}:save-state`,
                async (state: InitiativeViewState) => {
                    this.data.state = state;
                    await this.saveSettings();
                }
            )
        );
        this.registerEvent(
            this.app.workspace.on(
                `${PLUGIN_ID}:start-encounter`,
                async (homebrews: HomebrewCreature[]) => {
                    try {
                        const creatures = homebrews.map((h) =>
                            Creature.from(h).toJSON()
                        );

                        const view = this.view;
                        if (!view) {
                            await this.addTrackerView();
                        }
                        if (view) {
                            tracker?.new(this, {
                                creatures,
                                state: false,
                                name: null,
                                round: 1,
                                logFile: null,
                                roll: true
                            });
                            this.app.workspace.revealLeaf(view.leaf);
                        } else {
                            new Notice(
                                "Could not find the Initiative Tracker. Try reloading the note!"
                            );
                        }
                    } catch (e) {
                        new Notice(
                            "There was an issue launching the encounter.\n\n" +
                                (e as Error).message
                        );
                        console.error(e);
                        return;
                    }
                }
            )
        );
    }

    async onunload() {
        await this.saveSettings();

        this.app.workspace.detachLeavesOfType(INITIATIVE_TRACKER_VIEW);
        this.app.workspace.detachLeavesOfType(PLAYER_VIEW_VIEW);
        this.app.workspace.detachLeavesOfType(CREATURE_TRACKER_VIEW);
        this.app.workspace.detachLeavesOfType(BUILDER_VIEW);

        this.app.workspace.trigger(`${PLUGIN_ID}:unloaded`);
        console.log("Initiative Tracker Plus unloaded");
    }

    async addTrackerView() {
        if (
            this.app.workspace.getLeavesOfType(INITIATIVE_TRACKER_VIEW)?.length
        ) {
            return;
        }
        await this.app.workspace.ensureSideLeaf(
            INITIATIVE_TRACKER_VIEW,
            "right",
            { active: false }
        );
    }
    get builder() {
        const leaves = this.app.workspace.getLeavesOfType(BUILDER_VIEW);
        const leaf = leaves.length ? leaves[0] : null;
        if (leaf && leaf.view && leaf.view instanceof BuilderView)
            return leaf.view;
    }
    async addBuilderView() {
        if (this.app.workspace.getLeavesOfType(BUILDER_VIEW)?.length) {
            return;
        }
        await this.app.workspace.getLeaf(true).setViewState({
            type: BUILDER_VIEW
        });
        this.app.workspace.revealLeaf(this.builder.leaf);
    }
    applyPlayerXpFromFrontmatter(
        player: HomebrewCreature,
        frontmatter: FrontMatterCache
    ) {
        if (frontmatter.xp != null) {
            player.xp = Number(frontmatter.xp);
            const cached = this.playerCreatures.get(player.name);
            if (cached) cached.xp = player.xp;
        }
    }

    applyPlayerHpFromFrontmatter(
        player: HomebrewCreature,
        frontmatter: FrontMatterCache
    ) {
        const maxHp = Number(frontmatter.hp ?? player.hp ?? 0);
        const rawCurrent = frontmatter["current-hp"];
        const currentHp =
            rawCurrent != null
                ? Number(rawCurrent)
                : maxHp;
        player.hp = maxHp;
        player.currentHp = Math.max(0, Math.min(currentHp, maxHp));

        const cached = this.playerCreatures.get(player.name);
        if (cached) {
            cached.max = cached.current_max = player.hp;
            cached.hp = player.currentHp;
        }
    }

    syncLinkedPlayerHp(creature: Creature) {
        if (!creature.player) return;

        const player = this.data.players.find((p) => p.name === creature.name);
        if (!player) return;

        const maxHp = creature.current_max ?? creature.max;
        const currentHp = creature.hp;
        player.hp = maxHp;
        player.currentHp = currentHp;

        const cached = this.playerCreatures.get(creature.name);
        if (cached) {
            cached.max = cached.current_max = maxHp;
            cached.hp = currentHp;
        }

        if (this.hpSyncTimer) clearTimeout(this.hpSyncTimer);
        this.hpSyncTimer = setTimeout(() => {
            this.hpSyncTimer = null;
            void this.flushLinkedPlayerHpSync(creature, player);
        }, 300);
    }

    private async flushLinkedPlayerHpSync(
        creature: Creature,
        player: HomebrewCreature
    ) {
        await this.saveSettings();

        if (!creature.path) return;

        const file = this.app.vault.getAbstractFileByPath(creature.path);
        if (!(file instanceof TFile)) return;

        const cache = this.app.metadataCache.getFileCache(file);
        const fm = cache?.frontmatter;
        const maxHp = player.hp;
        const currentHp = player.currentHp ?? player.hp;
        if (
            fm &&
            Number(fm.hp) === maxHp &&
            Number(fm["current-hp"] ?? fm.hp) === currentHp
        ) {
            return;
        }

        this.hpSyncFromVault = true;
        try {
            await this.app.fileManager.processFrontMatter(file, (f) => {
                f.hp = maxHp;
                f["current-hp"] = currentHp;
            });
        } finally {
            this.hpSyncFromVault = false;
        }
    }

    async applyEncounterXp() {
        const totalXp = tracker.getDifficultyValue(this);
        const rpgSystem = getRpgSystem(this);

        if (totalXp <= 0) {
            new Notice(
                "Initiative Tracker: No encounter XP to award. Add monsters to the encounter or set player levels in settings."
            );
            return;
        }

        const encounterPlayers = tracker
            .getOrderedCreatures()
            .filter((c) => c.player && c.enabled);
        if (!encounterPlayers.length) {
            new Notice("Initiative Tracker: No players in the encounter.");
            return;
        }

        const xpPerPlayer = Math.floor(totalXp / encounterPlayers.length);
        if (xpPerPlayer <= 0) return;

        let applied = 0;

        for (const creature of encounterPlayers) {
            const player = this.data.players.find(
                (p) => p.name === creature.name
            );

            const currentXp = Number(player?.xp ?? creature.xp ?? 0);
            const newXp = currentXp + xpPerPlayer;
            creature.xp = newXp;
            if (player) player.xp = newXp;

            const cached = this.playerCreatures.get(creature.name);
            if (cached) cached.xp = newXp;

            const notePath = player?.path ?? creature.path;
            if (notePath) {
                await this.writePlayerXpToLinkedNote(
                    { path: notePath },
                    newXp
                );
            }
            applied++;
        }

        await this.saveSettings();
        tracker.getLogger()?.log(
            `Distributed ${rpgSystem.formatDifficultyValue(xpPerPlayer, true)} to ${applied} player${applied > 1 ? "s" : ""}`
        );
        new Notice(
            `Initiative Tracker: Added ${rpgSystem.formatDifficultyValue(xpPerPlayer, true)} to each player (${rpgSystem.formatDifficultyValue(totalXp, true)} total).`
        );
    }

    async writePlayerXpToLinkedNote(
        player: Pick<HomebrewCreature, "path">,
        xp: number
    ) {
        if (!player.path) return;

        const file = this.app.vault.getAbstractFileByPath(player.path);
        if (!(file instanceof TFile)) return;

        const cache = this.app.metadataCache.getFileCache(file);
        const fm = cache?.frontmatter;
        if (fm && Number(fm.xp) === xp) return;

        this.hpSyncFromVault = true;
        try {
            await this.app.fileManager.processFrontMatter(file, (f) => {
                f.xp = xp;
            });
        } finally {
            this.hpSyncFromVault = false;
        }
    }

    async writePlayerToLinkedNote(player: HomebrewCreature) {
        if (!player.path) return;

        const file = this.app.vault.getAbstractFileByPath(player.path);
        if (!(file instanceof TFile)) return;

        const maxHp = player.hp;
        const currentHp = player.currentHp ?? player.hp;

        this.hpSyncFromVault = true;
        try {
            await this.app.fileManager.processFrontMatter(file, (f) => {
                f.hp = maxHp;
                f["current-hp"] = currentHp;
            });
        } finally {
            this.hpSyncFromVault = false;
        }
    }

    async updatePlayer(existing: HomebrewCreature, player: HomebrewCreature) {
        if (player.currentHp == null && player.hp != null) {
            player.currentHp = player.hp;
        }

        if (!this.playerCreatures.has(existing.name)) {
            await this.savePlayer(player);
            return;
        }

        const creature = this.playerCreatures.get(existing.name);
        creature.update(player);

        this.data.players.splice(
            this.data.players.indexOf(existing),
            1,
            player
        );

        this.playerCreatures.delete(existing.name);
        this.playerCreatures.set(player.name, creature);

        const view = this.view;
        if (view) {
            tracker.updateState();
        }

        await this.saveSettings();
        await this.writePlayerToLinkedNote(player);
    }

    async savePlayer(player: HomebrewCreature) {
        if (player.currentHp == null && player.hp != null) {
            player.currentHp = player.hp;
        }
        this.data.players.push(player);
        this.playerCreatures.set(player.name, Creature.from(player));
        await this.saveSettings();
        await this.writePlayerToLinkedNote(player);
    }
    async savePlayers(...players: HomebrewCreature[]) {
        for (let monster of players) {
            this.data.players.push(monster);
            this.playerCreatures.set(monster.name, Creature.from(monster));
        }
        await this.saveSettings();
    }

    async deletePlayer(player: HomebrewCreature) {
        this.data.players = this.data.players.filter((p) => p != player);
        this.playerCreatures.delete(player.name);
        await this.saveSettings();
    }

    async loadSettings() {
        const data = Object.assign(
            {},
            { ...DEFAULT_SETTINGS },
            await this.loadData()
        );

        this.data = data;
        if (this.data.statuses?.some((c) => !c.id)) {
            for (const condition of this.data.statuses) {
                condition.id =
                    condition.id ??
                    Conditions.find((c) => c.name == condition.name)?.id ??
                    getId();
            }
            await this.saveSettings();
        }

        this.data.version = this.manifest.version
            .split(".")
            .map((n) => Number(n));
    }

    async saveSettings() {
        await this.saveData(this.data);
        tracker.setData(this.data);
        tracker.setPlugin(this);
    }
    private getActiveCombatant(): CreatureView | undefined {
        if (
            this.lastCombatantLeaf?.view instanceof CreatureView
        ) {
            return this.lastCombatantLeaf.view;
        }
        return this.combatant;
    }
    async openCombatant(creature: Creature, newLeaf: boolean = false) {
        if (!this.canUseStatBlocks) return;
        const existing = this.getActiveCombatant();
        if (newLeaf || !existing) {
            const leaf = this.app.workspace.getRightLeaf(true);
            await leaf.setViewState({
                type: CREATURE_TRACKER_VIEW
            });
            this.lastCombatantLeaf = leaf;
            const view = leaf.view as CreatureView;
            await view.render(creature);
            this.app.workspace.revealLeaf(leaf);
        } else {
            this.lastCombatantLeaf = existing.leaf;
            await existing.render(creature);
            this.app.workspace.revealLeaf(existing.leaf);
        }
    }
    private _builderIcon: HTMLElement;
    setBuilderIcon() {
        if (this.data.builder.sidebarIcon) {
            this._builderIcon = this.addRibbonIcon(
                BUILDER_VIEW,
                "Initiative Tracker Encounter Builder",
                () => {
                    this.addBuilderView();
                }
            );
        } else {
            this._builderIcon?.detach();
        }
    }
}
