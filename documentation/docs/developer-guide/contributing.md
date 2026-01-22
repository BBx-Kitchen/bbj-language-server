---
sidebar_position: 5
title: Contributing
---

# Contributing

We welcome contributions to the BBj Language Server project! This guide will help you get started.

## Ways to Contribute

- **Bug Reports**: Found a bug? Open an issue with details
- **Feature Requests**: Have an idea? Share it in the issues
- **Code Contributions**: Submit pull requests for fixes or features
- **Documentation**: Improve or add documentation
- **Testing**: Add test cases for uncovered functionality

## Getting Started

### 1. Fork the Repository

Fork [BBx-Kitchen/bbj-language-server](https://github.com/BBx-Kitchen/bbj-language-server) on GitHub.

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/bbj-language-server.git
cd bbj-language-server
```

### 3. Set Up Development Environment

Follow the [Building Guide](./building.md) to set up your environment.

### 4. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

Use descriptive branch names:
- `feature/add-hover-for-labels`
- `fix/completion-not-showing`
- `docs/update-installation-guide`

## Development Workflow

### 1. Make Changes

- Follow existing code style
- Add tests for new functionality
- Update documentation if needed

### 2. Run Tests

```bash
cd bbj-vscode
npm run test
npm run lint
```

### 3. Test in VS Code

1. Press `F5` to launch extension
2. Manually test your changes
3. Check Output panel for errors

### 4. Commit Changes

Write clear commit messages:

```bash
git commit -m "feat: add hover support for BBj labels

- Implement hover provider for labels
- Show label definition location
- Include referenced line preview"
```

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `test:` - Tests
- `refactor:` - Code refactoring

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Open a pull request on GitHub with:
- Clear description of changes
- Reference to related issues
- Screenshots if UI changes

## Code Style

### TypeScript

- Use TypeScript strict mode
- Follow ESLint rules
- Use meaningful variable names
- Add JSDoc comments for public APIs

```typescript
/**
 * Provides hover information for BBj elements.
 * @param node - The AST node to get hover info for
 * @returns Hover content or undefined
 */
export function getHoverContent(node: AstNode): Hover | undefined {
    // Implementation
}
```

### Java

- Follow standard Java conventions
- Use meaningful names
- Add JavaDoc for public methods

```java
/**
 * Retrieves class information via reflection.
 * @param className Fully qualified class name
 * @return ClassInfo object or null if not found
 */
public ClassInfo getClassInfo(String className) {
    // Implementation
}
```

## Project Areas

### Grammar Changes

Modifying `bbj.langium`:

1. Make grammar changes
2. Run `npm run langium:generate`
3. Update affected services
4. Add parser tests
5. Update VERBs.md if adding new verbs

### Adding Language Features

1. Identify the appropriate service
2. Implement the feature
3. Add tests
4. Update documentation

### Java Interop Changes

1. Modify Java code
2. Update TypeScript interface if needed
3. Test integration
4. Document new RPC methods

## Testing Requirements

All contributions should include tests:

- **Parser changes**: Add test cases in `parser.test.ts`
- **Validation**: Add cases in `validation.test.ts`
- **Completion**: Add cases in `completion-test.test.ts`
- **New features**: Create appropriate test file

See [Testing Guide](./testing.md) for details.

## Documentation

Update documentation for:

- New features
- Changed behavior
- Configuration options
- API changes

Documentation lives in `documentation/docs/`.

## Issue Guidelines

### Bug Reports

Include:
- VS Code version
- Extension version
- BBj version
- Steps to reproduce
- Expected vs actual behavior
- Sample code if applicable

### Feature Requests

Include:
- Use case description
- Proposed solution
- Alternative approaches considered

## Pull Request Process

1. Ensure tests pass
2. Update documentation
3. Request review from maintainers
4. Address review feedback
5. Squash commits if requested

## Questions?

- Open a [GitHub Discussion](https://github.com/BBx-Kitchen/bbj-language-server/discussions)
- Check existing issues for similar questions
- Review documentation

## License

By contributing, you agree that your contributions will be licensed under the project's license.

Thank you for contributing to the BBj Language Server!
