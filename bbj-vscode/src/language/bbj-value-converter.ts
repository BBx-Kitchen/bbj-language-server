/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import {CstNode, DefaultValueConverter, ValueType} from "langium";
import { AbstractRule } from "langium/lib/grammar/generated/ast";

export class BBjValueConverter extends DefaultValueConverter {
    protected override runConverter(rule: AbstractRule, input:string, cstNode: CstNode): ValueType {
        if (rule.name.toUpperCase() === 'BBJFILEPATH') {
            return input.replace('::', '');
        }
        return super.runConverter(rule, input, cstNode)
    }
}