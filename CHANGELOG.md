# Changelog

## [1.3.0](https://github.com/MapColonies/maps-playground/compare/v1.2.0...v1.3.0) (2026-07-30)


### Features

* **agent:** chat panel to edit selected demo via LiteLLM ([#23](https://github.com/MapColonies/maps-playground/issues/23)) ([27a82f8](https://github.com/MapColonies/maps-playground/commit/27a82f82b7ff6b8ffe16216e7514cf50cc63c51d))
* **agent:** render markdown and highlight code in chat replies ([#28](https://github.com/MapColonies/maps-playground/issues/28)) ([5fe858f](https://github.com/MapColonies/maps-playground/commit/5fe858fa7f88051aee204c35e679238972477f1e))
* app-usage Prometheus metrics + Grafana dashboard + Helm scrape ([#22](https://github.com/MapColonies/maps-playground/issues/22)) ([3728bc8](https://github.com/MapColonies/maps-playground/commit/3728bc899f9a98e2dd4b73cc98f006b4e97ddc51))
* **demo:** collapse buttons for agent and info panels ([#29](https://github.com/MapColonies/maps-playground/issues/29)) ([e504b0d](https://github.com/MapColonies/maps-playground/commit/e504b0dc8ab7bf234a67b6e9de2b4a418ed8a4b8))

## [1.2.0](https://github.com/MapColonies/maps-playground/compare/v1.1.1...v1.2.0) (2026-07-21)


### Features

* add demoCache localStorage util ([5823219](https://github.com/MapColonies/maps-playground/commit/5823219de9fcde5af2ad188eae716f0c5732cfe1))
* cache demo edits in localStorage with Loaded-from-cache banner ([#18](https://github.com/MapColonies/maps-playground/issues/18)) ([f7685da](https://github.com/MapColonies/maps-playground/commit/f7685da42d979bf847a9ba272d366e55509342e3))
* cache demo edits with Loaded-from-cache banner and clear button ([d627e9d](https://github.com/MapColonies/maps-playground/commit/d627e9d4e5258b087752a678ee53607e7477e3c1))
* emit edited files from flems component via onChange ([1bd4344](https://github.com/MapColonies/maps-playground/commit/1bd434481325143498fabeb229d840ccc62ee96a))
* **helm:** expose cache.debounceMs as PUBLIC_CACHE_DEBOUNCE_MS ([00b550c](https://github.com/MapColonies/maps-playground/commit/00b550cd09061978bbbb4b88fcad3de5ccd9c2c7))


### Bug Fixes

* register Flems onchange, react to demo switches, harden cache ([b4e9443](https://github.com/MapColonies/maps-playground/commit/b4e944369de9e2ef4fd0457a0d52a18f0a9004cb))

## [1.1.1](https://github.com/MapColonies/maps-playground/compare/v1.1.0...v1.1.1) (2026-07-20)


### Bug Fixes

* **helm:** rename chart to maps-playground ([f3a6f9b](https://github.com/MapColonies/maps-playground/commit/f3a6f9bf731c800d56d9dd3b7a8adea794b223b1))
* **helm:** rename chart to maps-playground ([#16](https://github.com/MapColonies/maps-playground/issues/16)) ([1efb356](https://github.com/MapColonies/maps-playground/commit/1efb356302234f7aee8218b8c18101aaeb3d30fc))

## [1.1.0](https://github.com/MapColonies/maps-playground/compare/v1.0.0...v1.1.0) (2026-07-19)


### Features

* add helm chart ([#2](https://github.com/MapColonies/maps-playground/issues/2)) ([b74c458](https://github.com/MapColonies/maps-playground/commit/b74c458a8f8f20895882b892e0a79b57425d3415))


### Bug Fixes

* **examples:** use correct syntax for loading 3dtiles in cesium ([ee2952d](https://github.com/MapColonies/maps-playground/commit/ee2952d56134d7f8c44163f0424aa296147697ff))
* **examples:** use correct syntax for loading 3dtiles in cesium ([#10](https://github.com/MapColonies/maps-playground/issues/10)) ([0c8fe74](https://github.com/MapColonies/maps-playground/commit/0c8fe746c3272d035721f114d9e1a5fccde74aad))
* **examples:** wrong parameters used for getting terrain from catalog ([49ab1be](https://github.com/MapColonies/maps-playground/commit/49ab1bee3cce72b46dfed26fa2ab5601411f06f8))

## 1.0.0 (2026-06-15)


### Features

* add optional description for each demo ([1226566](https://github.com/MapColonies/maps-playground/commit/12265660c7a3b3f71eb7ec46e241c9fb39fb7146))
* highlight active demo ([b535188](https://github.com/MapColonies/maps-playground/commit/b5351888bb70c5abb4add771d48fcabe8fb69193))
* replicate real mapcolonies flow ([933f138](https://github.com/MapColonies/maps-playground/commit/933f138b021c90c7ee9eb34ce769aefb6a1e82c0))


### Bug Fixes

* build issue ([ed25196](https://github.com/MapColonies/maps-playground/commit/ed25196ece4c2bd76b2fc0d66c057ce201b7f7e8))
* cesium examples use wrong attributes and types ([cd27b46](https://github.com/MapColonies/maps-playground/commit/cd27b469b493460fd36e3f1f0c5e2c596091ddfb))
* remove prerender ([2f98e21](https://github.com/MapColonies/maps-playground/commit/2f98e21b67f7b8bcd31e288cb1ff9751d744cb68))
* workflow issues ([8477914](https://github.com/MapColonies/maps-playground/commit/847791461518598c139c6e9de3b403cbec33e1ce))
