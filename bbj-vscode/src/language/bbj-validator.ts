import { ValidationAcceptor, ValidationChecks } from 'langium';
import { BBjAstType, Use } from './generated/ast';
import type { BBjServices } from './bbj-module';
import { JavaInteropService } from './java-interop';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: BBjServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.BBjValidator;
    const checks: ValidationChecks<BBjAstType> = {
        Use: validator.checkUsedClassExists
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class BBjValidator {

    protected readonly javaInterop: JavaInteropService;

    constructor(services: BBjServices) {
        this.javaInterop = services.java.JavaInteropService;
    }

    checkUsedClassExists(use: Use, accept: ValidationAcceptor): void {
        const resolvedClass = this.javaInterop.getResolvedClass(use.className);
        if (!resolvedClass || resolvedClass.error) {
            accept('error', `Class ${use.className} is not in the class path.`, { node: use });
        }
    }

}
