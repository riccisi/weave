import type {Attribute} from './Attribute';

/**
 * Flushable units queued during batching.
 */
export interface Flushable {
    _flushEmit(): void;
}

/**
 * A runtime system to manage reactive updates and emissions with batching and coalescing capabilities.
 * Helps ensure efficient scheduling of flushable tasks by reducing redundant updates during a batching phase.
 *
 * The class provides mechanisms to enqueue updates, batch multiple changes,
 * and flush the queued changes in a coalesced manner.
 */
export class ReactiveRuntime {

    readonly deps = new Dependencies();
    private batching = 0;
    private queue = new Set<Flushable>();

    /** Queue an emission (coalesced while batching). */
    enqueue(a: Flushable) {
        if (this.batching > 0) this.queue.add(a);
        else a._flushEmit();
    }

    /**
     * Batch changes and coalesce emissions into a single flush tick.
     */
    batch<T>(fn: () => T): T {
        this.batching++;
        try {
            return fn();
        } finally {
            this.batching--;
            if (this.batching === 0) this.flush();
        }
    }

    private flush() {
        const items = Array.from(this.queue);
        this.queue.clear();
        for (const a of items) a._flushEmit();
    }
}

/**
 * Dependency tracking stack. Producers call collect(attr) during get().
 * Consumers wrap reads with runWithCollector to subscribe to those attrs.
 */
class Dependencies {
    private stack: Array<{ register: (attr: Attribute<any>) => void }> = [];

    runWithCollector<T>(register: (attr: Attribute<any>) => void, fn: () => T): T {
        this.stack.push({register});
        try {
            return fn();
        } finally {
            this.stack.pop();
        }
    }

    collect(attr: Attribute<any>) {
        const top = this.stack[this.stack.length - 1];
        if (top) top.register(attr);
    }
}
