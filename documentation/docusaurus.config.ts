import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'BBj Language Server',
  tagline: 'VS Code extension and language server for BBj development',
  favicon: 'img/favicon.png',

  future: {
    v4: true,
  },

  // GitHub Pages deployment
  url: 'https://BBx-Kitchen.github.io',
  baseUrl: '/bbj-language-server/',

  organizationName: 'BBx-Kitchen',
  projectName: 'bbj-language-server',
  trailingSlash: false,

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/BBx-Kitchen/bbj-language-server/tree/main/documentation/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // image: 'img/social-card.png', // Add a social card image if desired
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'BBj Language Server',
      logo: {
        alt: 'BBj Logo',
        src: 'img/logo.png',
      },
      items: [
        {
          to: '/docs/user-guide',
          position: 'left',
          label: 'User Guide',
        },
        {
          to: '/docs/developer-guide',
          position: 'left',
          label: 'Developer Guide',
        },
        {
          href: 'https://github.com/BBx-Kitchen/bbj-language-server',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://marketplace.visualstudio.com/items?itemName=basis-intl.bbj-lang',
          label: 'VS Code Marketplace',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'User Guide',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/user-guide/getting-started',
            },
            {
              label: 'Features',
              to: '/docs/user-guide/features',
            },
            {
              label: 'Configuration',
              to: '/docs/user-guide/configuration',
            },
            {
              label: 'Commands',
              to: '/docs/user-guide/commands',
            },
          ],
        },
        {
          title: 'Developer Guide',
          items: [
            {
              label: 'Architecture',
              to: '/docs/developer-guide/architecture/overview',
            },
            {
              label: 'Building',
              to: '/docs/developer-guide/building',
            },
            {
              label: 'Contributing',
              to: '/docs/developer-guide/contributing',
            },
          ],
        },
        {
          title: 'Resources',
          items: [
            {
              label: 'BBj Documentation',
              href: 'https://documentation.basis.cloud/BASISHelp/WebHelp/bbjoverview/bbjoverview.htm',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/BBx-Kitchen/bbj-language-server',
            },
            {
              label: 'VS Code Marketplace',
              href: 'https://marketplace.visualstudio.com/items?itemName=basis-intl.bbj-lang',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} BASIS International Ltd. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['java', 'json', 'bash'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
