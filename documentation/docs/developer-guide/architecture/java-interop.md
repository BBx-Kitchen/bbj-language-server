---
sidebar_position: 3
title: Java Integration
---

# Java Integration

The Java Interop Service provides runtime class information to the language server, enabling Java class completions and documentation.

## Overview

BBj programs can use Java classes directly. To provide IDE support for this, the language server needs information about:

- Available Java classes
- Method signatures
- Field types
- Constructor parameters
- JavaDoc documentation

The Java Interop Service provides this information through reflection.

## Architecture

```
┌──────────────────────┐         JSON-RPC          ┌──────────────────────┐
│   Language Server    │◄────────Port 5008────────►│  Java Interop Service │
│    (TypeScript)      │                           │       (Java)          │
└──────────────────────┘                           └──────────────────────┘
         │                                                    │
         │                                                    │
    ┌────▼────┐                                    ┌─────────▼─────────┐
    │ BBj AST │                                    │    Class Loader   │
    │         │                                    │                   │
    │ use     │                                    │  ┌─────────────┐  │
    │ java.*  │                                    │  │ BBj JARs    │  │
    │         │                                    │  │ Java RT     │  │
    └─────────┘                                    │  │ Custom JARs │  │
                                                   │  └─────────────┘  │
                                                   └───────────────────┘
```

## Communication Protocol

### Transport

- **Protocol**: JSON-RPC 2.0
- **Port**: 5008 (default)
- **Library**: LSP4J JSON-RPC

### Request/Response Format

```json
// Request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getClassInfo",
  "params": {
    "className": "java.util.ArrayList"
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "name": "ArrayList",
    "package": "java.util",
    "methods": [...],
    "fields": [...],
    "constructors": [...]
  }
}
```

## RPC Methods

### `getTopLevelPackages()`

Returns all top-level Java packages available in the classpath.

**Response:**
```json
{
  "packages": ["java", "javax", "com", "org", "bbj"]
}
```

### `getClassInfos(PackageInfoParams)`

Returns all classes in a specific package.

**Parameters:**
```json
{
  "packageName": "java.util"
}
```

**Response:**
```json
{
  "classes": [
    { "name": "ArrayList", "isInterface": false },
    { "name": "List", "isInterface": true },
    ...
  ]
}
```

### `getClassInfo(ClassInfoParams)`

Returns detailed information about a specific class.

**Parameters:**
```json
{
  "className": "java.util.ArrayList"
}
```

**Response:**
```json
{
  "name": "ArrayList",
  "package": "java.util",
  "superClass": "java.util.AbstractList",
  "interfaces": ["java.util.List", "java.io.Serializable"],
  "methods": [
    {
      "name": "add",
      "returnType": "boolean",
      "parameters": [
        { "name": "element", "type": "E" }
      ],
      "modifiers": ["public"]
    }
  ],
  "fields": [...],
  "constructors": [...]
}
```

### `loadClasspath(ClassPathInfoParams)`

Loads additional JARs into the classpath.

**Parameters:**
```json
{
  "entries": ["/path/to/custom.jar"]
}
```

## Java Implementation

### Main Entry Point

`SocketServiceApp.java`:

```java
public class SocketServiceApp {
    public static void main(String[] args) {
        ServerSocket serverSocket = new ServerSocket(5008);
        while (true) {
            Socket client = serverSocket.accept();
            // Handle connection with LSP4J JSON-RPC
        }
    }
}
```

### Service Implementation

`InteropService.java` implements the core reflection logic:

```java
public class InteropService {

    @JsonRequest
    public ClassInfo getClassInfo(ClassInfoParams params) {
        Class<?> clazz = Class.forName(params.getClassName());
        return extractClassInfo(clazz);
    }

    private ClassInfo extractClassInfo(Class<?> clazz) {
        // Use reflection to build ClassInfo
        Method[] methods = clazz.getMethods();
        Field[] fields = clazz.getFields();
        // ...
    }
}
```

### Custom Class Loader

`BbjClassLoader.java` manages classpath:

```java
public class BbjClassLoader extends URLClassLoader {

    public void addClasspathEntry(String path) {
        addURL(new File(path).toURI().toURL());
    }
}
```

## Data Models

### ClassInfo

```java
public class ClassInfo {
    String name;
    String packageName;
    String superClass;
    List<String> interfaces;
    List<MethodInfo> methods;
    List<FieldInfo> fields;
    List<MethodInfo> constructors;
    boolean isInterface;
    boolean isAbstract;
}
```

### MethodInfo

```java
public class MethodInfo {
    String name;
    String returnType;
    List<ParameterInfo> parameters;
    List<String> modifiers;
    String javadoc;
}
```

### FieldInfo

```java
public class FieldInfo {
    String name;
    String type;
    List<String> modifiers;
}
```

## Classpath Management

### Default Classpath

The service automatically loads:

1. **BBj Runtime**: Classes from `$BBJ_HOME/lib/`
2. **Java Runtime**: Standard Java classes
3. **BBj Add-ons**: Additional BBj libraries

### BBj Version Detection

The service detects BBj version to find libraries:

```java
// BBj 24+: .lib directory
// Earlier: lib directory
String libDir = bbjVersion >= 24 ? ".lib" : "lib";
```

### Custom Entries

Additional JARs can be loaded via:

1. Configuration in Enterprise Manager
2. Direct `loadClasspath` RPC call
3. Workspace configuration

## TypeScript Integration

### Client Implementation

`java-interop.ts` provides the TypeScript interface:

```typescript
export class JavaInteropService {
    private connection: MessageConnection;

    async getClassInfo(className: string): Promise<ClassInfo> {
        return this.connection.sendRequest('getClassInfo', { className });
    }

    async getCompletions(prefix: string): Promise<CompletionItem[]> {
        const classes = await this.getClassesForPrefix(prefix);
        return classes.map(c => this.toCompletionItem(c));
    }
}
```

### Caching

Class information is cached to improve performance:

```typescript
private classCache = new Map<string, ClassInfo>();

async getClassInfo(className: string): Promise<ClassInfo> {
    if (this.classCache.has(className)) {
        return this.classCache.get(className)!;
    }
    const info = await this.fetchClassInfo(className);
    this.classCache.set(className, info);
    return info;
}
```

## Starting the Service

### Automatic Start

The VS Code extension starts the service automatically when needed.

### Manual Start

```bash
cd java-interop
./gradlew run
```

### Build JAR

```bash
./gradlew build
# Output: build/libs/java-interop.jar
```

## Troubleshooting

### Service Not Responding

1. Check if port 5008 is available
2. Verify Java 17+ is installed
3. Check BBj home configuration

### Missing Classes

1. Verify classpath configuration
2. Check JAR files exist
3. Look for class loading errors in logs

### Performance Issues

1. Large classpaths may slow startup
2. Consider caching warm-up
3. Check network latency if remote
