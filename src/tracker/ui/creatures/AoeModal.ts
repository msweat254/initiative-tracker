import { Modal, Notice, Setting } from "obsidian";
import type InitiativeTracker from "src/main";
import { tracker } from "src/tracker/stores/tracker";
import type { Creature } from "src/utils/creature";

export class AoeModal extends Modal {
    private amountHit = 1;
    private damageEach = 0;

    constructor(
        public plugin: InitiativeTracker,
        public creature: Creature
    ) {
        super(plugin.app);
    }

    onOpen() {
        this.titleEl.setText("Apply AoE");

        new Setting(this.contentEl)
            .setName("Amount Hit")
            .setDesc(
                `How many members take damage (${this.creature.groupRemaining} remaining).`
            )
            .addText((text) => {
                text.setValue(`${this.amountHit}`).onChange((value) => {
                    this.amountHit = Math.floor(Number(value));
                });
                text.inputEl.type = "number";
                text.inputEl.min = "1";
                text.inputEl.max = `${this.creature.groupRemaining}`;
                text.inputEl.step = "1";
            });

        new Setting(this.contentEl)
            .setName("Damage (Each)")
            .setDesc("Damage dealt to each creature hit.")
            .addText((text) => {
                text.setValue("").onChange((value) => {
                    this.damageEach = Number(value);
                });
                text.inputEl.type = "number";
                text.inputEl.min = "0";
                text.inputEl.step = "any";
            });

        new Setting(this.contentEl)
            .addButton((button) =>
                button.setButtonText("Cancel").onClick(() => this.close())
            )
            .addButton((button) =>
                button
                    .setButtonText("Apply")
                    .setCta()
                    .onClick(() => this.apply())
            );
    }

    onClose() {
        this.contentEl.empty();
    }

    private apply() {
        if (
            !Number.isFinite(this.amountHit) ||
            this.amountHit < 1 ||
            this.amountHit > this.creature.groupRemaining
        ) {
            new Notice(
                `Amount Hit must be between 1 and ${this.creature.groupRemaining}.`
            );
            return;
        }
        if (!Number.isFinite(this.damageEach) || this.damageEach <= 0) {
            new Notice("Damage (Each) must be greater than 0.");
            return;
        }

        tracker.updateCreatures({
            creature: this.creature,
            change: { hp: -(this.amountHit * this.damageEach) }
        });
        this.close();
    }
}
