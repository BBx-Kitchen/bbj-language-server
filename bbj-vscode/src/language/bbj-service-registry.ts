import { DefaultServiceRegistry, type LangiumCoreServices, type URI } from 'langium';

/**
 * Serves BBj services for files that a USE statement resolved through a PREFIX directory,
 * whatever their extension (#688). BBj programs are often stored with no extension at all
 * (`use ::PGM/UTILS/SomeUtility::SomeUtility`), and Langium's registry only knows `.bbj`,
 * `.bbl` and `.bbjt`, so parsing such a file threw and took the whole server down.
 *
 * Only uris registered through {@link registerUseTarget} get the fallback: Langium's file
 * watcher covers every file in the workspace, so a blanket "no extension means BBj" rule would
 * start parsing `LICENSE`, `Makefile` or `.gitignore` as BBj source.
 */
export class BBjServiceRegistry extends DefaultServiceRegistry {

    private readonly useTargets = new Set<string>();

    /**
     * Marks `uri` as BBj source loaded for a USE statement. A no-op for uris the registry
     * already serves by extension or file name.
     */
    registerUseTarget(uri: URI): void {
        if (!super.hasServices(uri)) {
            this.useTargets.add(uri.toString());
        }
    }

    override getServices(uri: URI): LangiumCoreServices {
        if (this.useTargets.has(uri.toString())) {
            const [services] = this.all;
            if (services) {
                return services;
            }
        }
        return super.getServices(uri);
    }
}
