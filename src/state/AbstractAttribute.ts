import type {Attribute, Unsub} from './Attribute';
import {ReactiveRuntime} from './ReactiveRuntime';

/**
 * Abstract base class defining a reactive attribute with dependency tracking and subscription management.
 * This class provides a framework for reactive attributes, supporting reading, optional writing,
 * subscription to changes, and integration with dependency tracking mechanisms.
 *
 * The class is parameterized by a generic type `T`, which represents the type of value managed by the attribute.
 * Subclasses are expected to provide implementations for the abstract method `get` and optionally override
 * the `set` method if the attribute is writable.
 *
 * Responsibilities of this class include:
 * - Managing a set of subscribers (watchers) that are notified when the value changes.
 * - Integrating with a reactive runtime for dependency tracking and change emission.
 * - Allowing for read-only or writable behavior to be enforced at the subclass level.
 *
 * Generic Type Parameter:
 * - T: The type of value managed by the attribute. Defaults to `any` if not specified.
 */
export abstract class AbstractAttribute<T = any> implements Attribute<T> {

    protected watchers = new Set<(v: T) => void>();

    protected constructor(
        protected readonly _key: string,
        protected readonly runtime: ReactiveRuntime
    ) {
    }

    /**
     * Retrieves the key associated with the current instance.
     *
     * @return {string} The key as a string.
     */
    key(): string {
        return this._key;
    }

    /**
     * Retrieves the desired value or resource.
     *
     * @return {T} The value or resource obtained by the implementation of this method.
     **/
    abstract get(): T;

    /**
     * The default writing behavior is read-only. Subclasses override if writable.
     *
     * @param value The value to be set.
     * @throws {Error} If the attribute is read-only.
     **/
    set(value: T): void {
        throw new Error(`'${this._key}' is read-only.`);
    }

    /**
     * The default writing behavior is read-only. Subclasses override if writable.
     *
     * @return {boolean} Returns true if the resource is writable, otherwise false.
     **/
    isWritable(): boolean {
        return false;
    }


    /**
     * Subscribes a given callback function to be invoked whenever the value changes.
     *
     * @param {Function} fn - The callback function to be invoked. It is called with the current value as its parameter.
     * @param {Object} [opts] - Optional configuration options for the subscription.
     * @param {boolean} [opts.immediate=true] - If true or undefined, the callback is immediately invoked with the current value.
     * @return {Function} A function that can be called to unsubscribe the callback from future notifications.
     **/
    subscribe(fn: (v: T) => void, opts?: { immediate?: boolean }): Unsub {
        this.watchers.add(fn);
        if (!opts || opts.immediate !== false) {
            try {
                fn(this.get());
            } catch {
            }
        }
        return () => this.watchers.delete(fn);
    }

    /**
     * Enqueue a flush that invokes all subscribers with fresh value.
     *
     **/
    protected emit(): void {
        const self = this;
        this.runtime.enqueue({
            _flushEmit() {
                const v = self.get();
                for (const fn of [...self.watchers]) {
                    try {
                        fn(v);
                    } catch {
                    }
                }
            }
        });
    }

    /**
     * Register this attribute in the current dependency-collector (if any).
     * This method is called during get() to ensure that the attribute is tracked.
     *
     **/
    protected collect(): void {
        this.runtime.deps.collect(this as unknown as Attribute<any>);
    }

    /**
     * Cleans up resources or references maintained by the instance.
     * This method is used to clear internal data, such as watchers,
     * to ensure proper garbage collection and avoid memory leaks.
     *
     * @return {void} No return value.
     */
    dispose(): void {
        this.watchers.clear();
    }
}
