import "obsidian";

declare module "obsidian" {
    interface App {
        plugins: {
            enabledPlugins: Set<string>;
        };
        commands: {
            commands: { [id: string]: Command };
            findCommand(id: string): Command;
            executeCommandById(id: string): void;
            listCommands(): Command[];
        };
    }
    interface WorkspaceItem {
        containerEl: HTMLElement;
    }
    interface Workspace {
        trigger(
            name: "hover-link",
            payload: {
                event: MouseEvent;
                source: string;
                hoverParent: import("obsidian").View | { hoverPopover: null };
                targetEl: HTMLElement;
                linktext: string;
            }
        ): void;
    }

    interface MenuItem {
        setSubmenu: () => Menu;
        submenu: Menu;
    }

    /** Ambient 1.13+ declarative settings API (installed typings may lag). */
    interface PluginSettingTab {
        getSettingDefinitions?(): SettingDefinitionItem[];
        getControlValue?(key: string): unknown;
        setControlValue?(key: string, value: unknown): void | Promise<void>;
        update?(): void;
    }

    type SettingDefinitionItem =
        | SettingDefinition
        | SettingDefinitionGroup;

    interface SettingDefinitionBase {
        name: string;
        desc?: string | DocumentFragment;
        aliases?: string[];
        searchable?: boolean | (() => boolean);
        visible?: boolean | (() => boolean);
    }

    type SettingDefinition =
        | SettingDefinitionControl
        | SettingDefinitionRender
        | SettingDefinitionEmpty;

    interface SettingDefinitionEmpty extends SettingDefinitionBase {
        control?: never;
        render?: never;
    }

    interface SettingDefinitionControl extends SettingDefinitionBase {
        control: {
            type: "toggle" | "dropdown" | "text" | "textarea" | "number";
            key: string;
            options?: Record<string, string>;
            placeholder?: string;
        };
        render?: never;
    }

    interface SettingDefinitionRender extends SettingDefinitionBase {
        control?: never;
        render: (
            setting: Setting,
            group: unknown
        ) => void | (() => void);
    }

    interface SettingDefinitionGroup {
        type: "group" | "list";
        heading?: string;
        items: SettingDefinitionItem[];
        visible?: boolean | (() => boolean);
    }
}
