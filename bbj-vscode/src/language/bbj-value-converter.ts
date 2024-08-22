/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { CstNode, DefaultValueConverter, ValueType } from "langium";
import { AbstractRule } from "langium/lib/grammar/generated/ast";

export class BBjValueConverter extends DefaultValueConverter {

    protected override runConverter(rule: AbstractRule, input: string, cstNode: CstNode): ValueType {
        switch (rule.name.toUpperCase()) {
            case 'BBJFILEPATH': return input.replaceAll('::', '');
            case 'ID': return input.charAt(input.length - 1) === '@' ? input.slice(0, -1) : input;
            case 'STRING': return input.slice(1, -1);
            default: return super.runConverter(rule, input, cstNode)
        }
    }
}