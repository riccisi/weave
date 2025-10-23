// stories/Checkbox.stories.ts
import type { Meta, StoryObj } from '@storybook/html';
import { Checkbox } from '../inputs/Checkbox';

const COLORS = ['default', 'primary', 'secondary', 'accent', 'info', 'success', 'warning', 'error'] as const;

const meta: Meta = {
    title: 'Form/Checkbox',
    render: (args) => {
        const root = document.createElement('div');
        const checkbox = new Checkbox(args);
        checkbox.mount(root);
        return root;
    },
    argTypes: {
        size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
        labelMode: { control: 'select', options: ['none', 'inline', 'floating'] },
        labelPlacement: { control: 'inline-radio', options: ['left', 'right'] },
        color: { control: 'select', options: COLORS },
        shape: { control: 'select', options: ['square', 'circle'] },
        bordered: { control: 'boolean' },
        indeterminate: { control: 'boolean' },
        required: { control: 'boolean' },
        value: { control: 'boolean' },
    },
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
        color: 'primary',
    },
};

export const LabelPlacements: Story = {
    render: () => {
        const root = document.createElement('div');
        root.className = 'flex flex-col gap-4';

        const right = new Checkbox({
            label: 'Etichetta a destra',
            labelMode: 'inline',
            labelPlacement: 'right',
            value: true,
        });
        right.mount(root);

        const left = new Checkbox({
            label: 'Etichetta a sinistra',
            labelMode: 'inline',
            labelPlacement: 'left',
        });
        left.mount(root);

        return root;
    },
};

export const Colors: Story = {
    render: () => {
        const root = document.createElement('div');
        root.className = 'flex flex-wrap gap-4';

        for (const color of COLORS) {
            const checkbox = new Checkbox({
                label: `Colore ${color}`,
                labelMode: 'inline',
                color,
                value: color === 'primary',
            });
            checkbox.mount(root);
        }

        return root;
    },
};

export const ShapesAndBorders: Story = {
    render: () => {
        const root = document.createElement('div');
        root.className = 'flex flex-col gap-4';

        const square = new Checkbox({
            label: 'Quadrata (default)',
            labelMode: 'inline',
            value: true,
        });
        square.mount(root);

        const circle = new Checkbox({
            label: 'Circolare',
            labelMode: 'inline',
            shape: 'circle',
        });
        circle.mount(root);

        const bordered = new Checkbox({
            label: 'Con bordo evidenziato',
            labelMode: 'inline',
            bordered: true,
            value: true,
        });
        bordered.mount(root);

        return root;
    },
};

export const StatesAndHelper: Story = {
    render: () => {
        const root = document.createElement('div');
        root.className = 'flex flex-col gap-4';

        const helper = new Checkbox({
            label: 'Con helper text',
            labelMode: 'inline',
            helperText: 'Spiega come verrà utilizzata questa informazione',
        });
        helper.mount(root);

        const required = new Checkbox({
            label: 'Richiesto non selezionato',
            labelMode: 'inline',
            required: true,
            touched: true,
            valid: false,
            invalidMessage: 'Seleziona questa opzione per continuare',
        });
        required.mount(root);

        const indeterminate = new Checkbox({
            label: 'Stato intermedio',
            labelMode: 'inline',
            indeterminate: true,
        });
        indeterminate.mount(root);

        return root;
    },
};
