/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
package bbj.interop.data;

import java.util.List;

public class ClassInfo extends WithError {

    public String name;

    public String packageName;
    
    public String simpleName;

    public List<FieldInfo> fields;

    public List<MethodInfo> methods;
    
}
