# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]
### Added
- New linter rules (ESLint, editorConfig)
- New test runner (Karma and TravisCI)
- New build tasks
- Code coverage reporting on unit tests
- Change log
### Removed
- `relatedModel` can no longer be defined as a function when defining `Relational.Model` relations
### Changed
- ES6 Refactor
- Updated QUnit from 1.x to 2.x

## [0.10.0] - 2015-08-19
### Changed
- Fix ordering problems in relations
- `Backbone` 1.2.1 compatible (add `_removeModels` override)

## [0.9.0] - 2014-11-03
### Added
- Add `getIdsToFetch` to `Backbone.RelationalModel`
### Removed
- Removed `fetchRelated` in favor of `getAsync`
### Changed
- `getAsync` (the successor of `fetchRelated`) now return a single promise, instead of an array of request objects.
- [#467](https://github.com/PaulUithol/Backbone-relational/issues/467): Improve lazy loading implementation.

## [0.8.8] - 2014-04-01
### Added
- `Backbone.Relational.store.unregister` now also accepts a collection or a model type
- [#215](https://github.com/PaulUithol/Backbone-relational/issues/215) Add direct support for AMD, CommonJS, require, etc.
### Changed
- [#419](https://github.com/PaulUithol/Backbone-relational/issues/419): Proper return values for single models on collection methods for `Backbone` 1.1.0
- [#427](https://github.com/PaulUithol/Backbone-relational/issues/427): Fix firing explicit `change` events
- [#411](https://github.com/PaulUithol/Backbone-relational/issues/411): Don't add models without an `id` to the store

## [0.8.7] - 2014-01-16
### Added
- Add `findModel`
- [#376](https://github.com/PaulUithol/Backbone-relational/pull/376): Include ids of unregistered models (not fetched or otherwise) in `toJSON`
### Changed
- Change return types for `Collection` methods to match `Backbone` 1.1.0

## [0.8.6] - 2013-08-16
### Added
- [#345](https://github.com/PaulUithol/Backbone-relational/pull/345): Add `find`, a shortcut to `findOrCreate` with `create: false`
- [#345](https://github.com/PaulUithol/Backbone-relational/pull/345): Add lodash compatibility (doesn't have an explicit `findWhere`)
- [#362](https://github.com/PaulUithol/Backbone-relational/pull/362): Add support for deep `subModelType` hierarchies.
- [#370](https://github.com/PaulUithol/Backbone-relational/pull/370): Relations can now be a property or a function.
- `relatedModel` and `collectionType` can now be defined as a function as well.
### Changed
- [#322](https://github.com/PaulUithol/Backbone-relational/pull/322): Remove keySource value after a `set`
- [#349](https://github.com/PaulUithol/Backbone-relational/pull/349): Event ordering: maintain the originally intended order when process gets called more than once.
- [#380](https://github.com/PaulUithol/Backbone-relational/pull/380): Fix pop on an empty collection.

## [0.8.5] - 2013-04-10
### Added
- [#201](https://github.com/PaulUithol/Backbone-relational/issues/201): Added `Backbone.Store.removeModelScope` method
- [#295](https://github.com/PaulUithol/Backbone-relational/issues/295): Check (and error on) duplicate ids when explicitly setting the `idAttribute`
### Changed
- Supports `Backbone` >= 1.0.0
- [#320](https://github.com/PaulUithol/Backbone-relational/issues/320): Use `merge: true` by default on `Collection.reset`
- [#191](https://github.com/PaulUithol/Backbone-relational/issues/191): if `includeInJSON` is equal to the model's `idAttribute`, "missing" models will be included in the JSON to avoid data loss
- [#273](https://github.com/PaulUithol/Backbone-relational/issues/273): Improve merging of relations between super/subModels

## [0.8.0] - 2013-03-06
### Added
- Implemented the `add`, `merge` and `remove` options on `Collection.add` when working with RelationalModels. This also works when using set to change the key on nested relations.
- Added a `parse` option to `relations`
### Removed
- The `update:<key>` event has been removed, in favor of handling everything using "standard" `change:<key>` events.
### Changed
- The update option on `findOrCreate` has been renamed to `merge`, since its behavior corresponds with merge on `Collection.add` (and not with update on `Collection.reset`).
- General performance improvements, refactored `HasMany.onChange` to eliminate unnecessary events.
- `findOrCreate` now takes a `parse` option, analogous to the `Backbone.Model` constructor. It defaults to `false`

## [0.7.1] - 2013-01-17
### Added
- Added the `update` option to `findOrCreate`
- Implemented the `autoFetch` property for `relations`
### Changed
- Compatible with `Backbone` >= 0.9.10

## [0.7.0] - 2012-12-18
### Changed
- Compatible with `Backbone` >= 0.9.9
- [#180](https://github.com/PaulUithol/Backbone-relational/issues/180): no longer allow multiple instances of `RelationalModel` with the same type, and the same `id`

## [0.6.1] - 2012-12-04
### Changed
- [#215](https://github.com/PaulUithol/Backbone-relational/pull/215) Fix export issue with require.js

## [0.6.0] - 2012-08-02
### Added
- `keyDestination` option added to relations
- `collectionOptions` option added to relations
- Added support for super/sub models
- Added `Backbone.Store.addModelScope`
- [#60](https://github.com/PaulUithol/Backbone-relational/issues/60): `keySource` option added to relations

## [0.5.0] - 2012-02-17
### Added
- Support new Backbone syntax for `set` (with separate key, value - arguments)
### Changed
- Update nested models properly on `Collection.add`
- `collectionKey` options added to relations
- Initialize `reverseRelation`s on definition, instead of on creation of the first model

## [0.4.0] - 2011-07-11
### Added
- Added the Backbone.RelationalModel.updateRelations method
### Changed
- update<key> event added
- Override `Backbone.Collection._add` and `Backbone.Collection._remove` so relations update properly
- Queue change and `change:<key>` events, so they won't fire before relations are updated
