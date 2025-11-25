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
        icon: {control: 'text'},
        iconPosition: {
            control: {type: 'inline-radio'},
            options: ['left', 'right']
        },
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
        icon: 'icon-[tabler--arrow-up-right] size-4',
        iconPosition: 'right',
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
            icon: 'icon-[tabler--arrow-left] size-4',
            iconPosition: 'left',
            decoration: 'hover'
        });
        const trailing = link({
            text: 'Continue',
            href: '#',
            icon: 'icon-[tabler--arrow-right] size-4',
            iconPosition: 'right',
            decoration: 'hover'
        });
        [leading, trailing].forEach((cmp) => wrap.appendChild(mountComponent(cmp)));
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
