import {AbstractAttribute} from './AbstractAttribute';
import {State, type StateSchemaHandle} from './State';

/**
 * Class representing a nested attribute that manages an internal state.
 * Used for handling nested objects and maintaining synchronization.
 * Extends the AbstractAttribute class.
 */
export class NestedAttribute extends AbstractAttribute<State> {

    private inner: State;
    private parent?: State;

    constructor(key: string, rt: any, initial: Record<string, any>, parent?: State, private schema?: StateSchemaHandle) {
        super(key, rt);
        this.parent = parent;
        const schemaOptions = this.schema?.stateOptions();
        this.inner = new State(initial, {
            parent,
            runtime: this.runtime,
            ...(schemaOptions ?? {})
        });
    }

    get(): State {
        this.collect();
        return this.inner;
    }

    set(v: any): void {
        if (!(v && typeof v === 'object')) {
            throw new Error(`Nested '${this.key()}' requires object/State.`);
        }
        if (v instanceof State) {
            this.inner = v;
        } else {
            const schemaOptions = this.schema?.stateOptions();
            this.inner = new State(v, {
                parent: this.parent,
                runtime: this.runtime,
                ...(schemaOptions ?? {})
            });
        }
        this.emit();
    }
}
