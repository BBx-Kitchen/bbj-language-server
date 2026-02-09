import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'BBj Language Support',
  tagline: 'Language intelligence for BBj development',
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
      title: 'BBj Language Support',
      logo: {
        alt: 'BBj Logo',
        src: 'img/logo.png',
      },
      items: [
        {
          to: '/docs/vscode',
          position: 'left',
          label: 'VS Code Guide',
        },
        {
          to: '/docs/intellij',
          position: 'left',
          label: 'IntelliJ Guide',
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
        {
          href: 'https://plugins.jetbrains.com/plugin/com.basis.bbj',
          label: 'JetBrains Marketplace',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'VS Code Guide',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/vscode/getting-started',
            },
            {
              label: 'Features',
              to: '/docs/vscode/features',
            },
            {
              label: 'Configuration',
              to: '/docs/vscode/configuration',
            },
            {
              label: 'Commands',
              to: '/docs/vscode/commands',
            },
          ],
        },
        {
          title: 'IntelliJ Guide',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/intellij/getting-started',
            },
            {
              label: 'Features',
              to: '/docs/intellij/features',
            },
            {
              label: 'Configuration',
              to: '/docs/intellij/configuration',
            },
            {
              label: 'Commands',
              to: '/docs/intellij/commands',
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
            {
              label: 'JetBrains Marketplace',
              href: 'https://plugins.jetbrains.com/plugin/com.basis.bbj',
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
