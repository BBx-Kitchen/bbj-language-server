// This class extends DefaultDocumentValidator

import { AstNode, DefaultDocumentValidator, DiagnosticData, DiagnosticInfo, DocumentValidator, getDiagnosticRange, toDiagnosticSeverity } from "langium";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver";

export class BBjDocumentValidator extends DefaultDocumentValidator {


    protected override toDiagnostic<N extends AstNode>(severity: 'error' | 'warning' | 'info' | 'hint', message: string, info: DiagnosticInfo<N, string>): Diagnostic {
        // Turn linking errors to warnings
        return {
            message,
            range: getDiagnosticRange(info),
            severity: (info.data as DiagnosticData)?.code === DocumentValidator.LinkingError ? DiagnosticSeverity.Warning : toDiagnosticSeverity(severity),
            code: info.code,
            codeDescription: info.codeDescription,
            tags: info.tags,
            relatedInformation: info.relatedInformation,
            data: info.data,
            source: this.getSource()
        };
    }

}