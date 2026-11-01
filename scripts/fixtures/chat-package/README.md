# Installed Chat package contracts

`scripts/verify-chat-package.mjs` copies these authored fixtures to an existing
consumer's `chat-contracts` child directory. It uses that consumer's installed
React, React DOM, matching React declarations and `mcbeui`, plus the repository's
TypeScript/esbuild tools. It does not install dependencies or start services.

The worker checks the three public Chat exports, private-helper exclusion,
fifteen SSR contracts, no semantic/ref/service calls during rendering, no React
warnings, and the three public CSS entries. Strict TypeScript also checks the
actual App and expected rejection of an unknown draft mode and a non-100 child
limit. App passes only Composer's own props to its native container.

The one-pixel image and monospace font are explicitly authored host inputs for
package behavior. They are not Bedrock material/font reference fixtures. These
contracts do not certify mounted behavior, physical controller input, native
font routing or pixel-perfect GUI reproduction. The separate browser/package
matrix and original-material comparisons retain their own evidence scopes.
