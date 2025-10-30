import type { Meta, StoryObj } from '@storybook/html';

import { container } from '../Container';
import { flexLayout } from '../layouts/FlexLayout';
import { rawHtml } from '../RawHtml';

const meta: Meta = {
    title: 'Primitives/RawHtml'
};
export default meta;

type Story = StoryObj;

/** Helper: crea un root e monta il componente, restituendo l’elemento per SB. */
function mountToRoot(comp: { mount: (el: HTMLElement) => any }) {
    const root = document.createElement('div');
    comp.mount(root);
    return root;
}

export const BasicStatic: Story = {
    name: 'Basic static HTML',
    render: () => {
        const c = container({
            layout: flexLayout({ direction: 'column', gap: '0.75rem' }),
            items: [
                rawHtml({
                    html: `
            <h5 class="text-base-content text-lg">List decimal</h5>
            <ol class="list-inside list-decimal">
              <li class="mb-2">Start by signing up for our newsletter.</li>
              <li class="mb-2">Explore our collection of articles and tutorials.</li>
              <li class="mb-2">Join our community forums to connect with like-minded individuals.</li>
            </ol>
          `,
                    asContents: true
                })
            ]
        });
        return mountToRoot(c);
    }
};

export const WithWrapper: Story = {
    name: 'With wrapper (asContents=false)',
    render: () => {
        const c = container({
            layout: flexLayout({ direction: 'column', gap: '0.5rem' }),
            items: [
                rawHtml({
                    html: `<p class="opacity-70">This block keeps its own wrapper.</p>`,
                    asContents: false,
                    className: 'p-3 rounded-md bg-base-200'
                })
            ]
        });
        return mountToRoot(c);
    }
};

export const SanitizedDangerousHtml: Story = {
    name: 'Sanitized (DOMPurify)',
    render: () => {
        // Eventi/JS inline verranno rimossi da DOMPurify
        const dangerous = `
      <p>Attempting inline event…</p>
      <img src="x" onerror="alert('XSS!')" />
      <a href="javascript:alert('XSS')">bad link</a>
      <script>console.log('should be stripped');</script>
    `;
        const c = container({
            layout: flexLayout({ direction: 'column', gap: '0.5rem' }),
            items: [
                rawHtml({
                    html: dangerous,
                    sanitize: true,
                    asContents: true,
                    className: 'prose max-w-none'
                })
            ]
        });
        return mountToRoot(c);
    }
};

export const CustomSanitizeFn: Story = {
    name: 'Custom sanitize function',
    render: () => {
        const html = `<p><strong>Allowed</strong> but will strip all attributes.</p>
                  <img src="ok.png" class="will-be-removed" />`;
        const custom = (raw: string) => {
            // esempio minimalista: rimuove tutti gli attributi (non per produzione!)
            return raw.replace(/\s+[a-zA-Z:-]+="[^"]*"/g, '');
        };
        const c = container({
            layout: flexLayout({ direction: 'column', gap: '0.5rem' }),
            items: [
                rawHtml({
                    html,
                    sanitize: custom,
                    asContents: true
                })
            ]
        });
        return mountToRoot(c);
    }
};

export const HostOverride: Story = {
    name: 'Host tag override',
    render: () => {
        const c = container({
            layout: flexLayout({ direction: 'column', gap: '0.5rem' }),
            items: [
                rawHtml({
                    host: 'section',
                    asContents: false,
                    className: 'p-4 border rounded-lg',
                    html: `<h3 class="text-lg font-semibold">Section title</h3>
                 <p class="opacity-70">Rendered inside &lt;section&gt; instead of &lt;div&gt;.</p>`
                })
            ]
        });
        return mountToRoot(c);
    }
};
