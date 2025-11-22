// stories/Checkbox.stories.ts
import type {Meta, StoryObj} from '@storybook/html';
import {checkbox} from '../inputs/Checkbox';

const COLORS = ['default', 'primary', 'secondary', 'accent', 'info', 'success', 'warning', 'error'] as const;

const meta: Meta = {
    title: 'Form/Checkbox',
    render: (args) => {
        const root = document.createElement('div');
        const cmp = checkbox(args);
        cmp.mount(root);
        return root;
    },
    argTypes: {
        size: {control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl']},
        labelMode: {control: 'select', options: ['none', 'inline', 'floating']},
        labelPlacement: {control: 'inline-radio', options: ['left', 'right']},
        color: {control: 'select', options: COLORS},
        shape: {control: 'select', options: ['square', 'circle']},
        bordered: {control: 'boolean'},
        indeterminate: {control: 'boolean'},
        required: {control: 'boolean'},
        value: {control: 'boolean'}
    }
};

export default meta;

type Story = StoryObj<Record<string, any>>;

export const Playground: Story = {
    args: {
        label: 'Accetta i termini',
        labelMode: 'inline',
        labelPlacement: 'right',
        helperText: 'Puoi modificare questa preferenza in qualsiasi momento',
        value: false,
        color: 'primary'
    }
};

export const LabelPlacements: Story = {
    render: () => {
        const root = document.createElement('div');
        root.className = 'flex flex-col gap-4';

        const right = checkbox({
            label: 'Etichetta a destra',
            labelMode: 'inline',
            labelPlacement: 'right',
            value: true
        });
        right.mount(root);

        const left = checkbox({
            label: 'Etichetta a sinistra',
            labelMode: 'inline',
            labelPlacement: 'left'
        });
        left.mount(root);

        return root;
    }
};

export const Colors: Story = {
    render: () => {
        const root = document.createElement('div');
        root.className = 'flex flex-wrap gap-4';

        for (const color of COLORS) {
            const cmp = checkbox({
                label: `Colore ${color}`,
                labelMode: 'inline',
                color,
                value: color === 'primary'
            });
            cmp.mount(root);
        }

        return root;
    }
};

export const ShapesAndBorders: Story = {
    render: () => {
        const root = document.createElement('div');
        root.className = 'flex flex-col gap-4';

        checkbox({
            label: 'Quadrata (default)',
            labelMode: 'inline',
            value: true
        }).mount(root);

        checkbox({
            label: 'Circolare',
            labelMode: 'inline',
            shape: 'circle'
        }).mount(root);

        checkbox({
            label: 'Con bordo evidenziato',
            labelMode: 'inline',
            bordered: true,
            value: true
        }).mount(root);

        return root;
    }
};

export const StatesAndHelper: Story = {
    render: () => {
        const root = document.createElement('div');
        root.className = 'flex flex-col gap-4';

        checkbox({
            label: 'Con helper text',
            labelMode: 'inline',
            helperText: 'Spiega come verrà utilizzata questa informazione'
        }).mount(root);

        checkbox({
            label: 'Richiesto non selezionato',
            labelMode: 'inline',
            required: true,
            touched: true,
            valid: false,
            invalidMessage: 'Seleziona questa opzione per continuare'
        }).mount(root);

        checkbox({
            label: 'Stato intermedio',
            labelMode: 'inline',
            indeterminate: true
        }).mount(root);

        return root;
    }
};
