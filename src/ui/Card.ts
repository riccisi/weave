import { html } from 'uhtml';
import {
    Container,
    type ContainerState,
    type ContainerProps,
    container,                // factory: (cfg) => new Container(cfg)
} from './Container';
import { Component, type ComponentConfig } from './Component';
import type { Layout } from './layouts/Layout';
import {markup} from "./Markup";
import {flexLayout} from "./layouts/FlexLayout";

/** Stato reattivo della Card. Estende ContainerState (hidden, disabled, ecc.) */
export interface CardState extends ContainerState {
    title: string | null;
    description: string | null;

    imageSrc: string | null;
    imageAlt: string;
    imagePlacement: 'top' | 'side'; // side -> aggiunge "card-side"
    compact: boolean;
    glass: boolean;
    bordered: boolean;
    imageFull: boolean;
}

/** Props "statiche" per Card (non reattive) */
export interface CardProps extends ContainerProps {

    /** Lista di bottoni/azioni da mettere nel footer della card-body */
    actions?: Array<Component | ComponentConfig>;
    actionsLayout?: Layout;

    /** Classi aggiuntive su specifiche sezioni */
    figureClassName?: string;   // wrapper figura (card-image)
    imageClassName?: string;    // <img>
    bodyClassName?: string;     // card-body
    actionsClassName?: string;  // card-actions
    className?: string;         // card wrapper (<div class="card ...">)
}

/**
 * ---- Piccoli componenti foglia per header e media ----
 * Li trattiamo come veri Component, così ereditano state() e props() dalla Card.
 */

class CardImage extends Component<CardState, CardProps> {
    protected hostTag(): string {
        return 'figure';
    }

    protected view() {
        const s = this.state();
        const src = s.imageSrc;

        const p = this.props as CardProps;
        // classi per <figure>
        const figureClasses = [
            'card-image',
            p.figureClassName ?? null
        ].filter(Boolean);

        this.syncHostClasses(new Set(figureClasses));

        // classi per <img>
        const imgCls = [
            p.imageClassName ?? null
        ].filter(Boolean).join(' ');

        return html`
            <img
                src=${src}
                alt=${s.imageAlt ?? ''}
                class=${imgCls}
            />
        `;
    }
}

/**
 * Card
 * È un Container, MA costruisce da sé la sua struttura interna in beforeMount():
 *   [ CardImage? , BodyContainer ]
 *
 * Dove BodyContainer è un Container con class="card-body"
 * che contiene (in ordine):
 *   CardTitle?
 *   CardDescription?
 *   userItems...
 *   ActionsContainer?
 *
 * ActionsContainer è un Container con class="card-actions ...".
 *
 * Così la Card rispetta esattamente il markup FlyonUI,
 * senza dover sovrascrivere la logica core di Container.
 */
export class Card extends Container<CardState, CardProps> {

    /** Stato iniziale della Card (reattivo). */
    protected override initialState(): CardState {
        return {
            ...(super.initialState() as ContainerState),
            title: 'Card title',
            description: null,

            imageSrc: null,
            imageAlt: 'Card image',
            imagePlacement: 'top',  // 'side' => card-side
            compact: false,
            glass: false,
            bordered: false,
            imageFull: false
        } satisfies CardState;
    }

    /**
     * Prima che il Container base monti i figli,
     * costruiamo noi la gerarchia interna da passargli come `props.items`.
     */
    protected override beforeMount(): void {
        const s = this.state();
        const p = this.props as CardProps;

        // ---- 1. Cloniamo gli items utente ----
        const userItems = Array.isArray(p.items) ? [...p.items] : [];

        // ---- 2. Prep header (title/description) come componenti separati ----
        const headerPieces: Array<Component | ComponentConfig> = [];
        if (s.title) {
            headerPieces.push(markup({
                tag: 'h2',
                className: 'card-title',
                render: () => html`${s.title}`
            }));
        }

        if (s.description) {
            headerPieces.push(markup({
                tag: 'p',
                className: 'opacity-70 text-sm',
                render: () => html`${s.description}`
            }));
        }

        // ---- 3. Prep actions container (footer della card-body) ----
        let actionsContainer: Container<CardState, CardProps> | undefined = undefined;
        const actions = Array.isArray(p.actions) ? p.actions : [];
        if (actions.length > 0) {

            const actionLayout = p.actionsLayout ?? undefined;

            actionsContainer = container({
                className: 'card-actions',
                layout: actionLayout,
                items: actions
            });
        }

        // ---- 4. Body container (= card-body) ----
        // ordine nel body:
        //   [CardTitle?, CardDescription?, ...userItems, ActionsContainer?]
        const bodyContentItems: Array<Component | ComponentConfig> = [
            ...headerPieces,
            ...userItems
        ];
        if (actionsContainer) {
            bodyContentItems.push(actionsContainer);
        }

        const bodyContainer = container({
            className: [
                'card-body',
                (p.bodyClassName ?? null)
            ].filter(Boolean).join(' '),
            layout: p.layout,           // "layout del body", NON del wrapper card
            items: bodyContentItems
        });

        // ---- 5. Figura immagine opzionale ----
        let figureComp: CardImage | undefined = undefined;
        if (s.imageSrc) {
            figureComp = new CardImage({
                figureClassName: p.figureClassName,
                imageClassName: p.imageClassName
            });
        }

        // ---- 6. Imposto gli items REALI della Card ----
        // Se c'è l'immagine va prima, poi il body.
        const finalItems: Array<Component | ComponentConfig> = [];
        if (figureComp) finalItems.push(figureComp);
        finalItems.push(bodyContainer);

        // Sovrascriviamo gli items del Container base
        (this.props as any).items = finalItems;

        // La Card "esterna" non deve avere un layout proprio,
        // perché la disposizione (verticale, side...) è data dalle classi flyonUI
        // tipo 'card-side', 'image-full', ecc.
        (this.props as any).layout = undefined;

        // Ora lasciamo che Container.beforeMount() faccia il suo lavoro:
        // - monterà figureComp/bodyContainer in staging ereditando lo state(),
        // - gestirà subscription disabled/hidden, ecc.
        super.beforeMount();
    }

    /** Applica le classi della shell .card al nodo host e poi rende i child effettivi. */
    protected override view() {
        const s = this.state();
        const p = this.props as CardProps;

        const wrapperClasses = [
            'card',
            'bg-base-100',
            'shadow-md',
            s.compact ? 'card-compact' : null,
            s.imagePlacement === 'side' ? 'card-side' : null,
            s.imageFull ? 'image-full' : null,
            s.glass ? 'glass' : null,
            s.bordered ? 'border' : null,
            p.className ?? null
        ].filter(Boolean);

        // sincronia classi sul host (tipo Button.syncHostClasses)
        this.syncHostClasses(new Set(wrapperClasses));

        // il render "vero" dei figli lo facciamo riusando il view() del Container base:
        return super.view();
    }
}

/** Factory ergonomica stile gli altri componenti */
export function card(cfg: ComponentConfig<CardState, CardProps> = {}): Card {
    return new Card(cfg);
}