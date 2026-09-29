/**
 * Class reference and visibility checks: resolves a QualifiedClass type reference and, once
 * resolved, enforces PUBLIC/PROTECTED/PRIVATE visibility across directories and files. Also
 * emits the unresolvable-type warning (#438) when a reference fails to resolve and it is safe
 * to conclude the name is genuinely invalid rather than "interop is down".
 */
import { AstNode, AstUtils, DiagnosticInfo, ValidationAcceptor } from 'langium';
import { basename, dirname, isAbsolute, relative } from 'path';
import { JavaInteropService } from '../java-interop.js';
import { isTypeResolutionWarningsEnabled } from '../bbj-validator.js';
import { getClass, getFQNFullname } from '../bbj-nodedescription-provider.js';
import { BbjClass, isBbjClass, QualifiedClass } from '../generated/ast.js';
import { KNOWN_BBJ_SCALAR_TYPES } from './class-types.js';

function isSubFolderOf(folder: string, parentFolder: string) {
    if(parentFolder === folder) {
        return true;
    }
    const relativePath = relative(parentFolder, folder);
    return relativePath && !relativePath.startsWith('..') && !isAbsolute(relativePath);
}

export function checkClassReference<N extends AstNode>(accept: ValidationAcceptor, qclass: QualifiedClass|undefined, info: DiagnosticInfo<N>, javaInterop: JavaInteropService | undefined): void {
    if(!qclass) {
        return;
    }
    const klass = getClass(qclass);
    if(!klass) {
        // The type reference resolved to nothing. Flag it as unresolvable (#438), but only when
        // it is safe to conclude the name is genuinely invalid rather than "interop is down".
        warnUnresolvableType(accept, qclass, info, javaInterop);
        return;
    }
    const uriOfUsage = AstUtils.getDocument(qclass).uri.fsPath;
    if(isBbjClass(klass) && klass.visibility) {
        const uriOfDeclaration = AstUtils.getDocument(klass).uri.fsPath;
        return checkBBjClass<N>(klass, uriOfDeclaration, uriOfUsage, accept, info);
    }
}

/**
 * Emits a warning that a {@link QualifiedClass} type reference cannot be resolved (#438), gated
 * so it never floods environments where java-interop is unavailable:
 *  - only when the `typeResolutionWarnings` flag is enabled, and
 *  - only when the java-interop classpath is actually available (at least one class resolved) —
 *    otherwise an unresolved reference just means the interop service is down, not that the
 *    type is invalid; and
 *  - never for the built-in BBj scalar types (see {@link KNOWN_BBJ_SCALAR_TYPES}).
 */
function warnUnresolvableType<N extends AstNode>(accept: ValidationAcceptor, qclass: QualifiedClass, info: DiagnosticInfo<N>, javaInterop: JavaInteropService | undefined): void {
    if(!isTypeResolutionWarningsEnabled()) {
        return;
    }
    if(!javaInterop?.isClasspathAvailable()) {
        return;
    }
    const name = getFQNFullname(qclass);
    if(!name) {
        return;
    }
    const simpleName = name.substring(name.lastIndexOf('.') + 1).toLowerCase();
    if(KNOWN_BBJ_SCALAR_TYPES.has(simpleName)) {
        return;
    }
    accept('warning', `Type '${name}' cannot be resolved.`, info);
}

export function checkBBjClass<N extends AstNode>(klass: BbjClass, uriOfDeclaration: string, uriOfUsage: string, accept: ValidationAcceptor, info: DiagnosticInfo<N>) {
    const typeName = klass.interface ? 'interface' : 'class';

    if(!klass.visibility) {
        accept("warning", `Visibility of ${typeName} '${klass.name}' is not declared and might not be accessible here.`, info);
        return;
    }

    // Get source location info for the declaration
    const filename = basename(uriOfDeclaration);
    const lineNumber = klass.$cstNode?.range.start.line;
    const lineInfo = lineNumber !== undefined ? `:${lineNumber + 1}` : '';
    const sourceInfo = `${filename}${lineInfo}`;

    switch (klass.visibility.toUpperCase()) {
        case "PUBLIC":
            //everything is allowed
            return;
        case "PROTECTED":
            const dirOfDeclaration = dirname(uriOfDeclaration);
            const dirOfUsage = dirname(uriOfUsage);
            if (!isSubFolderOf(dirOfUsage, dirOfDeclaration)) {
                accept("error", `Protected ${typeName} '${klass.name}' (declared in ${sourceInfo}) is not visible from this directory.`, info);
            }
            break;
        case "PRIVATE":
            if (uriOfUsage !== uriOfDeclaration) {
                accept("error", `Private ${typeName} '${klass.name}' (declared in ${sourceInfo}) is not visible from this file.`, info);
            }
            break;
    }
}
