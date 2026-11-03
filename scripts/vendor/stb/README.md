# stb_truetype for source-only preparation

Unmodified `stb_truetype.h` v1.26 from `nothings/stb`, commit
`d14d46f6b44456eb88beac58cba833a4135d4c89`.

- Upstream: https://github.com/nothings/stb
- Header SHA256: `ecd30b05e0dd4fea3a13c26810dd9e1992dc379049482c393d5a19e6b5090aab`
- License: dual MIT / public domain; see `LICENSE.txt`.

Only `scripts/prepare-classic-truetype.c` uses this header. It is not compiled
into the React library or included in its npm distribution. The Python wrapper
only passes the SHA-verified caller-owned original font to stb; do not invoke
this unvalidated upstream parser on untrusted font data.
