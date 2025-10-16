import {AbstractAttribute} from './AbstractAttribute';

/**
 * Represents a mutable plain attribute that extends the functionality of an abstract attribute.
 * Provides mechanisms to get, set, and track changes in its value.
 *
 * @template T The type of the attribute's value. Defaults to `any`.
 *
 * @extends AbstractAttribute<T>
 */
export class MutableAttribute<T = any> extends AbstractAttribute<T> {

    constructor(key: string, rt: any, private value: T) {
        super(key, rt);
    }

    get(): T {
        this.collect();
        return this.value;
    }

    set(v: T): void {
        if (v !== this.value) {
            this.value = v;
            this.emit();
        }
    }

    isWritable(): boolean {
        return true;
    }
}
