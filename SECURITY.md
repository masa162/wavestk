# Security Policy

## Sensitive Information

This project does **NOT** contain any hardcoded secrets or credentials in the codebase.

### Configuration

All sensitive information should be configured via:

1. **Cloudflare Dashboard**
   - Environment variables (BASIC_AUTH_USER, BASIC_AUTH_PASS)
   - Account ID (automatically detected via `wrangler login`)
   - Bindings (R2, D1)

2. **Local Development**
   - Use `.env` file (not committed to git)
   - Use `wrangler login` for authentication

### Protected Information

The following information is **NOT** stored in this repository:

- ✅ Basic Authentication credentials
- ✅ Cloudflare Account ID
- ✅ Cloudflare API Keys/Tokens
- ✅ D1 Database ID (stored in wrangler.toml as reference only)
- ✅ Email addresses
- ✅ Any production secrets

### How to Set Up

1. Clone this repository
2. Run `wrangler login` to authenticate with Cloudflare
3. Set environment variables in Cloudflare Dashboard:
   - `BASIC_AUTH_USER`: Your desired username
   - `BASIC_AUTH_PASS`: Your desired password
4. Deploy using `wrangler deploy`

### Reporting Security Issues

If you discover a security vulnerability, please report it to:
- GitHub Issues: https://github.com/masa162/wavestk/issues (for non-sensitive issues)
- Email: (Contact repository owner directly for sensitive issues)

### Development Guidelines

When contributing to this project:

1. **Never commit**:
   - Real credentials or secrets
   - Personal account IDs
   - Production configuration files with real values
   - `.env` files

2. **Always use**:
   - Placeholders like `<YOUR_USERNAME>`, `<YOUR_PASSWORD>`
   - Environment variables for sensitive data
   - `.gitignore` to exclude sensitive files

3. **Before committing**:
   - Review your changes for any sensitive information
   - Use `git diff` to check for accidental inclusions
   - Run security scanning tools if available

### Files Excluded from Git

The following files are excluded via `.gitignore`:

```
.env
.dev.vars
*.log
docs/memo.md
**/secrets.json
**/credentials.json
```

### Deployment Security

When deploying:

1. Use `wrangler login` for authentication
2. Set secrets via Cloudflare Dashboard
3. Enable 2FA on your Cloudflare account
4. Use strong passwords for Basic Authentication
5. Regularly rotate credentials

### Security Tools

Consider using the following tools:

- **git-secrets**: Prevent committing secrets
- **truffleHog**: Scan for secrets in git history
- **GitHub Secret Scanning**: Automatic detection of exposed secrets

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Updates

This security policy will be updated as the project evolves.

Last Updated: 2025-11-21
