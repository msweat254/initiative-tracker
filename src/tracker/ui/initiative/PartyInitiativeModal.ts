import { Modal } from "obsidian";
import type InitiativeTracker from "src/main";
import type { Creature } from "src/utils/creature";
import PartyInitiative from "./PartyInitiative.svelte";

export class PartyInitiativeModal extends Modal {
    private component: PartyInitiative | null = null;

    constructor(
        public plugin: InitiativeTracker,
        public players: Creature[]
    ) {
        super(plugin.app);
    }

    onOpen() {
        this.titleEl.setText("Set Party Initiative");
        this.modalEl.addClass("initiative-tracker-party-initiative-modal");
        this.component = new PartyInitiative({
            target: this.contentEl,
            props: {
                players: this.players
            }
        });
        this.component.$on("close", () => this.close());
    }

    onClose() {
        this.component?.$destroy();
        this.component = null;
        this.contentEl.empty();
    }
}
