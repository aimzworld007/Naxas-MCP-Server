# npm CLI Release

Naxas MCP can be distributed as the public npm package `naxas-mcp`.

## User install

Without a global install:

```bash
npx naxas-mcp init
```

Global install:

```bash
npm install -g naxas-mcp
naxas-mcp init
```

## Run on localhost

For local PostgreSQL, Docker PostgreSQL, and VPS-private PostgreSQL setup details, see [LOCALHOST.md](LOCALHOST.md).

## Maintainer release

Prerequisites:

- npm account with permission to publish the package name
- npm CLI authenticated with `npm login`
- clean working tree
- version updated in `package.json`

Validate:

```bash
npm install
npm run check
npm pack --dry-run
```

The package must contain `dist/cli.js` and `dist/server.js`.

Publish:

```bash
npm publish
```

The package is configured with public access.

## Package-name availability

Repository search did not show an existing npm package named `naxas-mcp`, but npm registry availability must be confirmed immediately before the first publish because package names can be claimed at any time.

If the unscoped name is unavailable, use a scoped package such as:

```text
@aimzworld/naxas-mcp
```

The executable command can still remain:

```text
naxas-mcp
```

## Release safety

Never publish:

- `.env`
- database passwords
- production bearer tokens
- private connection URLs
- deployment-specific secrets

The package `files` allowlist limits published content to compiled code and public documentation/deployment assets.
