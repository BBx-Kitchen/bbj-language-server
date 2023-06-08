/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
package bbj.interop;

import java.io.File;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.Collections;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.eclipse.lsp4j.jsonrpc.services.JsonRequest;

import bbj.interop.data.ClassInfo;
import bbj.interop.data.ClassInfoParams;
import bbj.interop.data.ClassPathInfoParams;
import bbj.interop.data.FieldInfo;
import bbj.interop.data.MethodInfo;
import bbj.interop.data.ParameterInfo;

public class InteropService {

	private BbjClassLoader classLoader = new BbjClassLoader(new URL[] {}, InteropService.class.getClassLoader());

	@JsonRequest
	public CompletableFuture<ClassInfo> getClassInfo(ClassInfoParams params) {
		var classInfo = new ClassInfo();
		classInfo.name = params.className;
		try {
			var clazz = Class.forName(params.className, false, classLoader);

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
		} catch (NoClassDefFoundError error) {
			classInfo.fields = Collections.emptyList();
			classInfo.methods = Collections.emptyList();
			classInfo.error = "No class definition found: " + error.getMessage();
		}
		return CompletableFuture.completedFuture(classInfo);
	}

	@JsonRequest
	public CompletableFuture<Boolean> loadClasspath(ClassPathInfoParams params) {
		System.out.println("Load additional jars");
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
			} catch (MalformedURLException | URISyntaxException e) {
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
}
