/** Minimal Dice Roller API surface used by Initiative Tracker. */
export interface InitiativeDiceRoller {
    getRoller(
        raw: string,
        source?: string
    ): { rollSync(): number } | null;
}

declare global {
    interface Window {
        DiceRoller?: InitiativeDiceRoller;
    }
}

export {};
