# Changelog

## [0.3.0](https://github.com/santyxswc/streaming-Sntx/compare/v0.2.0...v0.3.0) (2026-09-30)


### Features

* **privacy:** ask for consent before loading Firebase Analytics and add a privacy page ([a68471c](https://github.com/santyxswc/streaming-Sntx/commit/a68471cb7760af15f006572ec86e8c538f5eebf7))
* **security:** add /embed bridge page so the desktop app can play trailers ([8bab5a0](https://github.com/santyxswc/streaming-Sntx/commit/8bab5a0166a20e173f47df02836df8cdbd2b0ca6))


### Bug Fixes

* **desktop:** play trailers through the bridge page, refresh favorite state and add a CSP ([2d7bc78](https://github.com/santyxswc/streaming-Sntx/commit/2d7bc788086ab9135643ab32746099a0342bdaf8))
* **publish:** read the npm SBOM from the lockfile and allow republishing a version ([7324af4](https://github.com/santyxswc/streaming-Sntx/commit/7324af49cc1790e05696f3ce34504e1eb6d5f85f))
* **security:** add a timeout to TMDB and OMDb requests ([d23250b](https://github.com/santyxswc/streaming-Sntx/commit/d23250b0c29a41a08cedb721603bd7279d58e9c5))

## [0.2.0](https://github.com/santyxswc/streaming-Sntx/compare/v0.1.0...v0.2.0) (2026-09-30)


### Features

* **observability:** structured JSON logging with request context and redaction ([b36c84f](https://github.com/santyxswc/streaming-Sntx/commit/b36c84f187445563a80ad50fd77fe391277b637f))


### Bug Fixes

* **build:** self-host fonts so the build no longer depends on Google Fonts ([75bc5ba](https://github.com/santyxswc/streaming-Sntx/commit/75bc5ba128f963ab4ff9b2577786df76d995ed58))
* **routes:** return 404 for detail URLs whose first segment is not a media type ([9a6fbbb](https://github.com/santyxswc/streaming-Sntx/commit/9a6fbbb02ffa3e0bc735bb3b2293e72e63a74e16))
* **security:** restrict CSP connect-src and frame-src to exact Firebase hosts ([#33](https://github.com/santyxswc/streaming-Sntx/issues/33)) ([715dc6a](https://github.com/santyxswc/streaming-Sntx/commit/715dc6a3e4db33e1543896a93a05bc284493b2f7))
