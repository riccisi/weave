import {AbstractAttribute} from './AbstractAttribute';
import {State} from './State';

/**
 * Class representing a nested attribute that manages an internal state.
 * Used for handling nested objects and maintaining synchronization.
 * Extends the AbstractAttribute class.
 */
export class NestedAttribute extends AbstractAttribute<State> {

    private inner: State;

    constructor(key: string, rt: any, initial: Record<string, any>) {
        super(key, rt);
        this.inner = new State(initial, undefined, this.runtime);
    }

    get(): State {
        this.collect();
        return this.inner;
    }

    set(v: any): void {
        if (v && typeof v === 'object') {
            this.inner = v instanceof State ? v : new State(v, undefined, this.runtime);
            this.emit();
        } else {
            throw new Error(`Nested '${this.key()}' requires object/State.`);
        }
    }
}
