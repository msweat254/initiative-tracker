import { ItemView, WorkspaceLeaf } from "obsidian";
import type InitiativeTracker from "src/main";
import { PLAYER_VIEW_VIEW } from "../utils";

import App from "./player/PlayerView.svelte";

export default class PlayerView extends ItemView {
    _app: App;
    getDisplayText(): string {
        return "Player View";
    }
    getViewType(): string {
        return PLAYER_VIEW_VIEW;
    }
    getIcon(): string {
        return "lucide-view";
    }
    constructor(public leaf: WorkspaceLeaf, public plugin: InitiativeTracker) {
        super(leaf);
    }
    onOpen(): Promise<void> {
        this._app = new App({
            target: this.contentEl,
            props: {}
        });
        return Promise.resolve();
    }
    onClose(): Promise<void> {
        this._app?.$destroy();
        return Promise.resolve();
    }
}
