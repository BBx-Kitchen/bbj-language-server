/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
package bbj.interop.data;

import java.util.List;

public class MethodInfo extends WithError {

    public String name;

    public String returnType;
    public String declaringClass;

    public List<ParameterInfo> parameters;

    public boolean isStatic;
    public boolean isDeprecated;

}
