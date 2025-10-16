import {Window} from '@ui/window';
import {TextField} from '@ui/text-field';
import {Checkbox} from '@ui/checkbox';
import {Button} from '@ui/button';
import {ForEach} from '@ui/for-each';
import {Model} from '@core/model';
import {FieldState} from "@form/field-state";
import {minLen, required, validate} from "@validation/validate";
import {combine2} from "@core/refx";
import "flyonui/flyonui";
import './tw-safelist';
import {Container} from "@ui/container";

const user = new Model({
    name: 'Simone',
    surname: 'Ricciardi',
    role: {name: 'Admin', permissions: ['read', 'write', 'update']},
    address: [
        {id: 1, street: 'Via degli Olivi, 6', country: 'Italy'},
        {id: 2, street: 'Via dei Pini, 3', country: 'Italy'}
    ],
    get fullName() {
        return `${this.name} ${this.surname}`
    },
    get canWrite() {
        return this.role.permissions.includes('write');
    }
});

let i = 3;

// Stato campo + validazione
const nameState = new FieldState();
const nameVal = validate(user.ref('name'), required(), minLen(2));

new Window({
    model: user,
    title: 'User Editor',
    items: [
        new TextField({
            label: 'Nome',
            value: '${name}',
            state: nameState,
            error: nameVal.errors  // Ref<string[]>
        }),
        new TextField({label: 'Cognome', value: '${surname}'}),
        new TextField({label: 'Nome completo', value: '${fullName}'}),

        new Button({text: 'Add address', onClick: () => user.list('address').push({id: i++, street: '', country: ''})}),

        new Window({
            layout: {type: 'hbox', gap: 3, align: 'stretch'},
            items: [
                new TextField({label: 'Nome', value: '${name}'}), {
                    item: new TextField({label: 'Note', value: ''}),
                    layout: {flex: 1, basis: '0'}
                }, // si espande
                new Button({text: 'Salva' })
            ]
        }),

        new Window({
            layout: { type: 'hbox', gap: 2, align: 'center' },
            items: [
                { item: new Button({ text: 'Secondo' }), layout: { order: 2 } },
                { item: new Button({ text: 'Primo' }),   layout: { order: 1 } },
                { item: new TextField({ label: 'Filtro' }), layout: { basis: '16rem' } }
            ]
        }),

        new Window({
            layout: { type: 'grid', cols: 3, gap: 3 },
            items: [
                { item: new TextField({ label: 'A' }), layout: { colSpan: 2 } },
                new TextField({ label: 'B' }),
                { item: new TextField({ label: 'C' }), layout: { rowSpan: 2 } },
                new TextField({ label: 'D' }),
                new TextField({ label: 'E' })
            ]
        }),

        new Window({
            layout: { type: 'dock', northHeight: '3rem', westWidth: '16rem', gap: 3 },
            items: [
                { item: new Container({
                        layout: { type: 'hbox', gap: 2, align: 'end' },
                        items: [ new Button({ text: 'New' }), new Button({ text: 'Save' }) ]
                    }),
                    layout: { area: 'south' }
                },
                { item: new Container({
                        layout: { type: 'vbox', gap: 2 },
                        items: [ new TextField({ label: 'Filtro', value: '' }), new Button({ text: 'Applica' }) ]
                    }),
                    layout: { area: 'west' }
                },
                { item: new Container({
                        layout: { type: 'grid', cols: 2, gap: 3 },
                        items: [ new TextField({ label: 'Nome', value: '${name}' }), new TextField({ label: 'Cognome', value: '${surname}' }) ]
                    }),
                    layout: { area: 'center' }
                }
            ]
        }),

        new ForEach({
            of: user.list('address'),
            trackBy: 'id',
            /*onBeforeRemove: ({ el }) => {
                el.style.transition = 'opacity 180ms ease';
                el.style.opacity = '0';
                return new Promise<void>(res => setTimeout(res, 200));
            },
            onAfterInsert: ({ el }) => {
                el.style.opacity = '0';
                el.style.transition = 'opacity 180ms ease';
                requestAnimationFrame(() => { el.style.opacity = '1'; });
            },*/
            render: (addr: any, i: number) => new Window({
                model: addr,
                layout: {type: 'hbox', gap: 2, align: 'end'},
                items: [
                    new TextField({label: `Street #${i + 1}`, value: '${street}'}),
                    new TextField({label: `Country #${i + 1}`, value: '${country}'}),
                    new Button({text: 'Remove', onClick: () => user.list('address').remove(addr)})
                ]
            })
        }),

        new Checkbox({label: 'Can write?', checked: user.ref('canWrite').map(v => !!v)}),

        // Submit disabilitato se invalid o pending
        new Button({
            text: 'Submit',
            disabled: combine2(nameVal.valid, nameVal.pending, (valid, pending) => !valid || pending),
            onClick: () => console.log('SUBMIT', user.values())
        }),

        new Button({text: 'Log', onClick: () => console.log(user.values())})
    ]
}).show(document.getElementById('app')!);
