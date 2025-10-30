import type { Meta, StoryObj } from '@storybook/html';
import { navbar } from '../Navbar';
import { markup } from '../Markup';
import { textfield } from '../inputs/TextField';
import { button } from '../Button';
import { mountComponent } from '../testing/mount';

const meta = {
  title: 'Weave/Navbar',
  render: () => {
    const nav = navbar();
    return mountComponent(nav);
  }
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function defaultNavbar() {
  const brand = markup({
    className: 'text-xl font-semibold',
    render: () => 'Weave'
  });
  const search = textfield({
    placeholder: 'Search docs…',
    className: 'w-full max-w-xs',
    size: 'sm'
  });
  const actions = [
    button({ text: 'Sign in', variant: 'text' }),
    button({ text: 'Get Started', color: 'primary' })
  ];

  const nav = navbar({
    shadow: true,
    left: [brand],
    center: [search],
    right: actions
  });
  return mountComponent(nav);
}

export const Default: Story = {
  render: () => defaultNavbar()
};

export const DenseSticky: Story = {
  render: () => {
    const wrap = document.createElement('div');
    wrap.className = 'h-80 overflow-y-auto border border-base-300 rounded-box bg-base-200';

    const nav = navbar({
      dense: true,
      sticky: true,
      shadow: true,
      left: [
        button({
          text: 'Menu',
          variant: 'text',
          iconLeft: 'icon-[tabler--menu-2] size-4.5'
        }),
        markup({ className: 'font-semibold', render: () => 'Sticky Navbar' })
      ],
      center: [],
      right: [button({ text: 'Profile', shape: 'circle', iconLeft: 'icon-[tabler--user] size-4.5' })]
    });

    const content = document.createElement('div');
    content.className = 'p-6 space-y-4 text-sm text-base-content/70';
    for (let i = 0; i < 12; i++) {
      const p = document.createElement('p');
      p.textContent =
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras sodales orci vel leo sollicitudin, non gravida neque euismod.';
      content.appendChild(p);
    }

    wrap.appendChild(mountComponent(nav));
    wrap.appendChild(content);
    return wrap;
  }
};

export const Transparent: Story = {
  render: () => {
    const wrap = document.createElement('div');
    wrap.className = 'relative overflow-hidden rounded-box';

    const hero = document.createElement('div');
    hero.className = 'h-80 bg-gradient-to-br from-primary to-secondary text-base-100 flex flex-col';

    const nav = navbar({
      transparent: true,
      shadow: false,
      left: [markup({ className: 'text-lg font-semibold', render: () => 'Overlay Nav' })],
      right: [button({ text: 'Login', variant: 'outline', color: 'default' })]
    });

    const body = document.createElement('div');
    body.className = 'flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center';
    const title = document.createElement('h2');
    title.className = 'text-3xl font-bold';
    title.textContent = 'Hero Section';
    const subtitle = document.createElement('p');
    subtitle.className = 'max-w-md opacity-80';
    subtitle.textContent =
      'The navbar floats over this gradient hero, using the transparent mode to blend with the background.';
    body.appendChild(title);
    body.appendChild(subtitle);

    hero.appendChild(mountComponent(nav));
    hero.appendChild(body);
    wrap.appendChild(hero);
    return wrap;
  }
};
