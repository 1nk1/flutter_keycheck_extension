# Publishing Guide

## VS Code Marketplace Publication

### Prerequisites

1. **Microsoft Account** - Create/use existing Microsoft account
2. **Azure DevOps Organization** - Create at <https://dev.azure.com>
3. **Personal Access Token** - Generate with Marketplace permissions
4. **Publisher Account** - Register at <https://marketplace.visualstudio.com/manage>

### Step-by-Step Publication

#### 1. Install VSCE Tool

```bash
npm install -g vsce
```

#### 2. Create Publisher Account

- Go to <https://marketplace.visualstudio.com/manage>
- Click "Create publisher"
- Fill in details (ID, name, email)

#### 3. Login with VSCE

```bash
vsce login <publisher-id>
# Enter your Personal Access Token when prompted
```

#### 4. Publish Extension

```bash
# From project root
vsce publish
```

### Alternative: Manual Upload

1. Package extension: `npm run package`
2. Go to <https://marketplace.visualstudio.com/manage>
3. Click "New extension" → "Visual Studio Code"
4. Upload the `.vsix` file
5. Fill in marketplace details

## Open VSX Registry (Alternative)

Prerequisites

- Account at <https://open-vsx.org>
- Access token from Eclipse Foundation

### Publication

```bash
npx ovsx publish flutter-testing-keys-inspector-1.0.0.vsix -p <access-token>
```

## GitHub Releases

### Automatic (via GitHub Actions)

- Push a tag: `git tag v1.0.1 && git push origin v1.0.1`
- GitHub Actions will automatically create release

### Manual

1. Go to GitHub repository
2. Click "Releases" → "Create a new release"
3. Choose tag version
4. Upload `.vsix` file as asset
5. Write release notes

## Marketing Checklist

### Before Publishing

- [ ] Test extension thoroughly
- [ ] Update README with screenshots
- [ ] Add demo GIF/video
- [ ] Write comprehensive documentation
- [ ] Set appropriate keywords in package.json
- [ ] Add extension icon (128x128 PNG)

### After Publishing

- [ ] Share on social media
- [ ] Post on Flutter/Dart communities
- [ ] Write blog post/article
- [ ] Submit to extension collections
- [ ] Gather user feedback

## Version Management

### Semantic Versioning

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (1.1.0): New features, backwards compatible
- **PATCH** (1.0.1): Bug fixes, backwards compatible

### Automated Versioning

Use GitHub Actions workflow:

```bash
# Trigger version bump via GitHub UI
# Go to Actions → Version Bump → Run workflow
```

### Manual Version Bump

```bash
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0
```

## Monitoring & Analytics

### VS Code Marketplace Stats

- Downloads, ratings, reviews
- Available at <https://marketplace.visualstudio.com/manage>

### GitHub Analytics

- Stars, forks, issues
- Traffic insights
- Dependency usage

## Support & Maintenance

### Regular Tasks

- [ ] Monitor GitHub issues
- [ ] Update dependencies
- [ ] Test with new VS Code versions
- [ ] Respond to user feedback
- [ ] Update documentation

### Security

- [ ] Regular dependency audits: `npm audit`
- [ ] Update vulnerable packages
- [ ] Review pull requests carefully
- [ ] Use GitHub security advisories

## Troubleshooting

### Common Issues

1. **Publishing fails**: Check token permissions
2. **Extension not loading**: Verify activation events
3. **Tests failing**: Update test environment
4. **Build errors**: Check TypeScript/ESLint config

### Getting Help

- VS Code Extension API docs
- GitHub Issues template
- Stack Overflow with `vscode-extension` tag
- VS Code Extension Discord community
