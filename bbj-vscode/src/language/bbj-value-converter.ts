/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { CstNode, DefaultValueConverter, GrammarAST, ValueType } from "langium";

export class BBjValueConverter extends DefaultValueConverter {

    protected override runConverter(rule: GrammarAST.AbstractRule, input: string, cstNode: CstNode): ValueType {
        switch (rule.name.toUpperCase()) {
            case 'BBJFILEPATH': return input.replaceAll('::', '');
            case 'ID': return input.charAt(input.length - 1) === '@' ? input.slice(0, -1) : input;
            case 'STRING_LITERAL': return input.slice(1, -1);
            default: return super.runConverter(rule, input, cstNode)
        }
    }
}