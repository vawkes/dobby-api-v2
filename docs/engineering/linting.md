# Linting Configuration

This project uses ESLint and Prettier for code quality and consistent formatting
across all TypeScript and React code.

## Overview

### ESLint Configuration

- **Root Project**: Comprehensive TypeScript linting for backend/API code
- **Frontend React**: React-specific linting with TypeScript support
- **Data Handler**: Dedicated linting for the data handler service
- **Infrastructure**: CDK-specific linting (inherits from root)

### Prettier Configuration

- Consistent code formatting across all files
- Single configuration file (`.prettierrc`) for the entire project
- Ignores build outputs and generated files

## Available Scripts

### Root Project

```bash
# Lint all TypeScript files
npm run lint

# Fix auto-fixable linting issues
npm run lint:fix

# Check for linting errors (fails on warnings)
npm run lint:check

# Format all files with Prettier
npm run format

# Check formatting without making changes
npm run format:check
```

### Frontend React

```bash
cd frontend-react

# Lint React TypeScript files
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Check for linting errors
npm run lint:check

# Format source files
npm run format

# Check formatting
npm run format:check
```

### Data Handler

```bash
cd data-handler-ts

# Lint TypeScript files
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

## Configuration Details

### ESLint Rules

#### TypeScript Rules

- **Strict Type Checking**: Comprehensive type safety enforcement
- **No Explicit Any**: Prevents use of `any` type
- **Unused Variables**: Detects unused variables and parameters
- **Modern Patterns**: Enforces modern TypeScript patterns
- **Promise Handling**: Ensures proper async/await usage

#### Code Quality Rules

- **Consistent Formatting**: Enforces consistent code style
- **Error Prevention**: Catches common programming mistakes
- **Best Practices**: Enforces modern JavaScript/TypeScript practices

#### React-Specific Rules (Frontend)

- **JSX Best Practices**: Ensures proper JSX usage
- **Hooks Rules**: Enforces React Hooks rules
- **Component Patterns**: Promotes good React component patterns

### Prettier Configuration

- **Line Length**: 100 characters
- **Indentation**: 2 spaces
- **Quotes**: Single quotes
- **Semicolons**: Always
- **Trailing Commas**: Always in multiline

## IDE Integration

### VS Code

1. Install ESLint and Prettier extensions
2. Enable "Format on Save" in settings
3. Set Prettier as default formatter

### Other IDEs

- Configure ESLint and Prettier plugins
- Enable auto-fix on save
- Set up format on save

## Pre-commit Hooks

Consider adding pre-commit hooks to automatically:

1. Run linting checks
2. Format code with Prettier
3. Run type checking

Example with husky:

```bash
npm install --save-dev husky lint-staged
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

Add to package.json:

```json
{
    "lint-staged": {
        "*.{ts,tsx}": [
            "eslint --fix",
            "prettier --write"
        ]
    }
}
```

## Troubleshooting

### Common Issues

1. **TypeScript Project References**: Ensure `tsconfig.json` is properly
   configured
2. **ESLint Parser Issues**: Check that `@typescript-eslint/parser` is installed
3. **Prettier Conflicts**: Ensure ESLint and Prettier rules don't conflict

### Performance

- ESLint with TypeScript can be slow on large projects
- Consider using `--cache` flag for better performance
- Use `.eslintignore` for excluding large directories

## Best Practices

1. **Run Linting Regularly**: Integrate into your development workflow
2. **Fix Issues Promptly**: Address linting errors as they arise
3. **Use Auto-fix**: Leverage `--fix` flag for automatic corrections
4. **Customize Rules**: Adjust rules based on team preferences
5. **Document Changes**: Update this file when modifying linting rules

## Migration Notes

- Updated from ESLint v8 to v9
- Added comprehensive TypeScript rules
- Implemented consistent formatting across all projects
- Added React-specific linting for frontend
