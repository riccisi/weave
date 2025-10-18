export type Unsub = () => void;

/**
 * Represents an attribute with a value of type T, providing functionality to access,
 * modify, and observe changes to the attribute's value, along with its metadata and lifecycle management.
 * The interface is designed to be flexible and extensible, allowing for different implementations
 * based on the specific needs of different use cases.
 *
 * @template T The type of the attribute's value.
 */
export interface Attribute<T = any> {

    /**
     * The stable, human-readable key for this attribute (for debugging).
     *
     * @returns the key as a string.
     **/
    key(): string;

    /**
     * Current value. Reading participates in a dependency collection.
     *
     * @returns the current value.
     **/
    get(): T;

    /**
     * Set the value. Implementations may throw if the attribute is read-only.
     *
     * @param value new value
     */
    set(value: T): void;

    /**
     * Subscribe to changes. By default, the current value is pushed immediately.
     *
     * @param fn callback
     * @param opts
     * @param opts.immediate when false, skip the initial push
     * @returns unsubscribe function
     */
    subscribe(fn: (v: T) => void, opts?: { immediate?: boolean, buffer?: number }): Unsub;

    /**
     * Whether this attribute supports writes.
     *
     * @returns true if writable, false otherwise.
     **/
    isWritable(): boolean;

    /**
     * Clean up internal resources (e.g., detach nested listeners).
     **/
    dispose(): void;
}
