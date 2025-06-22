# Repository Rulesets for Labor2Hire Backend

## Overview

This document defines the repository rulesets for the Labor2Hire backend project with two main development branches and role-based access controls.

## Branch Structure

- **dev-bhavesh**: Admin branch with full repository access
- **dev-gopal**: Limited access branch with restricted folder permissions

## Ruleset Configuration

### 1. Branch Protection Rules

#### Rule: `dev-bhavesh-protection`

**Target**: `dev-bhavesh` branch
**Access Level**: Admin (Bhavesh) - Full Access

**Protection Settings:**

- ✅ Require pull request reviews before merging: **1 reviewer**
- ✅ Dismiss stale reviews when new commits are pushed
- ✅ Require review from code owners
- ✅ Restrict pushes that create files over 100MB
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ✅ Include administrators (can be bypassed by admin)
- ✅ Allow force pushes (admin only)
- ✅ Allow deletions (admin only)

**Required Status Checks:**

- `ci/node-tests` (Node.js testing)
- `security/dependency-check`
- `lint/eslint-check`
- `build/compile-check`

#### Rule: `dev-gopal-protection`

**Target**: `dev-gopal` branch
**Access Level**: Developer (Gopal) - Restricted Access

**Protection Settings:**

- ✅ Require pull request reviews before merging: **2 reviewers** (including admin)
- ✅ Dismiss stale reviews when new commits are pushed
- ✅ Require review from code owners
- ✅ Restrict pushes that create files over 50MB
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ❌ Include administrators (admin can bypass)
- ❌ Allow force pushes (blocked)
- ❌ Allow deletions (blocked)

**Required Status Checks:**

- `ci/node-tests`
- `security/dependency-check`
- `lint/eslint-check`
- `build/compile-check`
- `admin/approval-required`

### 2. Path-Based Access Rules

#### Rule: `gopal-restricted-access`

**Target**: `dev-gopal` branch
**User**: Gopal
**Access Type**: Path-based restrictions

**Allowed Paths:**

```
src/modules/remote-config/templates/**
src/modules/remote-config/schemas/**
```

**Blocked Paths:**

```
src/modules/authentication/**
src/modules/user-management/**
src/modules/job-matching/**
src/modules/negotiation/**
src/modules/payment/**
src/modules/professional/**
src/modules/company/**
src/modules/geolocation/**
src/modules/statistics/**
src/config/**
src/middlewares/**
src/constants/**
src/tests/**
src/app.js
package.json
.env*
logs/**
```

**File Operations:**

- ✅ **CREATE**: New files in allowed paths only
- ✅ **READ**: Files in allowed paths only
- ✅ **UPDATE**: Files in allowed paths only
- ❌ **DELETE**: Blocked for all files
- ❌ **RENAME**: Blocked for all files
- ❌ **MOVE**: Blocked between different directories

#### Rule: `bhavesh-full-access`

**Target**: `dev-bhavesh` branch
**User**: Bhavesh (Admin)
**Access Type**: Full repository access

**Allowed Operations:**

- ✅ Full CRUD operations on all files and directories
- ✅ Branch management (create, delete, merge)
- ✅ Repository settings modification
- ✅ Ruleset management
- ✅ Collaborator management
- ✅ Security settings management

### 3. File Type Restrictions

#### Rule: `file-type-restrictions`

**Target**: Both branches
**Scope**: Repository-wide

**Blocked File Types:**

```
*.exe
*.dll
*.so
*.dylib
*.app
*.deb
*.rpm
*.msi
*.dmg
*.iso
*.img
*.bin
*.key
*.pem
*.p12
*.pfx
*.jks
*.keystore
```

**Size Limits:**

- **Maximum file size**: 100MB (dev-bhavesh), 50MB (dev-gopal)
- **Repository size limit**: 1GB
- **Large file warning**: Files > 10MB

### 4. Commit and PR Rules

#### Rule: `commit-message-standards`

**Target**: Both branches
**Scope**: Commit validation

**Required Format:**

```
type(scope): description

Types: feat, fix, docs, style, refactor, test, chore
Scope: module name or 'global'
Example: feat(remote-config): add new template validation
```

**Validation Rules:**

- ✅ Commit message must follow conventional format
- ✅ Description must be at least 10 characters
- ✅ No commits directly to main/master branch
- ✅ Signed commits required (GPG)

#### Rule: `pull-request-requirements`

**Target**: Both branches
**Scope**: PR validation

**PR Requirements:**

- ✅ **Title**: Must follow commit message format
- ✅ **Description**: Must include:
  - What changes were made
  - Why the changes were made
  - Testing performed
  - Screenshots (if UI changes)
- ✅ **Labels**: Must include type label (feature, bugfix, docs, etc.)
- ✅ **Assignees**: Must assign to reviewer
- ✅ **Linked Issues**: Must link to related issue (if applicable)

### 5. Security Rules

#### Rule: `security-scanning`

**Target**: Both branches
**Scope**: Security validation

**Required Checks:**

- ✅ **Dependency vulnerabilities**: No high/critical vulnerabilities
- ✅ **Secret scanning**: No API keys, passwords, or tokens
- ✅ **Code scanning**: No security anti-patterns
- ✅ **License compliance**: Only approved licenses

**Blocked Patterns:**

```javascript
// Blocked patterns in code
password = "
api_key = "
secret = "
token = "
mongodb://.*:.*@
redis://.*:.*@
```

#### Rule: `environment-protection`

**Target**: Both branches
**Scope**: Environment files

**Protected Files:**

```
.env*
config/database.js
config/redis.js
src/config/logger.js (modification restrictions)
```

**Access Rules:**

- **Bhavesh**: Full access to all environment files
- **Gopal**: No access to environment files

### 6. Automation Rules

#### Rule: `automated-testing`

**Target**: Both branches
**Scope**: CI/CD pipeline

**Required Tests:**

```yaml
# Test pipeline for both branches
tests:
  - unit-tests: src/tests/**
  - integration-tests: API endpoint testing
  - security-tests: vulnerability scans
  - lint-tests: ESLint validation
  - type-tests: TypeScript/JSDoc validation
```

**Test Coverage Requirements:**

- **dev-bhavesh**: Minimum 70% coverage
- **dev-gopal**: Minimum 80% coverage (stricter for limited access)

#### Rule: `auto-merge-restrictions`

**Target**: Both branches
**Scope**: Merge automation

**Auto-merge Conditions:**

- ✅ All required status checks pass
- ✅ No merge conflicts
- ✅ PR approved by required reviewers
- ✅ Branch is up to date with target
- ✅ No security vulnerabilities detected

**Manual Merge Required For:**

- Changes to critical files (app.js, package.json)
- Database migration files
- Configuration changes
- Security-related modifications

### 7. Notification Rules

#### Rule: `notification-settings`

**Target**: Both branches
**Scope**: Team notifications

**Notification Triggers:**

- 🔔 **PR created**: Notify reviewers
- 🔔 **PR approved**: Notify author
- 🔔 **PR merged**: Notify team
- 🔔 **Build failed**: Notify author and admin
- 🔔 **Security issue**: Immediate notification to admin
- 🔔 **Large file added**: Notify admin
- 🔔 **Force push**: Notify admin (if enabled)

**Notification Channels:**

- Email notifications for critical issues
- Slack/Teams integration for team updates
- GitHub notifications for standard workflow

### 8. Branch Merge Rules

#### Rule: `merge-strategies`

**Target**: Both branches
**Scope**: Merge behavior

**Merge Strategy:**

- **dev-gopal → dev-bhavesh**: Squash and merge (clean history)
- **dev-bhavesh → main**: Merge commit (preserve history)
- **Hotfixes**: Cherry-pick allowed (admin only)

**Merge Requirements:**

```yaml
dev-gopal:
  - 2 approvals required (including 1 admin)
  - All tests pass
  - No conflicts
  - Admin final approval

dev-bhavesh:
  - 1 approval required
  - Admin can self-approve
  - Emergency bypass available
```

## Implementation Steps

### Step 1: Access Repository Settings

1. Navigate to your GitHub repository: `https://github.com/YOUR-USERNAME/labor2Hire-Backend`
2. Click on **Settings** tab (you need admin access)
3. In the left sidebar, scroll down to **Code security and analysis** section
4. Click on **Rulesets** under the **Rules** section

### Step 2: Create Branch Protection Rulesets

#### For dev-bhavesh Branch:

1. Click **New Ruleset**
2. **Ruleset Name**: `dev-bhavesh-protection`
3. **Enforcement Status**: Active
4. **Target Branches**:
   - Select "Include by pattern"
   - Enter pattern: `dev-bhavesh`
5. **Rules Configuration**:
   - ✅ **Restrict pushes**: Enable
   - ✅ **Require pull requests**:
     - Required reviewers: 1
     - Dismiss stale reviews: Yes
     - Require review from code owners: Yes
   - ✅ **Require status checks**:
     - Add: `ci/node-tests`, `security/dependency-check`, `lint/eslint-check`, `build/compile-check`
   - ✅ **Block force pushes**: Disable (allow for admin)
   - ✅ **Restrict deletions**: Disable (allow for admin)
6. Click **Create Ruleset**

#### For dev-gopal Branch:

1. Click **New Ruleset**
2. **Ruleset Name**: `dev-gopal-protection`
3. **Enforcement Status**: Active
4. **Target Branches**:
   - Select "Include by pattern"
   - Enter pattern: `dev-gopal`
5. **Rules Configuration**:
   - ✅ **Restrict pushes**: Enable
   - ✅ **Require pull requests**:
     - Required reviewers: 2
     - Dismiss stale reviews: Yes
     - Require review from code owners: Yes
   - ✅ **Require status checks**:
     - Add: `ci/node-tests`, `security/dependency-check`, `lint/eslint-check`, `build/compile-check`, `admin/approval-required`
   - ✅ **Block force pushes**: Enable
   - ✅ **Restrict deletions**: Enable
6. Click **Create Ruleset**

### Step 3: Set Path-Based Access Restrictions

#### Create Path Restriction Ruleset for Gopal:

1. Click **New Ruleset**
2. **Ruleset Name**: `gopal-path-restrictions`
3. **Enforcement Status**: Active
4. **Target**:
   - Select "Include by pattern"
   - Enter pattern: `dev-gopal`
5. **Restrict Pushes**:
   - Enable "Restrict pushes that create files"
   - **Restricted file paths**:
     ```
     src/modules/authentication/**
     src/modules/user-management/**
     src/modules/job-matching/**
     src/modules/negotiation/**
     src/modules/payment/**
     src/modules/professional/**
     src/modules/company/**
     src/modules/geolocation/**
     src/modules/statistics/**
     src/config/**
     src/middlewares/**
     src/constants/**
     src/tests/**
     src/app.js
     package.json
     .env*
     logs/**
     ```
6. **Exceptions**: Add user `gopal` with access to:
   ```
   src/modules/remote-config/templates/**
   src/modules/remote-config/schemas/**
   ```
7. Click **Create Ruleset**

### Step 4: Configure File Type and Size Restrictions

#### Create File Restriction Ruleset:

1. Click **New Ruleset**
2. **Ruleset Name**: `file-type-size-restrictions`
3. **Enforcement Status**: Active
4. **Target**: All branches
5. **Restrict Pushes**:
   - Enable "Restrict pushes that create files"
   - **File size limit**:
     - dev-bhavesh: 100MB
     - dev-gopal: 50MB
   - **Blocked file extensions**:
     ```
     *.exe, *.dll, *.so, *.dylib, *.app, *.deb, *.rpm, *.msi,
     *.dmg, *.iso, *.img, *.bin, *.key, *.pem, *.p12, *.pfx,
     *.jks, *.keystore
     ```
6. Click **Create Ruleset**

### Step 5: Set Up Commit Message Validation

#### Using GitHub Actions (create `.github/workflows/commit-validation.yml`):

```yaml
name: Commit Message Validation
on:
  push:
    branches: [dev-bhavesh, dev-gopal]
  pull_request:
    branches: [dev-bhavesh, dev-gopal]

jobs:
  validate-commit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Validate Commit Messages
        uses: wagoid/commitlint-github-action@v5
        with:
          configFile: ".commitlintrc.json"
```

#### Create `.commitlintrc.json` in root:

```json
{
  "extends": ["@commitlint/config-conventional"],
  "rules": {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "docs", "style", "refactor", "test", "chore"]
    ],
    "scope-enum": [
      2,
      "always",
      [
        "remote-config",
        "authentication",
        "user-management",
        "job-matching",
        "negotiation",
        "payment",
        "global"
      ]
    ],
    "subject-min-length": [2, "always", 10]
  }
}
```

### Step 6: Configure Security Scanning

#### Enable GitHub Security Features:

1. Go to **Settings** → **Security** → **Code security and analysis**
2. Enable:
   - ✅ **Dependency graph**
   - ✅ **Dependabot alerts**
   - ✅ **Dependabot security updates**
   - ✅ **Secret scanning**
   - ✅ **Code scanning** (setup CodeQL)

#### Create Secret Scanning Custom Patterns:

1. Go to **Settings** → **Security** → **Secret scanning**
2. Click **New pattern**
3. Add patterns for:
   ```regex
   password\s*=\s*["\'][^"\']+["\']
   api_key\s*=\s*["\'][^"\']+["\']
   secret\s*=\s*["\'][^"\']+["\']
   token\s*=\s*["\'][^"\']+["\']
   mongodb://.*:.*@.*
   redis://.*:.*@.*
   ```

### Step 7: Set Up Status Checks (CI/CD)

#### Create `.github/workflows/ci.yml`:

```yaml
name: CI Pipeline
on:
  push:
    branches: [dev-bhavesh, dev-gopal]
  pull_request:
    branches: [dev-bhavesh, dev-gopal]

jobs:
  test:
    name: Node.js Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"
      - run: npm ci
      - run: npm test
      - run: npm run lint
      - run: npm run build

  security:
    name: Security Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm audit --audit-level=high
      - run: npm run security-scan

  admin-approval:
    name: Admin Approval Required
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/dev-gopal'
    steps:
      - name: Request Admin Approval
        run: echo "Admin approval required for dev-gopal branch"
```

### Step 8: Configure Branch Protection via API (Advanced)

#### Using GitHub CLI:

```bash
# Install GitHub CLI
gh auth login

# Create branch protection for dev-bhavesh
gh api repos/:owner/:repo/branches/dev-bhavesh/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["ci/node-tests","security/dependency-check","lint/eslint-check","build/compile-check"]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
  --field restrictions='{"users":[],"teams":[],"apps":[]}'

# Create branch protection for dev-gopal
gh api repos/:owner/:repo/branches/dev-gopal/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["ci/node-tests","security/dependency-check","lint/eslint-check","build/compile-check","admin/approval-required"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":2,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
  --field restrictions='{"users":[],"teams":[],"apps":[]}'
```

### Step 9: Create CODEOWNERS File

#### Create `.github/CODEOWNERS`:

```
# Global owners
* @bhavesh

# Remote config templates and schemas - Gopal can contribute
src/modules/remote-config/templates/ @gopal @bhavesh
src/modules/remote-config/schemas/ @gopal @bhavesh

# Critical files - Admin only
src/app.js @bhavesh
package.json @bhavesh
.env* @bhavesh
src/config/ @bhavesh
src/middlewares/ @bhavesh

# All other modules - Admin only
src/modules/authentication/ @bhavesh
src/modules/user-management/ @bhavesh
src/modules/job-matching/ @bhavesh
src/modules/negotiation/ @bhavesh
src/modules/payment/ @bhavesh
```

### Step 10: Testing and Validation

#### Test the Rulesets:

1. **Create test branches** from dev-gopal and dev-bhavesh
2. **Test Gopal's restrictions**:
   - Try to modify files outside allowed paths (should fail)
   - Try to create files in templates/schemas (should succeed)
   - Try to force push (should fail)
3. **Test Bhavesh's permissions**:
   - Modify any file (should succeed)
   - Force push if needed (should succeed)
   - Bypass protection rules (should succeed)
4. **Test PR requirements**:
   - Create PR without proper reviews (should be blocked)
   - Create PR with failing status checks (should be blocked)

### Troubleshooting Common Issues:

#### Issue 1: Path Restrictions Not Working

**Solution**:

- Ensure patterns use correct syntax: `src/modules/remote-config/**`
- Check that user permissions are correctly set
- Verify ruleset is active and targeting correct branches

#### Issue 2: Status Checks Failing

**Solution**:

- Verify GitHub Actions workflows are properly configured
- Check that all required status checks are spelled correctly
- Ensure CI/CD pipeline is running successfully

#### Issue 3: User Can't Access Allowed Paths

**Solution**:

- Check collaborator permissions in repository settings
- Verify CODEOWNERS file syntax
- Ensure user is added to repository with correct permissions

### Alternative Implementation Using GitHub Enterprise

If you have GitHub Enterprise, you can use more advanced features:

1. **Organization-level rulesets**
2. **Advanced security features**
3. **More granular path restrictions**
4. **Custom compliance frameworks**

## Monitoring and Maintenance

### Regular Reviews

- **Weekly**: Review failed checks and bypass requests
- **Monthly**: Analyze access patterns and adjust rules
- **Quarterly**: Review and update security requirements

### Metrics to Track

- PR approval times
- Test pass rates
- Security scan results
- Rule violation incidents
- Developer productivity impact

## Emergency Procedures

### Bypass Procedures

- **Admin Override**: Bhavesh can bypass any rule in emergency
- **Documentation Required**: All bypasses must be documented
- **Post-incident Review**: Required after emergency bypasses

### Contact Information

- **Repository Admin**: Bhavesh
- **Lead Developer**: Gopal (limited access)
- **Security Contact**: [Security Team Email]

---

## Notes

- These rulesets ensure secure development while maintaining productivity
- Gopal's restricted access ensures he can only work on remote-config templates and schemas
- All changes are tracked and auditable
- Regular reviews ensure rules remain relevant and effective

**Last Updated**: June 22, 2025
**Version**: 1.0
**Next Review Date**: July 22, 2025
