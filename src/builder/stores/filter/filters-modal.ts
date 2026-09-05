import { Modal, type App } from "obsidian";

import copy from "fast-copy";
import Filters from "./Container.svelte";
import EditFilter from "./EditFilter.svelte";
import type { BuiltFilterStore, Filter, FilterLayout } from "./filter";

export class FiltersModal extends Modal {
    canceled: boolean = false;
    reset = false;
    layout: FilterLayout;
    constructor(
        app: App,
        layout: FilterLayout,
        public filterStore: BuiltFilterStore
    ) {
        super(app);
        this.layout = copy(layout);
    }
    onOpen() {
        this.titleEl.setText("Edit Filters");
        const component = new Filters({
            target: this.contentEl,
            props: {
                filterStore: this.filterStore,
                app: this.app
            }
        });
        component.$on("update", (evt: CustomEvent<FilterLayout>) => {
            this.layout = copy(evt.detail);
        });
        component.$on("cancel", () => {
            this.canceled = true;
            this.close();
        });
    }
}

export class EditFilterModal extends Modal {
    canceled = false;
    filter: Filter;
    constructor(app: App, public original: Filter) {
        super(app);
        this.filter = copy(original);
    }
    onOpen(): void {
        this.titleEl.setText("Edit Filter");
        const component = new EditFilter({
            target: this.contentEl,
            props: {
                filter: this.filter,
                original: this.original
            }
        });

        component.$on("update", (evt: CustomEvent<Filter>) => {
            this.filter = evt.detail;
        });
        component.$on("cancel", () => {
            this.canceled = true;
            this.close();
        });
    }
}
