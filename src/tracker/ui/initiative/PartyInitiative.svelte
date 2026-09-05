<script lang="ts">
    import { Setting } from "obsidian";
    import { createEventDispatcher } from "svelte";
    import type { Creature } from "src/utils/creature";
    import { tracker } from "../../stores/tracker";

    export let players: Creature[];

    const dispatch = createEventDispatcher<{ close: void }>();

    /** Shared totals so multiple nats tie and order can be random. */
    const NAT_20_INITIATIVE = 99;
    const NAT_1_INITIATIVE = -99;

    type Nat = 1 | 20 | null;

    type Row = {
        creature: Creature;
        roll: number | null;
        nat: Nat;
        save: boolean;
        mod: number;
    };

    function flatMod(mod: number | number[] | undefined): number {
        return [mod ?? 0].flat().reduce((a, b) => a + b, 0);
    }

    function inferRow(creature: Creature): Pick<Row, "roll" | "nat"> {
        const initiative = Number(creature.initiative);
        if (creature.initiative == null || isNaN(initiative)) {
            return { roll: null, nat: null };
        }
        if (initiative === NAT_20_INITIATIVE) {
            return { roll: 20, nat: 20 };
        }
        if (initiative === NAT_1_INITIATIVE) {
            return { roll: 1, nat: 1 };
        }
        const roll = initiative;
        if (roll < 1 || roll > 20) return { roll: null, nat: null };
        return { roll, nat: null };
    }

    let rows: Row[] = players.map((creature) => {
        const inferred = inferRow(creature);
        return {
            creature,
            roll: inferred.roll,
            nat: inferred.nat,
            save: !!creature.static,
            mod: flatMod(creature.modifier)
        };
    });

    function setNat(row: Row, nat: 1 | 20) {
        row.nat = nat;
        row.roll = nat;
        rows = rows;
    }

    function onRollInput(row: Row) {
        // Manual entry leaves nat mode so modifier applies again.
        row.nat = null;
        rows = rows;
    }

    function total(row: Row): number | null {
        if (row.nat === 20) return NAT_20_INITIATIVE;
        if (row.nat === 1) return NAT_1_INITIATIVE;
        if (row.roll == null || row.roll === ("" as unknown as number)) {
            return null;
        }
        const roll = Number(row.roll);
        if (isNaN(roll)) return null;
        return roll + row.mod;
    }

    function shuffle<T>(items: T[]): T[] {
        const copy = [...items];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    function apply() {
        const updates = rows.flatMap((row) => {
            const initiative = total(row);
            if (initiative == null) return [];
            return [
                {
                    creature: row.creature,
                    change: {
                        initiative,
                        static: row.save
                    },
                    nat: row.nat
                }
            ];
        });

        // Same nat totals should tie; shuffle manual order so who goes first varies.
        for (const nat of [20, 1] as const) {
            const group = shuffle(updates.filter((u) => u.nat === nat));
            group.forEach((update, index) => {
                update.creature.manualOrder = index;
            });
        }

        if (updates.length) {
            tracker.updateCreatures(
                ...updates.map(({ creature, change }) => ({ creature, change }))
            );
        }
        dispatch("close");
    }

    function footer(node: HTMLElement) {
        new Setting(node)
            .addButton((b) =>
                b.setButtonText("Cancel").onClick(() => dispatch("close"))
            )
            .addButton((b) =>
                b
                    .setButtonText("Apply")
                    .setCta()
                    .onClick(() => apply())
            );
    }
</script>

{#if !rows.length}
    <p class="initiative-tracker-party-initiative-empty">
        No player characters are in this encounter.
    </p>
{:else}
    <div class="initiative-tracker-party-initiative">
        <div class="initiative-tracker-party-initiative-header">
            <span>Character</span>
            <span>d20</span>
            <span>Total</span>
            <span title="Save as static (won't be overwritten by Re-roll)"
                >Save</span
            >
        </div>
        {#each rows as row}
            <div class="initiative-tracker-party-initiative-row">
                <div class="name">
                    <span class="character">{row.creature.getName()}</span>
                    <span class="mod"
                        >{row.mod >= 0 ? `+${row.mod}` : row.mod}</span
                    >
                </div>
                <div class="roll">
                    <button
                        type="button"
                        class="nat"
                        class:active={row.nat === 1}
                        aria-label="Natural 1 (worst initiative)"
                        title="Natural 1 — worst possible initiative"
                        on:click={() => setNat(row, 1)}
                    >
                        1
                    </button>
                    <input
                        type="number"
                        min="1"
                        max="20"
                        bind:value={row.roll}
                        on:input={() => onRollInput(row)}
                        aria-label={`${row.creature.getName()} d20 roll`}
                    />
                    <button
                        type="button"
                        class="nat"
                        class:active={row.nat === 20}
                        aria-label="Natural 20 (best initiative)"
                        title="Natural 20 — best possible initiative"
                        on:click={() => setNat(row, 20)}
                    >
                        20
                    </button>
                </div>
                <div class="total">
                    {#if total(row) != null}
                        {#if row.nat === 20}
                            <span class="nat-total" title="Shared nat 20 total"
                                >{total(row)}</span
                            >
                        {:else if row.nat === 1}
                            <span class="nat-total" title="Shared nat 1 total"
                                >{total(row)}</span
                            >
                        {:else}
                            {total(row)}
                        {/if}
                    {:else}
                        —
                    {/if}
                </div>
                <label
                    class="save"
                    title="Save as static (won't be overwritten by Re-roll)"
                >
                    <input type="checkbox" bind:checked={row.save} />
                    <span class="sr-only">Save as static</span>
                </label>
            </div>
        {/each}
    </div>
{/if}

<div class="initiative-tracker-party-initiative-footer" use:footer />

<style>
    .initiative-tracker-party-initiative-empty {
        color: var(--text-muted);
        margin: 0.5rem 0 1rem;
    }

    .initiative-tracker-party-initiative {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 1rem;
    }

    .initiative-tracker-party-initiative-header,
    .initiative-tracker-party-initiative-row {
        display: grid;
        grid-template-columns: minmax(7rem, 1.4fr) minmax(9rem, 1.2fr) 3.5rem 2.5rem;
        gap: 0.5rem;
        align-items: center;
    }

    .initiative-tracker-party-initiative-header {
        font-size: var(--font-ui-smaller);
        color: var(--text-muted);
        font-weight: var(--font-semibold);
        padding-bottom: 0.25rem;
        border-bottom: 1px solid var(--background-modifier-border);
    }

    .name {
        display: flex;
        flex-direction: column;
        min-width: 0;
    }

    .character {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .mod {
        color: var(--text-muted);
        font-size: var(--font-ui-smaller);
    }

    .roll {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 0.25rem;
        align-items: center;
    }

    .roll input {
        width: 100%;
        text-align: center;
    }

    .nat {
        min-width: 2.25rem;
        padding: 0.2rem 0.35rem;
        border-radius: var(--radius-s);
        border: 1px solid var(--background-modifier-border);
        background: var(--background-secondary);
        color: var(--text-normal);
        cursor: pointer;
    }

    .nat.active {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        border-color: var(--interactive-accent);
    }

    .total {
        text-align: center;
        font-variant-numeric: tabular-nums;
        font-weight: var(--font-semibold);
    }

    .nat-total {
        color: var(--interactive-accent);
    }

    .save {
        display: flex;
        justify-content: center;
        margin: 0;
    }

    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }

    .initiative-tracker-party-initiative-footer :global(.setting-item) {
        border: none;
        padding: 0;
    }

    .initiative-tracker-party-initiative-footer
        :global(.setting-item-control) {
        justify-content: flex-end;
    }
</style>
