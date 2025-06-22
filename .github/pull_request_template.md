## Pull Request Template

### Description

Please include a summary of the changes and which issue is fixed. Include relevant motivation and context.

Fixes # (issue number)

### Type of Change

Please delete options that are not relevant.

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🧹 Code cleanup/refactoring
- [ ] 🚨 Test updates

### Module/Component Affected

Please check all that apply:

- [ ] Authentication (`src/modules/authentication/`)
- [ ] User Management (`src/modules/user-management/`)
- [ ] Job Matching (`src/modules/job-matching/`)
- [ ] Negotiation (`src/modules/negotiation/`)
- [ ] Payment (`src/modules/payment/`)
- [ ] Remote Config (`src/modules/remote-config/`)
- [ ] Configuration (`src/config/`)
- [ ] Middleware (`src/middlewares/`)
- [ ] Tests (`src/tests/`)
- [ ] Documentation
- [ ] Other: ****\_\_\_****

### Testing

Please describe how you tested your changes:

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing performed
- [ ] New tests added for new functionality

### Testing Details

Describe the tests you ran and/or created:

```
# Example:
npm test
npm run lint
npm run build
```

### Access Control Check (For Gopal)

If you are Gopal, please confirm:

- [ ] I have only modified files in `src/modules/remote-config/templates/`
- [ ] I have only modified files in `src/modules/remote-config/schemas/`
- [ ] I have NOT modified any other files outside my allowed paths
- [ ] This PR requires admin (Bhavesh) approval

### Checklist

Please check all boxes before submitting:

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

### Screenshots (if applicable)

Add screenshots to help explain your changes.

### Additional Notes

Add any additional notes, concerns, or context here.
