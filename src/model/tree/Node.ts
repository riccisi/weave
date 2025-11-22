// src/model/tree/Node.ts
export interface NodeConfig<T = unknown> {
    /** Unique identifier for the node. */
    id: string;

    /** Optional label/text (e.g., for menus/breadcrumbs). */
    text?: string;

    /** Optional href (e.g., for menus/links). */
    href?: string;

    /** Optional icon class or token. */
    icon?: string;

    /** Visibility and interactivity hints. */
    visible?: boolean;
    disabled?: boolean;

    /** Arbitrary user metadata. */
    meta?: T;

    /** Children in plain config form. */
    children?: Array<NodeConfig<T>>;
}

/** Visitor command to control traversal flow. */
export enum Visit {
    /** Keep traversing normally. */
    Continue = 'continue',
    /** Skip visiting current node's children. */
    Skip = 'skip',
    /** Stop traversal entirely. */
    Stop = 'stop',
}

/** OO Visitor interface for Node<T> trees. */
export interface Visitor<T = unknown> {
    /**
     * Called on entering a node (pre-order).
     * Return Visit.Skip to skip children, or Visit.Stop to stop traversal.
     */
    enter?(node: Node<T>, ctx: VisitContext<T>): Visit | void;

    /** Called on leaving a node (post-order). */
    leave?(node: Node<T>, ctx: VisitContext<T>): void;
}

export interface VisitContext<T = unknown> {
    /** Parent node, if any. */
    parent?: Node<T>;
    /** Depth from root (root depth = 0). */
    depth: number;
    /** Index among siblings (0-based). */
    index: number;
}

/**
 * OO tree node.
 * - strong parent/children links
 * - pure, immutable public surface (children exposed as readonly)
 * - rich utilities for traversal, queries, and breadcrumb trails
 */
export class Node<T = unknown> {
    // ---- core data -------------------------------------------------------------

    public readonly id: string;
    public readonly text?: string;
    public readonly href?: string;
    public readonly icon?: string;
    public readonly visible: boolean;
    public readonly disabled: boolean;
    public readonly meta?: T;

    private _parent?: Node<T>;
    private readonly _children: ReadonlyArray<Node<T>>;

    // ---- construction ----------------------------------------------------------

    constructor(cfg: NodeConfig<T>, parent?: Node<T>) {
        if (!cfg || !cfg.id) throw new Error('Node requires a non-empty id');
        this.id = cfg.id;
        this.text = cfg.text;
        this.href = cfg.href;
        this.icon = cfg.icon;
        this.visible = cfg.visible ?? true;
        this.disabled = cfg.disabled ?? false;
        this.meta = cfg.meta;
        this._parent = parent;
        let builtChildren = (cfg.children ?? []).map(ch => new Node(ch, this));
        this._children = Object.freeze(builtChildren) as ReadonlyArray<Node<T>>;
    }

    /** Build a full tree from a root config. */
    static from<T = unknown>(cfg: NodeConfig<T>): Node<T> {
        return new Node<T>(cfg, undefined);
    }

    /** Convert this node (recursively) back to plain config. */
    toConfig(): NodeConfig<T> {
        return {
            id: this.id,
            text: this.text,
            href: this.href,
            icon: this.icon,
            visible: this.visible,
            disabled: this.disabled,
            meta: this.meta,
            children: this._children.map(ch => ch.toConfig())
        };
    }

    // ---- structure ------------------------------------------------------------

    /** Parent node (undefined for root). */
    get parent(): Node<T> | undefined {
        return this._parent;
    }

    /** Readonly children list. */
    get children(): ReadonlyArray<Node<T>> {
        return this._children;
    }

    /** Whether this node is the root. */
    isRoot(): boolean {
        return !this._parent;
    }

    /** Whether this node has no children. */
    isLeaf(): boolean {
        return this._children.length === 0;
    }

    /** Depth from root (root depth = 0). */
    depth(): number {
        let d = 0, p = this._parent;
        while (p) {
            d++;
            p = p._parent;
        }
        return d;
    }

    /** Root node of this tree. */
    root(): Node<T> {
        let n: Node<T> = this;
        while (n._parent) n = n._parent;
        return n;
    }

    /** Ancestors from parent up to root (excluding self). */
    ancestors(): Node<T>[] {
        const res: Node<T>[] = [];
        let p = this._parent;
        while (p) {
            res.push(p);
            p = p._parent;
        }
        return res;
    }

    /** Trail from root to this (includes self). Handy for breadcrumbs. */
    trail(): Node<T>[] {
        const a = this.ancestors();
        a.reverse();
        a.push(this);
        return a;
    }

    /** 0-based position among siblings (or -1 if root). */
    indexInParent(): number {
        if (!this._parent) return -1;
        return this._parent._children.indexOf(this);
    }

    /** Previous sibling (if any). */
    prevSibling(): Node<T> | undefined {
        const i = this.indexInParent();
        if (i <= 0) return undefined;
        return this._parent!._children[i - 1];
    }

    /** Next sibling (if any). */
    nextSibling(): Node<T> | undefined {
        const i = this.indexInParent();
        if (i < 0) return undefined;
        return this._parent!._children[i + 1];
    }

    // ---- queries --------------------------------------------------------------

    /** Depth-first search for the first node matching the predicate. */
    find(pred: (n: Node<T>) => boolean): Node<T> | undefined {
        if (pred(this)) return this;
        for (const ch of this._children) {
            const f = ch.find(pred);
            if (f) return f;
        }
        return undefined;
    }

    /** Locate a node by id. */
    findById(id: string): Node<T> | undefined {
        return this.find(n => n.id === id);
    }

    /**
     * Compute a path from this node to a descendant with given id.
     * Returns [this, ..., target] or undefined if not found.
     */
    pathToDescendant(id: string): Node<T>[] | undefined {
        if (this.id === id) return [this];
        for (const ch of this._children) {
            const p = ch.pathToDescendant(id);
            if (p) {
                p.unshift(this);
                return p;
            }
        }
        return undefined;
    }

    // ---- traversal ------------------------------------------------------------

    /** Accept a visitor (pre/post with flow control). */
    accept(visitor: Visitor<T>, ctx: VisitContext<T> = {
        depth: this.depth(),
        index: this.indexInParent(),
        parent: this._parent
    }): Visit {
        const enterCmd = visitor.enter?.(this, ctx) ?? Visit.Continue;
        if (enterCmd === Visit.Stop) return Visit.Stop;
        if (enterCmd !== Visit.Skip) {
            for (let i = 0; i < this._children.length; i++) {
                const ch = this._children[i];
                const cmd = ch.accept(visitor, {depth: ctx.depth + 1, index: i, parent: this});
                if (cmd === Visit.Stop) return Visit.Stop;
            }
        }
        visitor.leave?.(this, ctx);
        return Visit.Continue;
    }

    /** Pre-order generator (for..of). */
    * preorder(): IterableIterator<Node<T>> {
        yield this;
        for (const ch of this._children) yield* ch.preorder();
    }

    /** Post-order generator. */
    * postorder(): IterableIterator<Node<T>> {
        for (const ch of this._children) yield* ch.postorder();
        yield this;
    }

    [Symbol.iterator](): IterableIterator<Node<T>> {
        return this.preorder();
    }

    // ---- transformation (immutable-return helpers) ----------------------------

    /**
     * Create a shallowly updated copy of this node.
     * Children are copied as-is; parent will be re-linked by caller if needed.
     */
    with(patch: Partial<Omit<NodeConfig<T>, 'children'>> & { children?: Array<Node<T> | NodeConfig<T>> }): Node<T> {
        const cfg: NodeConfig<T> = {
            id: patch.id ?? this.id,
            text: patch.text ?? this.text,
            href: patch.href ?? this.href,
            icon: patch.icon ?? this.icon,
            visible: patch.visible ?? this.visible,
            disabled: patch.disabled ?? this.disabled,
            meta: (patch as any).meta !== undefined ? (patch as any).meta : this.meta,
            children: (patch.children ?? this._children).map(ch => (ch instanceof Node ? ch.toConfig() : ch as NodeConfig<T>))
        };
        // New node; parent linkage is set in constructor for children.
        const next = new Node<T>(cfg, this._parent);
        return next;
    }

    // ---- convenience for breadcrumbs ------------------------------------------

    /** Map trail to a minimal crumb DTO (customizable via projector). */
    toCrumbs<U = { text?: string; href?: string; id: string }>(
        projector: (n: Node<T>) => U = (n) => ({id: n.id, text: n.text, href: n.href} as U)
    ): U[] {
        return this.trail().map(projector);
    }
}