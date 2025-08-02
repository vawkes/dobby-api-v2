# CI/CD Setup with GitHub Actions

## 🚀 Overview

This project uses GitHub Actions for continuous integration and deployment. The
CI/CD pipeline runs automatically on:

- **Pull Requests** to `main` or `develop` branches
- **Pushes** to `main` or `develop` branches

## 📋 Workflow Files

### 1. **Tests Workflow** (`.github/workflows/test.yml`)

- Runs on pull requests and pushes
- Executes all test suites
- Generates coverage reports
- Uploads coverage artifacts

### 2. **Full CI/CD Pipeline** (`.github/workflows/ci.yml`)

- Comprehensive pipeline with multiple jobs
- Security scanning
- Build artifacts
- Multiple Node.js versions

## 🔧 What Gets Tested

### **Test Jobs:**

1. **Linting** - ESLint and Prettier checks
2. **Unit Tests** - Core functionality tests
3. **API Tests** - HTTP endpoint testing
4. **Performance Tests** - Response time and load testing
5. **All Tests** - Complete test suite
6. **Coverage** - Code coverage reporting

### **Security Jobs:**

1. **Security Audit** - `npm audit` for vulnerabilities
2. **Security Tests** - Custom security test suite (if available)

### **Build Jobs:**

1. **Build** - TypeScript compilation
2. **Artifacts** - Upload build artifacts

## 📊 Coverage Reports

The workflow generates coverage reports that are:

- **Uploaded as artifacts** to GitHub
- **Available for download** from the Actions tab
- **Retained for 30 days**

## 🎯 Branch Protection

To ensure code quality, consider setting up branch protection rules:

### **Required Status Checks:**

- `Tests` - Must pass before merging
- `lint:check` - Linting must pass
- `test:unit` - Unit tests must pass
- `test:api` - API tests must pass

### **Settings:**

1. Go to **Repository Settings** → **Branches**
2. Add rule for `main` and `develop` branches
3. Enable **Require status checks to pass before merging**
4. Select the required checks from the list

## 🔍 Viewing Results

### **GitHub Actions Tab:**

- View all workflow runs
- Download coverage reports
- See detailed logs for each step

### **Pull Request Checks:**

- Status checks appear on PRs
- Block merging if tests fail
- Show coverage changes

## 🛠️ Local Testing

Before pushing, run these commands locally:

```bash
# Run all checks locally
npm run lint:check
npm run test:unit
npm run test:api
npm run test:performance
npm test
npm run test:coverage
```

## 📈 Coverage Goals

| Test Category     | Target Coverage |
| ----------------- | --------------- |
| Unit Tests        | 90%+            |
| API Tests         | 95%+            |
| Integration Tests | 85%+            |
| Overall           | 85%+            |

## 🚨 Troubleshooting

### **Common Issues:**

1. **Tests Failing Locally but Passing in CI**
   - Check Node.js version differences
   - Verify all dependencies are installed
   - Run `npm ci` instead of `npm install`

2. **Performance Tests Failing**
   - CI environment may be slower
   - Adjust performance thresholds if needed
   - Consider using different thresholds for CI vs local

3. **Coverage Reports Not Generating**
   - Ensure `jest.config.js` is configured correctly
   - Check that coverage reporters are enabled
   - Verify TypeScript compilation is working

### **Debugging Commands:**

```bash
# Run specific test categories
npm run test:unit
npm run test:api
npm run test:performance

# Run with verbose output
npm test -- --verbose

# Run with coverage
npm run test:coverage

# Check linting
npm run lint:check
```

## 🔄 Workflow Triggers

The workflows are triggered by:

```yaml
on:
    push:
        branches: [main, develop]
    pull_request:
        branches: [main, develop]
```

This means:

- ✅ **Pull requests** to main/develop trigger tests
- ✅ **Direct pushes** to main/develop trigger tests
- ❌ **Other branches** don't trigger CI (for performance)

## 📝 Adding New Tests

When adding new tests:

1. **Create test file** in `test/` directory
2. **Add to package.json scripts** if needed
3. **Update workflow** to include new test category
4. **Test locally** before pushing

Example workflow addition:

```yaml
- name: Run new test category
  run: npm run test:new-category
```

## 🎉 Success Criteria

A successful CI run means:

- ✅ All tests pass
- ✅ Linting passes
- ✅ Coverage meets targets
- ✅ No security vulnerabilities
- ✅ Build completes successfully

This ensures your code is ready for production! 🚀
