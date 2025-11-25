import {html} from 'uhtml';
import {InteractiveComponent, InteractiveComponentState} from './InteractiveComponent';
import type {ComponentConfig, ComponentProps} from './Component';
import type {MenuNode} from './navigation/types';
import { mergeSchemas } from './schemaUtils';

export interface MenuState extends InteractiveComponentState {
    root: MenuNode | null;
    selection: MenuNode | null;     // bound: "{selectedMenu}"
    expandedIds: Set<string>;       // gestione semplice espansione
    size?: 'sm' | 'md' | 'lg';
    orientation?: 'vertical' | 'horizontal';
}

export interface MenuProps extends ComponentProps {
    onSelect?: (node: MenuNode, ev: MouseEvent) => void;
}

export class Menu extends InteractiveComponent<MenuState, MenuProps> {
    static wtype = 'menu';

    protected override schema(): Record<string, any> {
        return mergeSchemas(super.schema(), {
            properties: {
                root: { default: null },
                selection: { default: null },
                size: { type: 'string', default: 'md' },
                orientation: { type: 'string', default: 'vertical' }
            }
        });
    }

    protected override initialStateOverrides(): Partial<MenuState> {
        return {
            expandedIds: new Set<string>()
        };
    }

    protected override hostTag(): string {
        return 'ul';
    }

    protected override beforeMount(): void {
        const host = this.el();
        host.classList.add('menu'); // base Flyon
        this.applyMenuClasses();
    }

    protected override requestRender(): void {
        super.requestRender();
        queueMicrotask(() => this.applyMenuClasses());
    }

    private applyMenuClasses(): void {
        const s = this.state();
        const host = this.el();
        // reset class gestite
        host.classList.remove('menu-horizontal', 'menu-vertical', 'menu-sm', 'menu-md', 'menu-lg');
        host.classList.add(s.orientation === 'horizontal' ? 'menu-horizontal' : 'menu-vertical');
        host.classList.add(`menu-${s.size ?? 'md'}`);
    }

    protected override view() {
        const s = this.state();
        const root = s.root;
        if (!root) return html``;
        return this.renderLevel(root.children ?? []);
    }

    private renderLevel(nodes: MenuNode[]) {
        return html`${nodes.filter(n => !n.hidden).map(node => this.renderNode(node))}`;
    }

    private renderNode(node: MenuNode) {
        const s = this.state();
        const isExpanded = s.expandedIds.has(node.id);
        const isSelected = s.selection?.id && node.id === s.selection.id;

        const hasChildren = !!(node.children && node.children.length);
        const liClasses = ['w-auto'];

        return html`
            <li class=${liClasses.join(' ')} aria-current=${isSelected ? 'page' : undefined}>
                ${this.renderNodeLabel(node, hasChildren, isExpanded, isSelected)}
                ${hasChildren && isExpanded ? html`
                    <ul>${this.renderLevel(node.children!)}</ul>` : null}
            </li>
        `;
    }

    private renderNodeLabel(node: MenuNode, hasChildren: boolean, isExpanded: boolean, isSelected: boolean) {
        const s = this.state();
        const icon = node.icon ? html`<span class=${node.icon}></span>` : null;

        const onclick = (ev: MouseEvent) => {
            if (node.disabled) return;
            if (hasChildren) {
                const set = new Set(s.expandedIds);
                if (set.has(node.id)) set.delete(node.id); else set.add(node.id);
                s.expandedIds = set;
            } else {
                s.selection = node;
                (this.props.onSelect as any)?.(node, ev);
            }
        };

        // Se c’è href e non ha figli, usare un <a> “semantico”
        if (!hasChildren && node.href) {
            return html`
                <a class=${isSelected ? 'active' : ''} href=${node.href} onclick=${onclick}>
                    ${icon} ${node.text}
                </a>
            `;
        }
        // altrimenti un bottone di toggle/selezione
        return html`
            <button class=${isSelected ? 'active' : ''} onclick=${onclick} disabled=${node.disabled ? true : undefined}>
                ${icon} ${node.text}
                ${hasChildren ? html`<span
                        class="ms-auto icon-[tabler--chevron-${isExpanded ? 'down' : 'right'}]"></span>` : null}
            </button>
        `;
    }
}

// Factory
export function menu(cfg: ComponentConfig<MenuState, MenuProps> = {}): Menu {
    return new Menu(cfg);
}
