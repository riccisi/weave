// tests/tree.Node.test.ts
import { describe, it, expect } from 'vitest';
import { Node, Visit, type NodeConfig } from '../src/model/tree/Node';

/** Build a sample tree:
 *
 * root
 * ├─ settings
 * │  ├─ account
 * │  └─ display
 * └─ search
 */
function makeTree() {
    const cfg: NodeConfig = {
        id: 'root',
        text: 'Home',
        children: [
            {
                id: 'settings',
                text: 'Settings',
                children: [
                    { id: 'account', text: 'Account', href: '/settings/account' },
                    { id: 'display', text: 'Display', href: '/settings/display' }
                ]
            },
            { id: 'search', text: 'Search', href: '/search' }
        ]
    };
    const root = Node.from(cfg);
    const settings = root.findById('settings')!;
    const account = root.findById('account')!;
    const display = root.findById('display')!;
    const search = root.findById('search')!;
    return { root, settings, account, display, search };
}

describe('Node<T> construction', () => {
    it('builds parent/children links from config', () => {
        const { root, settings, account, display, search } = makeTree();

        expect(root.isRoot()).toBe(true);
        expect(root.parent).toBeUndefined();
        expect(root.children.length).toBe(2);
        expect(root.children[0]).toBe(settings);

        expect(settings.parent).toBe(root);
        expect(settings.children.length).toBe(2);
        expect(settings.children[0]).toBe(account);
        expect(settings.children[1]).toBe(display);

        expect(search.parent).toBe(root);
        expect(search.isLeaf()).toBe(true);
    });

    it('exposes a readonly children view', () => {
        const { root } = makeTree();
        expect(() => {
            // @ts-expect-error (readonly)
            root.children.push(root);
        }).toThrow();
    });

    it('preserves optional fields (text, href, icon, flags, meta)', () => {
        const cfg: NodeConfig<{ role: string }> = {
            id: 'n',
            text: 'Node',
            href: '/n',
            icon: 'icon-[tabler--cube]',
            visible: false,
            disabled: true,
            meta: { role: 'admin' },
            children: []
        };
        const n = Node.from(cfg);
        expect(n.text).toBe('Node');
        expect(n.href).toBe('/n');
        expect(n.icon).toBe('icon-[tabler--cube]');
        expect(n.visible).toBe(false);
        expect(n.disabled).toBe(true);
        expect(n.meta?.role).toBe('admin');
    });
});

describe('Hierarchy utilities', () => {
    it('depth, root(), ancestors(), trail()', () => {
        const { root, settings, display } = makeTree();

        expect(root.depth()).toBe(0);
        expect(settings.depth()).toBe(1);
        expect(display.depth()).toBe(2);

        expect(display.root()).toBe(root);

        const anc = display.ancestors();
        expect(anc.map(n => n.id)).toEqual(['settings', 'root']); // top-down? we’ll assert order…
        // ancestors() returns from parent → up; the code returns [settings, root]
        // trail() returns [root, settings, display]
        const trail = display.trail().map(n => n.id);
        expect(trail).toEqual(['root', 'settings', 'display']);
    });

    it('sibling navigation and indexInParent', () => {
        const { root, settings, search, account, display } = makeTree();

        expect(root.indexInParent()).toBe(-1);
        expect(settings.indexInParent()).toBe(0);
        expect(search.indexInParent()).toBe(1);

        expect(search.prevSibling()).toBe(settings);
        expect(settings.prevSibling()).toBeUndefined();

        expect(settings.nextSibling()).toBe(search);
        expect(search.nextSibling()).toBeUndefined();

        expect(account.nextSibling()).toBe(display);
        expect(display.prevSibling()).toBe(account);
    });
});

describe('Queries', () => {
    it('find() by predicate', () => {
        const { root } = makeTree();
        const found = root.find(n => n.text === 'Display');
        expect(found?.id).toBe('display');
    });

    it('findById()', () => {
        const { root } = makeTree();
        expect(root.findById('account')?.text).toBe('Account');
        expect(root.findById('nope')).toBeUndefined();
    });

    it('pathToDescendant()', () => {
        const { settings } = makeTree();
        const path = settings.pathToDescendant('display');
        expect(path?.map(n => n.id)).toEqual(['settings', 'display']);
        expect(settings.pathToDescendant('root')).toBeUndefined();
    });
});

describe('Traversal / Visitor', () => {
    it('preorder iteration (Symbol.iterator) yields nodes in pre-order', () => {
        const { root } = makeTree();
        const ids = [...root].map(n => n.id);
        expect(ids).toEqual(['root', 'settings', 'account', 'display', 'search']);
    });

    it('accept() → enter/leave order, and Visit.Skip', () => {
        const { root } = makeTree();
        const events: string[] = [];

        root.accept({
            enter(n) {
                events.push(`enter:${n.id}`);
                if (n.id === 'settings') return Visit.Skip; // skip children
            },
            leave(n) {
                events.push(`leave:${n.id}`);
            }
        });

        // Children of "settings" (account/display) are skipped
        expect(events).toEqual([
            'enter:root',
            'enter:settings',
            'leave:settings',
            'enter:search',
            'leave:search',
            'leave:root'
        ]);
    });

    it('accept() → Visit.Stop stops traversal entirely', () => {
        const { root } = makeTree();
        const seen: string[] = [];

        root.accept({
            enter(n) {
                seen.push(n.id);
                if (n.id === 'account') return Visit.Stop;
            }
        });

        expect(seen).toEqual(['root', 'settings', 'account']);
    });
});

describe('Crumbs and serialization', () => {
    it('toCrumbs() defaults', () => {
        const { root, display } = makeTree();
        const crumbs = display.toCrumbs(); // [{id,text,href?}, ...]
        expect(crumbs.map(c => c.id)).toEqual(['root', 'settings', 'display']);
        // root has no href in our sample config
        expect(crumbs[0]).toMatchObject({ id: 'root', text: 'Home' });
    });

    it('toCrumbs() with a projector', () => {
        const { display } = makeTree();
        const crumbs = display.toCrumbs(n => ({ label: n.text ?? n.id, url: n.href ?? null }));
        expect(crumbs).toEqual([
            { label: 'Home',     url: null },
            { label: 'Settings', url: null },
            { label: 'Display',  url: '/settings/display' }
        ]);
    });

    it('toConfig() round-trip', () => {
        const { root } = makeTree();
        const cfg = root.toConfig();
        const rebuilt = Node.from(cfg);

        expect(rebuilt.findById('display')?.trail().map(n => n.id))
            .toEqual(['root', 'settings', 'display']);
    });
});

describe('Immutability helpers', () => {
    it('with() creates a shallowly updated copy', () => {
        const { root, settings } = makeTree();

        const nextSettings = settings.with({
            text: 'Preferences',
            children: [
                { id: 'profile', text: 'Profile' } // replace children
            ]
        });

        // Original untouched
        expect(settings.text).toBe('Settings');
        expect(settings.children.map(n => n.id)).toEqual(['account', 'display']);

        // New version
        expect(nextSettings.text).toBe('Preferences');
        expect(nextSettings.children.map(n => n.id)).toEqual(['profile']);

        // Parent linkage is preserved on new node instance
        expect(nextSettings.parent).toBe(settings.parent);
        expect(nextSettings.depth()).toBe(settings.depth());
    });
});

describe('Generic meta typing', () => {
    it('stores and exposes typed meta', () => {
        type Meta = { role: 'admin' | 'user'; weight?: number };
        const root = Node.from<Meta>({
            id: 'root',
            meta: { role: 'admin', weight: 1 },
            children: [{ id: 'child', meta: { role: 'user' } }]
        });
        expect(root.meta?.role).toBe('admin');
        const child = root.findById('child')!;
        expect(child.meta?.role).toBe('user');
    });
});
