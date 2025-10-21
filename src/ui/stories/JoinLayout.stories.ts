import type { Meta, StoryObj } from '@storybook/html';
import { mountComponent } from '../testing/mount';
import { Container } from '../Container';
import { Button } from '../Button';
import '../layouts/JoinLayout'; // importa per auto-register

const meta = {
    title: 'Weave/Layouts/Join',
    render: (args) => {
        const items = [
            new Button({ text: 'Left', color: 'primary' }),
            new Button({ text: 'Middle', color: 'primary', variant: 'outline' }),
            new Button({ text: 'Right', color: 'primary' }),
        ];
        const c = new Container({
            ...args,
            layout: { type: 'join', orientation: args.orientation, className: args.className },
            items
        });
        return mountComponent(c);
    },
    argTypes: {
        orientation: { control: 'select', options: ['horizontal', 'vertical'] },
        className: { control: 'text' },
    },
    args: {
        orientation: 'horizontal',
        className: 'rounded-md',
    },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const AsLayout: Story = {};

export const DeepTargetDemo: Story = {
    render: () => {
        // Dimostrazione: se in futuro un componente espone joinTarget(), il layout può usarlo
        const a = new Button({ text: 'A' });
        const b = new Button({ text: 'B', variant: 'outline' });
        const c = new Button({ text: 'C' });
        const container = new Container({
            layout: { type: 'join', orientation: 'horizontal', deepTarget: true, className: 'rounded-lg' },
            items: [a, b, c]
        });
        return mountComponent(container);
    },
};
