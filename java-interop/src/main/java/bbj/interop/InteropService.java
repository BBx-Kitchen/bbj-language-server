/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
package bbj.interop;

import java.util.Collections;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.eclipse.lsp4j.jsonrpc.services.JsonRequest;

import bbj.interop.data.ClassInfo;
import bbj.interop.data.ClassInfoParams;
import bbj.interop.data.FieldInfo;
import bbj.interop.data.MethodInfo;
import bbj.interop.data.ParameterInfo;

public class InteropService {

    @JsonRequest
    public CompletableFuture<ClassInfo> getClassInfo(ClassInfoParams params) {
        var classInfo = new ClassInfo();
        classInfo.name = params.className;
        try {
            var clazz = Class.forName(params.className);

            classInfo.fields = Stream.of(clazz.getFields()).map(f -> {
                var fi = new FieldInfo();
                fi.name = f.getName();
                fi.type = getProperTypeName(f.getType());
                return fi;
            }).collect(Collectors.toList());

            classInfo.methods = Stream.of(clazz.getMethods()).map(m -> {
                var mi = new MethodInfo();
                mi.name = m.getName();
                mi.returnType = getProperTypeName(m.getReturnType());
                mi.parameters = Stream.of(m.getParameters()).map(p -> {
                    var pi = new ParameterInfo();
                    pi.name = p.getName();
                    pi.type = getProperTypeName(p.getType());
                    return pi;
                }).collect(Collectors.toList());
                return mi;
            }).collect(Collectors.toList());
        } catch (ClassNotFoundException exc) {
            classInfo.fields = Collections.emptyList();
            classInfo.methods = Collections.emptyList();
            classInfo.error = "Class not found: " + params.className;
        }
        return CompletableFuture.completedFuture(classInfo);
    }

    private String getProperTypeName(Class<?> clazz) {
        if (clazz.isArray()) {
            return clazz.getComponentType().getCanonicalName();
        }
        return clazz.getCanonicalName();
    }
}
