import type {Meta, StoryObj} from '@storybook/html';
import {link} from '../Link';
import {mountComponent} from '../testing/mount';

function renderLink(args: Record<string, any>) {
    const cmp = link({...args});
    return mountComponent(cmp);
}

const meta = {
    title: 'Weave/Link',
    render: (args) => renderLink(args),
    argTypes: {
        text: {control: 'text'},
        href: {control: 'text'},
        disabled: {control: 'boolean'},
        decoration: {
            control: {type: 'select'},
            options: ['always', 'hover', 'animated']
        },
        color: {
            control: {type: 'select'},
            options: ['default', 'primary', 'secondary', 'accent', 'neutral', 'info', 'success', 'warning', 'error']
        },
        iconLeft: {control: 'text'},
        iconRight: {control: 'text'},
        target: {control: 'text'},
        rel: {control: 'text'},
        download: {control: 'text'},
        className: {control: 'text'},
        ariaLabel: {control: 'text'},
        onClick: {action: 'clicked'}
    },
    args: {
        text: 'Visit FlyonUI',
        href: 'https://flyonui.com',
        disabled: false,
        decoration: 'always',
        color: 'primary',
        iconLeft: null,
        iconRight: 'icon-[tabler--arrow-up-right] size-4',
        target: '_blank',
        rel: 'noopener noreferrer'
    }
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Colors: Story = {
    render: () => {
        const wrap = document.createElement('div');
        wrap.className = 'flex flex-wrap gap-4';
        (['default', 'primary', 'secondary', 'accent', 'neutral', 'info', 'success', 'warning', 'error'] as const).forEach((color) => {
            const cmp = link({text: color, color, href: '#', decoration: 'hover'});
            wrap.appendChild(mountComponent(cmp));
        });
        return wrap;
    }
};

export const Decorations: Story = {
    render: () => {
        const wrap = document.createElement('div');
        wrap.className = 'flex flex-col gap-3';
        const always = link({text: 'Always underlined', decoration: 'always', href: '#'});
        const hover = link({text: 'Underline on hover', decoration: 'hover', href: '#'});
        const animated = link({text: 'Animated underline', decoration: 'animated', href: '#'});
        [always, hover, animated].forEach((cmp) => wrap.appendChild(mountComponent(cmp)));
        return wrap;
    }
};

export const WithIcons: Story = {
    render: () => {
        const wrap = document.createElement('div');
        wrap.className = 'flex flex-wrap items-center gap-4';
        const leading = link({
            text: 'Back',
            href: '#',
            iconLeft: 'icon-[tabler--arrow-left] size-4',
            decoration: 'hover'
        });
        const trailing = link({
            text: 'Continue',
            href: '#',
            iconRight: 'icon-[tabler--arrow-right] size-4',
            decoration: 'hover'
        });
        const both = link({
            text: 'Docs',
            href: 'https://flyonui.com/docs',
            iconLeft: 'icon-[tabler--book] size-4',
            iconRight: 'icon-[tabler--arrow-up-right] size-4',
            decoration: 'animated'
        });
        [leading, trailing, both].forEach((cmp) => wrap.appendChild(mountComponent(cmp)));
        return wrap;
    }
};

export const Disabled: Story = {
    render: () => {
        const wrap = document.createElement('div');
        wrap.className = 'flex flex-col gap-3';
        const disabledLink = link({text: 'Disabled link', href: '#', disabled: true});
        const inertLink = link({
            text: 'Disabled + inert',
            href: '#',
            disabled: true,
            disabledInert: true
        });
        [disabledLink, inertLink].forEach((cmp) => wrap.appendChild(mountComponent(cmp)));
        return wrap;
    }
};
