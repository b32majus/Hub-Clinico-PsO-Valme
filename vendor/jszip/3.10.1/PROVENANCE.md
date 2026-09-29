# JSZip vendored provenance

This directory contains a repository-local copy of the JSZip browser runtime used
by `index.html` and `Cuadro_Mando_Psoriasis_Valme_v2.html`. The scripts are loaded
from this path with a plain `<script src="vendor/jszip/3.10.1/jszip.min.js">`, so a
clean repository checkout (including GitHub Pages) resolves the XLSX runtime
entirely from repo-local files, with no CDN and no network access.

## Package

| Field | Value |
|---|---|
| Package | `jszip` |
| Version | `3.10.1` |
| License | `(MIT OR GPL-3.0-or-later)` — vendored under the **MIT** option |
| Copyright | (c) 2009-2016 Stuart Knightley, David Duponchel, Franz Buchinger, António Afonso |
| Files | `jszip.min.js`, `LICENSE.markdown` |

## Source of truth

- npm registry metadata: `https://registry.npmjs.org/jszip/3.10.1`
- Distribution tarball: `https://registry.npmjs.org/jszip/-/jszip-3.10.1.tgz`
- Tarball integrity: `sha512-xXDvecyTpGLrqFrvkrUSoxxfJI5AH7U8zxxtVclpsUtMCq4JQ290LY8AW5c7Ggnr/Y/oK+bQMbqK2qmtk3pN4g==`
- Tarball shasum (sha1): `34aee70eb18ea1faec2f589208a157d1feb091c2`

## Vendored artifact integrity

| File | SHA-256 |
|---|---|
| `jszip.min.js` | `acc7e41455a80765b5fd9c7ee1b8078a6d160bbbca455aeae854de65c947d59e` |

`jszip.min.js` is byte-identical to `package/dist/jszip.min.js` extracted from the
official npm tarball above. `LICENSE.markdown` is the upstream dual-license text
shipped with the package (`package/LICENSE.markdown`).

## Why 3.10.1

The original broken integration referenced
`../../materials_hs_valme/node_modules/jszip/dist/jszip.min.js`, i.e. an
out-of-repository Node dependency. Every JSZip copy available in the local
environment was inspected and all resolved to `3.10.1` with the same artifact
hash. `3.10.1` is the current stable 3.x release and matches the version the
original external path pointed at, so it is vendored without changing runtime
semantics.

## Browser compatibility

`jszip.min.js` is the UMD browser build (`dist/jszip.min.js`); it exposes a global
`JSZip` when loaded via `<script>` (verified with a headless-browser smoke check
that asserts `typeof JSZip !== "undefined"`).

## Maintenance

This is an intentionally bounded, static dependency. No package manager or build
system is introduced. To upgrade, replace the files here together with
`PROVENANCE.md` and the checks in `tests/jszip_local_dependency.test.js`.
