import {AbstractAttribute} from './AbstractAttribute';
import type {Attribute} from './Attribute';
import type {State} from './State';
import type {ReactiveRuntime} from './ReactiveRuntime';

/**
 * Represents a derived attribute whose value is computed based on other attributes or state.
 * Automatically subscribes to dependencies and recomputes its value when those dependencies change.
 *
 * @template T The type of the attribute value.
 *
 * @extends AbstractAttribute
 *
 * @param {string} key The unique key identifying this attribute.
 * @param {ReactiveRuntime} runtime The runtime instance used for dependency tracking and updates.
 * @param {() => State} owner A function that returns the owning `State` object.
 * @param {(s: State) => T} compute A function used to compute the value of this attribute based on the owning state.
 */
export class DerivedAttribute<T = any> extends AbstractAttribute<T> {

    private value!: T;
    private deps = new Map<Attribute<any>, () => void>();

    constructor(
        key: string,
        runtime: ReactiveRuntime,
        private owner: () => State,
        private compute: (s: State) => T
    ) {
        super(key, runtime);
        this.recompute(true);
    }

    get(): T {
        this.collect();
        return this.value;
    }

    private register = (attr: Attribute<any>) => {
        if (!this.deps.has(attr)) {
            const off = attr.subscribe(() => this.recompute(false), {immediate: false});
            this.deps.set(attr, off);
        }
    };

    private recompute(initial: boolean) {
        for (const off of this.deps.values()) off();
        this.deps.clear();
        const next = this.runtime.deps.runWithCollector(
            a => this.register(a as Attribute<any>),
            () => this.compute(this.owner())
        );
        if (initial || next !== this.value) {
            this.value = next;
            this.emit();
        }
    }

    dispose(): void {
        super.dispose();
        for (const off of this.deps.values()) off();
        this.deps.clear();
    }
}