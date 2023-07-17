/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
package bbj.interop;

import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.eclipse.lsp4j.jsonrpc.services.JsonRequest;

import com.google.common.base.Stopwatch;
import com.google.common.primitives.Primitives;
import com.google.common.reflect.ClassPath;

import bbj.interop.data.ClassInfo;
import bbj.interop.data.ClassInfoParams;
import bbj.interop.data.ClassPathInfoParams;
import bbj.interop.data.FieldInfo;
import bbj.interop.data.MethodInfo;
import bbj.interop.data.PackageInfoParams;
import bbj.interop.data.ParameterInfo;

public class InteropService {

	private BbjClassLoader classLoader = new BbjClassLoader(new URL[] {}, ClassLoader.getPlatformClassLoader());
	private ClassPath classPath = null;

	public ClassPath getClassPath() {
		if (classPath == null) {
			try {
				classPath = ClassPath.from(classLoader);
			} catch (IOException e) {
				e.printStackTrace();
			}
		}
		return classPath;
	}

	@JsonRequest
	public CompletableFuture<List<ClassInfo>> getClassInfos(PackageInfoParams params) {
		return CompletableFuture.completedFuture(collectClassesByPackage(params.packageName));
	}

	private List<ClassInfo> collectClassesByPackage(String packageName) {
		var sw = Stopwatch.createStarted();
		Stream<ClassInfo> collected;
		if ("java.lang".equals(packageName)) {
			collected = Arrays.asList(JAVA_LANG).stream().map(className -> loadClassInfo("java.lang." + className));
		} else {
			var topLevelClasses = getClassPath().getTopLevelClasses(packageName);
			collected = topLevelClasses.stream().filter(info -> !info.getSimpleName().contains("-"))
					.map(info -> loadClassInfo(info.getName()));
		}
		var result = collected.collect(Collectors.toList());
		System.out.println("Loaded " + result.size() + " classes from package " + packageName + " took "
				+ sw.stop().elapsed(TimeUnit.MILLISECONDS) + "ms");
		return result;
	}

	@JsonRequest
	public CompletableFuture<ClassInfo> getClassInfo(ClassInfoParams params) {
		var classInfo = loadClassInfo(params.className);
		return CompletableFuture.completedFuture(classInfo);
	}


	private ClassInfo loadClassInfo(String className) {

		var classInfo = new ClassInfo();
		classInfo.name = className;
		try {
			Optional<Class<?>> primitiv = Primitives.allPrimitiveTypes().stream()
					.filter(it -> it.getSimpleName().equals(className)).findFirst();
			var clazz = primitiv.isPresent() ? primitiv.get() : Class.forName(className, false, classLoader);

			classInfo.simpleName = clazz.getCanonicalName();
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
			classInfo.error = "Class not found: " + className;
		} catch (NoClassDefFoundError error) {
			classInfo.fields = Collections.emptyList();
			classInfo.methods = Collections.emptyList();
			classInfo.error = "No class definition found: " + error.getMessage();
		}
		return classInfo;
	}

	@JsonRequest
	public CompletableFuture<Boolean> loadClasspath(ClassPathInfoParams params) {
		System.out.println("Load additional jars for "+params.toString()+"...");

		if (params.classPathEntries.size()== 1 && params.classPathEntries.get(0).equals("file:")) {
			System.out.println("Classpath empty. Defaulting to BBj's lib directory.");
			params.classPathEntries.clear();
			String homedir = System.getProperty("basis.BBjHome") + "/lib/*";
			if (homedir.substring(1,2).equals(":"))
				homedir = homedir.substring(2).replace("\\","/");
			params.classPathEntries.add("file:" + homedir);
		} else {
			System.out.println("Requested Classpath: "+params.classPathEntries.toString());
		}

		params.classPathEntries.forEach(entry -> {
			try {
				System.out.println("Add to classpath: " + entry);
				if (entry != null && entry.endsWith("/*")) {
					File file = Path.of(new URI(entry.substring(0, entry.length() - 1))).toFile();
					if (file.exists() && file.isDirectory()) {
						try {
							Files.walkFileTree(file.toPath(), new SimpleFileVisitor<Path>() {
								@Override
								public FileVisitResult visitFile(Path file, BasicFileAttributes attrs)
										throws IOException {
									if (file.toString().endsWith(".jar")) {
										classLoader.addUrl(file.toUri().toURL());
									}
									return super.visitFile(file, attrs);
								}
							});
						} catch (IOException e) {
							e.printStackTrace();
						}
					}
				} else {
					classLoader.addUrl(new URL(entry));
				}
				classPath = ClassPath.from(classLoader);
			} catch (IOException | URISyntaxException e) {
				e.printStackTrace();
			}
		});
		return CompletableFuture.completedFuture(true);
	}

	private String getProperTypeName(Class<?> clazz) {
		if (clazz.isArray()) {
			return clazz.getComponentType().getCanonicalName();
		}
		return clazz.getCanonicalName();
	}

	static class BbjClassLoader extends URLClassLoader {

		public BbjClassLoader(URL[] urls, ClassLoader parent) {
			super(urls, parent);
		}

		public void addUrl(URL url) {
			super.addURL(url);
		}
	}

	public static final String[] JAVA_LANG = (
			// interfaces
			"Appendable\n"
			+ "AutoCloseable\n"
			+ "CharSequence\n"
			+ "Cloneable\n"
			+ "Comparable\n"
			+ "Iterable\n"
			+ "ProcessHandle\n"
			+ "Readable\n"
			+ "Runnable\n"
			// classes
			+ "Boolean\n"
			+ "Byte\n"
			+ "Character\n"
			+ "Class\n"
			+ "ClassLoader\n"
			+ "ClassValue\n"
			+ "Compiler\n"
			+ "Double\n"
			+ "Enum\n"
			+ "Float\n"
			+ "InheritableThreadLocal\n"
			+ "Integer\n"
			+ "Long\n"
			+ "Math\n"
			+ "Module\n"
			+ "ModuleLayer\n"
			+ "Number\n"
			+ "Object\n"
			+ "Package\n"
			+ "Process\n"
			+ "ProcessBuilder\n"
			+ "Record\n"
			+ "Runtime\n"
			+ "RuntimePermission\n"
			+ "SecurityManager\n"
			+ "Short\n"
			+ "StackTraceElement\n"
			+ "StackWalker\n"
			+ "StrictMath\n"
			+ "String\n"
			+ "StringBuffer\n"
			+ "StringBuilder\n"
			+ "System\n"
			+ "Thread\n"
			+ "ThreadGroup\n"
			+ "ThreadLocal\n"
			+ "Throwable\n"
			+ "Void\\n"
			// exceptions
			+"ArithmeticException\n"
			+ "ArrayIndexOutOfBoundsException\n"
			+ "ArrayStoreException\n"
			+ "ClassCastException\n"
			+ "ClassNotFoundException\n"
			+ "CloneNotSupportedException\n"
			+ "EnumConstantNotPresentException\n"
			+ "Exception\n"
			+ "IllegalAccessException\n"
			+ "IllegalArgumentException\n"
			+ "IllegalCallerException\n"
			+ "IllegalMonitorStateException\n"
			+ "IllegalStateException\n"
			+ "IllegalThreadStateException\n"
			+ "IndexOutOfBoundsException\n"
			+ "InstantiationException\n"
			+ "InterruptedException\n"
			+ "LayerInstantiationException\n"
			+ "NegativeArraySizeException\n"
			+ "NoSuchFieldException\n"
			+ "NoSuchMethodException\n"
			+ "NullPointerException\n"
			+ "NumberFormatException\n"
			+ "ReflectiveOperationException\n"
			+ "RuntimeException\n"
			+ "SecurityException\n"
			+ "StringIndexOutOfBoundsException\n"
			+ "TypeNotPresentException\n"
			+ "UnsupportedOperationException\n"
			//errors
			+ "AbstractMethodError\n"
			+ "AssertionError\n"
			+ "BootstrapMethodError\n"
			+ "ClassCircularityError\n"
			+ "ClassFormatError\n"
			+ "Error\n"
			+ "ExceptionInInitializerError\n"
			+ "IllegalAccessError\n"
			+ "IncompatibleClassChangeError\n"
			+ "InstantiationError\n"
			+ "InternalError\n"
			+ "LinkageError\n"
			+ "NoClassDefFoundError\n"
			+ "NoSuchFieldError\n"
			+ "NoSuchMethodError\n"
			+ "OutOfMemoryError\n"
			+ "StackOverflowError\n"
			+ "ThreadDeath\n"
			+ "UnknownError\n"
			+ "UnsatisfiedLinkError\n"
			+ "UnsupportedClassVersionError\n"
			+ "VerifyError\n"
			+ "VirtualMachineError"
			).split("\\n");
}
