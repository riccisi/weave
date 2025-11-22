/**
 * Storybook showcase for the FlyonUI join layout helper.
 */
import type {Meta, StoryObj} from '@storybook/html';
import {mountComponent} from '../testing/mount';
import {container} from '../Container';
import {button} from '../Button';
import {joinLayout} from '../layouts/JoinLayout';

const meta = {
    title: 'Layout/Join',
    render: (args) => {
        const items = [
            button({text: 'Left', color: 'primary'}),
            button({text: 'Middle', color: 'primary', variant: 'outline'}),
            button({text: 'Right', color: 'primary'})
        ];
        const c = container({
            ...args,
            layout: joinLayout({
                orientation: args.orientation,
                rounded: args.rounded,
                shadow: args.shadow
            }),
            items
        });
        return mountComponent(c);
    },
    argTypes: {
        orientation: {control: 'select', options: ['horizontal', 'vertical']},
        rounded: {control: 'text'},
        shadow: {control: 'boolean'}
    },
    args: {
        orientation: 'horizontal',
        rounded: 'rounded-md',
        shadow: false
    }
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const AsLayout: Story = {};

export const ShadowedStack: Story = {
    render: () => {
        const a = button({text: 'A'});
        const b = button({text: 'B', variant: 'outline'});
        const c = button({text: 'C'});
        const joinContainer = container({
            layout: joinLayout({orientation: 'vertical', rounded: 'rounded-lg', shadow: true}),
            items: [a, b, c]
        });
        return mountComponent(joinContainer);
    }
};
