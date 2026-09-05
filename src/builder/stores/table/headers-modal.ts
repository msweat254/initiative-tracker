import { Modal, type App } from "obsidian";

import Headers from "./Headers.svelte";
import type { TableHeaderState } from "src/builder/builder.types";
import copy from "fast-copy";

export class HeadersModal extends Modal {
    canceled: boolean = false;
    reset = false;
    constructor(app: App, public headers: TableHeaderState[]) {
        super(app);
    }
    onOpen() {
        this.titleEl.setText("Edit Headers");
        const component = new Headers({
            target: this.contentEl,
            props: {
                headers: copy(this.headers),
                app: this.app
            }
        });
        component.$on("update", (evt: CustomEvent<TableHeaderState[]>) => {
            this.headers = copy(evt.detail);
        });
        component.$on("cancel", () => {
            this.canceled = true;
            this.close();
        });
        component.$on("reset", () => {
            this.reset = true;
            this.close();
        });
    }
}
