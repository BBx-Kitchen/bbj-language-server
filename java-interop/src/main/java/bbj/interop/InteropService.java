/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
package bbj.interop;

import java.io.File;
import java.io.IOException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
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
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.eclipse.lsp4j.jsonrpc.services.JsonRequest;

import com.google.common.base.Stopwatch;
import com.google.common.collect.Lists;
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
	public CompletableFuture<List<PackageInfoParams>> getTopLevelPackages() {
		var topLevelPackages = new HashSet<String>();
		Arrays.stream(Package.getPackages()).forEach((info) -> {
			topLevelPackages.add(info.getName());
		});
		return CompletableFuture.completedFuture(topLevelPackages.stream().map(packageName -> {
			var packInfo = new PackageInfoParams();
			packInfo.packageName = packageName;
			return packInfo;
		}).toList());
	}

	@JsonRequest
	public CompletableFuture<List<ClassInfo>> getClassInfos(PackageInfoParams params) {
		return CompletableFuture.completedFuture(collectClassesByPackage(params.packageName));
	}

	@JsonRequest
	public CompletableFuture<ClassInfo> getClassInfo(ClassInfoParams params) {
		var classInfo = loadClassInfo(params.className);
		return CompletableFuture.completedFuture(classInfo);
	}

	@JsonRequest
	public CompletableFuture<Boolean> loadClasspath(ClassPathInfoParams params) {
		var sw = Stopwatch.createStarted();
		System.out.println("Loading additional jars for " + String.join(", ", params.classPathEntries) + "...");

		if (params.classPathEntries.size() == 1 && params.classPathEntries.get(0).equals("file:")) {
			System.out.println("Classpath empty. Defaulting to BBj's lib directory.");
			params.classPathEntries.clear();

			String homedir = System.getProperty("basis.BBjHome") + "/.lib/*";
			// BBj 24 moved the JARs to .lib instead of lib
			try {
				if (Class.forName("com.basis.util.common.VersionInfo").getField("MAJOR_VERSION").getInt(null) < 24) {
					homedir = System.getProperty("basis.BBjHome") + "/.lib/*";
				}
			} catch (IllegalAccessException e) {
				throw new RuntimeException(e);
			} catch (NoSuchFieldException e) {
				throw new RuntimeException(e);
			} catch (ClassNotFoundException e) {
				throw new RuntimeException(e);
			}

			if (homedir.substring(1, 2).equals(":"))
				homedir = homedir.substring(2).replace("\\", "/");
			params.classPathEntries.add("file:" + homedir);
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
		System.out.println("Finished loading additional jars in: " + sw.elapsed(TimeUnit.MILLISECONDS) + "ms");
		return CompletableFuture.completedFuture(true);
	}

	private List<ClassInfo> collectClassesByPackage(String packageName) {
		var sw = Stopwatch.createStarted();
		Stream<ClassInfo> collected;
		if ("java.lang".equals(packageName)) {
			collected = Arrays.asList(JavaLangPackage.JAVA_LANG).stream()
					.map(className -> loadClassInfo("java.lang." + className));
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

	private ClassInfo loadClassInfo(String className) {
		// FIXME handle inner class names
		var classInfo = new ClassInfo();
		classInfo.name = className;
		try {
			Optional<Class<?>> primitiv = Primitives.allPrimitiveTypes().stream()
					.filter(it -> it.getSimpleName().equals(className)).findFirst();
			var clazz = primitiv.isPresent() ? primitiv.get() : loadClassByName(className);

			classInfo.simpleName = clazz.getCanonicalName();
			classInfo.packageName = clazz.getPackageName();
			classInfo.fields = Stream.of(clazz.getFields()).map(f -> {
				var fi = new FieldInfo();
				fi.name = f.getName();
				fi.type = getProperTypeName(f.getType());
				fi.declaringClass = f.getDeclaringClass().getName();
				return fi;
			}).collect(Collectors.toList());
			List<Method> methods = Lists.newArrayList(clazz.getMethods());
			if (clazz.isInterface()) {
				// add implicit Object declared methods
				methods.addAll(
						Stream.of(Object.class.getMethods()).filter(m -> Modifier.isPublic(m.getModifiers())).toList());
			}
			classInfo.methods = methods.stream().map(m -> {
				var mi = new MethodInfo();
				mi.name = m.getName();
				mi.declaringClass = m.getDeclaringClass().getName();
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

	private static Pattern FIRST_UPPER_SEGMENT = Pattern.compile("\\.[A-Z]");

	private Class<?> loadClassByName(String className) throws ClassNotFoundException {
		try {
			return Class.forName(className, false, classLoader);
		} catch (ClassNotFoundException e) {
			var matches = FIRST_UPPER_SEGMENT.matcher(className).results().limit(2).count();
			if (matches > 1) {
				// Probably nested class FQN
				var segements = className.split("\\.");
				var delim = ".";
				if (segements.length > 1) {
					// Try with canonical name
					var canonicalName = new StringBuilder();
					for (int i = 0; i < segements.length; i++) {
						var qualifier = segements[i];
						canonicalName.append(qualifier);
						if (i < (segements.length - 1)) {
							if (!qualifier.isEmpty() && Character.isUpperCase(qualifier.charAt(0))) {
								delim = "$";
							}
							canonicalName.append(delim);
						}
					}
					if ("$".equals(delim)) {
						// Nested class, try to load with canonical name
						return Class.forName(canonicalName.toString(), false, classLoader);
					}
				}
			}
			throw e;
		}
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

		/*
		 * Make super implementation accessible
		 * 
		 */
		public void addUrl(URL url) {
			super.addURL(url);
		}
	}

}
