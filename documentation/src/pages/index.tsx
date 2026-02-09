import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/vscode/getting-started">
            Get Started
          </Link>
          <Link
            className="button button--secondary button--lg"
            href="https://marketplace.visualstudio.com/items?itemName=basis-intl.bbj-lang">
            VS Code Marketplace
          </Link>
          <Link
            className="button button--secondary button--lg"
            href="https://plugins.jetbrains.com/plugin/com.basis.bbj">
            JetBrains Marketplace
          </Link>
        </div>
      </div>
    </header>
  );
}

type FeatureItem = {
  title: string;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Intelligent Code Completion',
    description: (
      <>
        Get context-aware suggestions for BBj keywords, built-in functions,
        and Java classes in VS Code or IntelliJ. The language server provides rich completions with
        documentation and parameter hints.
      </>
    ),
  },
  {
    title: 'Real-time Validation',
    description: (
      <>
        Catch errors as you type with instant syntax and semantic validation.
        Highlights issues in VS Code or IntelliJ and provides helpful diagnostics to
        improve code quality.
      </>
    ),
  },
  {
    title: 'Java Integration',
    description: (
      <>
        Seamlessly work with Java classes through the integrated Java interop
        service. Get completions, hover documentation, and navigation for
        Java methods and fields.
      </>
    ),
  },
  {
    title: 'Developer Commands',
    description: (
      <>
        Run BBj programs directly from VS Code or IntelliJ as GUI, BUI, or DWC applications.
        Refresh Java classes and manage your BBj projects with built-in commands.
      </>
    ),
  },
  {
    title: 'Code Navigation',
    description: (
      <>
        Navigate your codebase efficiently with Go to Definition, Find References,
        and Document Symbols. The language server understands BBj class hierarchies
        and cross-file references.
      </>
    ),
  },
  {
    title: 'Syntax Highlighting',
    description: (
      <>
        Enjoy rich syntax highlighting for BBj code with semantic tokens in VS Code or IntelliJ.
        Provides accurate highlighting for keywords, strings,
        comments, and more.
      </>
    ),
  },
];

function Feature({title, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md padding-vert--lg">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="Language intelligence for BBj development">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
