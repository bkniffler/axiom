declare module '@strudel/web' {
    interface StrudelOptions {
        prebake?: () => Promise<void>;
        defaultOutput?: string;
    }

    interface Scheduler {
        start(): void;
        stop(): void;
    }

    interface Repl {
        evaluate(code: string): Promise<void>;
        scheduler: Scheduler;
    }

    export function initStrudel(options?: StrudelOptions): Promise<void>;
    export function repl(options?: { defaultOutput?: string }): Repl;
    export function samples(source: string): Promise<void>;
}
