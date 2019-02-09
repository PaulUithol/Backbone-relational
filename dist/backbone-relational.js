/**!
 * Backbone Relational v0.10.0 (backbone-relational)
 * ----------------------------------
 * (c) 2011-2019 Paul Uithol and contributors (https://github.com/PaulUithol/Backbone-relational/graphs/contributors)
 * Distributed under MIT license
 *
 * http://backbonerelational.org
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('underscore'), require('backbone'), require('jquery')) :
	typeof define === 'function' && define.amd ? define(['exports', 'underscore', 'backbone', 'jquery'], factory) :
	(factory((global.BackboneRelational = global.BackboneRelational || {}),global._,global.Backbone,global.$));
}(this, (function (exports,_,backbone,$) { 'use strict';

_ = 'default' in _ ? _['default'] : _;
$ = 'default' in $ ? $['default'] : $;

var Semaphore = {
	_permitsAvailable: null,
	_permitsUsed: 0,

	acquire: function acquire() {
		if (this._permitsAvailable && this._permitsUsed >= this._permitsAvailable) {
			throw new Error('Max permits acquired');
		} else {
			this._permitsUsed++;
		}
	},
	release: function release() {
		if (this._permitsUsed === 0) {
			throw new Error('All permits released');
		} else {
			this._permitsUsed--;
		}
	},
	isLocked: function isLocked() {
		return this._permitsUsed > 0;
	},
	setAvailablePermits: function setAvailablePermits(amount) {
		if (this._permitsUsed > amount) {
			throw new Error('Available permits cannot be less than used permits');
		}
		this._permitsAvailable = amount;
	}
};

if (!_.any) {
  _.any = _.some;
  _.all = _.every;
  _.contains = _.includes;
  _.pluck = _.map;
}

function BlockingQueue() {
	this._queue = [];
}

_.extend(BlockingQueue.prototype, Semaphore, {
	_queue: null,

	add: function add(func) {
		if (this.isBlocked()) {
			this._queue.push(func);
		} else {
			func();
		}
	},
	process: function process() {
		var queue = this._queue;
		this._queue = [];
		while (queue && queue.length) {
			queue.shift()();
		}
	},
	block: function block() {
		this.acquire();
	},
	unblock: function unblock() {
		this.release();
		if (!this.isBlocked()) {
			this.process();
		}
	},
	isBlocked: function isBlocked() {
		return this.isLocked();
	}
});

var eventQueue = new BlockingQueue();

var config = {
	showWarnings: true
};

var extend = backbone.Model.extend;

function ExtendableObject() {
  var _initialize;

  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  (_initialize = this.initialize).call.apply(_initialize, [this].concat(args));
}
_.extend(ExtendableObject.prototype, backbone.Events);
ExtendableObject.extend = extend;

var RelationTypeStore = ExtendableObject.extend({
	initialize: function initialize() {
		this.types = {};
	},
	registerType: function registerType(name, Type) {
		this.types[name] = Type;
	},
	unregisterType: function unregisterType(name, Type) {
		if (name in this.types) {
			delete this.types[name];
			return true;
		}
		return false;
	},
	find: function find(name) {
		return this.types[name];
	}
});

var relationTypeStore = new RelationTypeStore();

var Store = ExtendableObject.extend({
	initialize: function initialize() {
		this._collections = [];
		this._reverseRelations = [];
		this._orphanRelations = [];
		this._subModels = [];
		this._modelScopes = [window];
	},
	initializeRelation: function initializeRelation(model, relation, options) {
		var Type = relation.type;

		if (_.isString(Type)) {
			Type = relationTypeStore.find(Type) || this.getObjectByName(Type);
		}

		if (_.isObject(Type)) {
			var relationType = new Type(model, relation, options);
		} else if (config.showWarnings && console) {
			console.warn('Relation=%o; missing or invalid relation type!', relation);
		}
	},
	addModelScope: function addModelScope(scope) {
		this._modelScopes.push(scope);
	},
	removeModelScope: function removeModelScope(scope) {
		this._modelScopes = _.without(this._modelScopes, scope);
	},
	addSubModels: function addSubModels(subModelTypes, superModelType) {
		this._subModels.push({
			superModelType: superModelType,
			subModels: subModelTypes
		});
	},
	setupSuperModel: function setupSuperModel(modelType) {
		var _this = this;

		_.find(this._subModels, function (subModelDef) {
			return _.filter(subModelDef.subModels || [], function (subModelTypeName, typeValue) {
				var subModelType = _this.getObjectByName(subModelTypeName);

				if (modelType === subModelType) {
					subModelDef.superModelType._subModels[typeValue] = modelType;

					modelType._superModel = subModelDef.superModelType;
					modelType._subModelTypeValue = typeValue;
					modelType._subModelTypeAttribute = subModelDef.superModelType.prototype.subModelTypeAttribute;
					return true;
				}
			}).length;
		});
	},
	addReverseRelation: function addReverseRelation(relation) {
		var exists = _.any(this._reverseRelations, function (rel) {
			return _.all(relation || [], function (val, key) {
				return val === rel[key];
			});
		});

		if (!exists && relation.model && relation.type) {
			this._reverseRelations.push(relation);
			this._addRelation(relation.model, relation);
			this.retroFitRelation(relation);
		}
	},
	addOrphanRelation: function addOrphanRelation(relation) {
		var exists = _.any(this._orphanRelations, function (rel) {
			return _.all(relation || [], function (val, key) {
				return val === rel[key];
			});
		});

		if (!exists && relation.model && relation.type) {
			this._orphanRelations.push(relation);
		}
	},
	processOrphanRelations: function processOrphanRelations() {
		var _this2 = this;

		_.each(this._orphanRelations.slice(0), function (rel) {
			var relatedModel = _this2.getObjectByName(rel.relatedModel);
			if (relatedModel) {
				_this2.initializeRelation(null, rel);
				_this2._orphanRelations = _.without(_this2._orphanRelations, rel);
			}
		});
	},
	_addRelation: function _addRelation(type, relation) {
		var _this3 = this;

		if (!type.prototype.relations) {
			type.prototype.relations = [];
		}
		type.prototype.relations.push(relation);

		_.each(type._subModels || [], function (subModel) {
			_this3._addRelation(subModel, relation);
		});
	},
	retroFitRelation: function retroFitRelation(relation) {
		var RelationType = relation.type;


		var coll = this.getCollection(relation.model, false);
		coll && coll.each(_.bind(function (model) {
			if (!(model instanceof relation.model)) {
				return;
			}

			var relationType = new RelationType(model, relation);
		}, this));
	},
	getCollection: function getCollection(type, create) {
		if (type instanceof backbone.Model) {
			type = type.constructor;
		}

		var rootModel = type;
		while (rootModel._superModel) {
			rootModel = rootModel._superModel;
		}

		var coll = _.find(this._collections, function (item) {
			return item.model === rootModel;
		});

		if (!coll && create !== false) {
			coll = this._createCollection(rootModel);
		}

		return coll;
	},
	getObjectByName: function getObjectByName(name) {
		var parts = name.split('.');
		var type = null;

		_.find(this._modelScopes, _.bind(function (scope) {
			type = _.reduce(parts || [], function (memo, val) {
				return memo ? memo[val] : undefined;
			}, scope);

			if (type && type !== scope) {
				return true;
			}
		}, this));

		return type;
	},
	_createCollection: function _createCollection(type) {
		if (!_.isObject(type)) {
			type = type.constructor;
		}

		var coll = new Collection$1();
		coll.model = type;

		this._collections.push(coll);


		return coll;
	},
	resolveIdForItem: function resolveIdForItem(type) {
		var item = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

		if (item === null) {
			return null;
		}

		if (_.isString(item) || _.isNumber(item)) {
			return item;
		}

		return item.id || item[type.prototype.idAttribute] || null;
	},
	find: function find(type, item) {
		var id = this.resolveIdForItem(type, item);
		var coll = this.getCollection(type);

		if (coll) {
			var obj = coll.get(id);

			if (obj instanceof type) {
				return obj;
			}
		}

		return null;
	},
	register: function register(model) {
		var coll = this.getCollection(model);

		if (coll) {
			var modelColl = model.collection;
			coll.add(model);
			model.collection = modelColl;
		}
	},
	checkId: function checkId(model, id) {
		var coll = this.getCollection(model);
		var duplicate = coll && coll.get(id);

		if (duplicate && model !== duplicate) {
			if (config.showWarnings && console) {
				console.warn('Duplicate id! Old RelationalModel=%o, new RelationalModel=%o', duplicate, model);
			}

			throw new Error('Cannot instantiate more than one Backbone.Relational.Model with the same id per type!');
		}
	},
	update: function update(model) {
		var coll = this.getCollection(model);

		if (!coll.contains(model)) {
			this.register(model);
		}

		coll._onModelEvent('change:' + model.idAttribute, model, coll);

		model.trigger('relational:change:id', model, coll);
	},
	unregister: function unregister(type) {
		var _this4 = this;

		var coll = void 0;
		var models = _.clone(type.models);
		if (type.model) {
			coll = this.getCollection(type.model);
		} else {
			coll = this.getCollection(type);
			models = _.clone(coll.models);
		}

		if (type instanceof backbone.Model) {
			models = [type];
		}

		_.each(models, function (model) {
			_this4.stopListening(model);
			_.invoke(model.getRelations(), 'stopListening');
		});

		if (_.contains(this._collections, type)) {
			coll.reset([]);
		} else {
			_.each(models, function (model) {
				if (coll.get(model)) {
					coll.remove(model);
				} else {
					coll.trigger('relational:remove', model, coll);
				}
			});
		}
	},
	reset: function reset() {
		var _this5 = this;

		this.stopListening();

		_.each(this._collections, function (coll) {
			_this5.unregister(coll);
		});

		this._collections = [];
		this._subModels = [];
		this._modelScopes = [window];
	}
});

var store = new Store();

var Relation = ExtendableObject.extend(Semaphore).extend({
	instance: null,
	key: null,
	keyContents: null,
	relatedModel: null,
	relatedCollection: null,
	reverseRelation: null,
	related: null,

	constructor: function constructor(instance, options, opts) {
		this.instance = instance;

		options = _.isObject(options) ? options : {};
		this.reverseRelation = _.defaults(options.reverseRelation || {}, this.options.reverseRelation);
		this.options = _.defaults(options, this.options, {
			createModels: true,
			includeInJSON: true,
			isAutoRelation: false,
			autoFetch: false,
			parse: false
		});

		if (_.isString(this.reverseRelation.type)) {
			this.reverseRelation.type = relationTypeStore.find(this.reverseRelation.type) || store.getObjectByName(this.reverseRelation.type);
		}

		this.key = this.options.key;
		this.keySource = this.options.keySource || this.key;
		this.keyDestination = this.options.keyDestination || this.keySource || this.key;

		this.model = this.options.model || this.instance.constructor;

		this.relatedModel = this.options.relatedModel;

		if (_.isUndefined(this.relatedModel)) {
			this.relatedModel = this.model;
		}

		if (_.isFunction(this.relatedModel) && !(this.relatedModel.prototype instanceof Model$1)) {
			this.relatedModel = _.result(this, 'relatedModel');
		}
		if (_.isString(this.relatedModel)) {
			this.relatedModel = store.getObjectByName(this.relatedModel);
		}

		if (!this.checkPreconditions()) {
			return;
		}

		if (!this.options.isAutoRelation && this.reverseRelation.type && this.reverseRelation.key) {
			store.addReverseRelation(_.defaults({
				isAutoRelation: true,
				model: this.relatedModel,
				relatedModel: this.model,
				reverseRelation: this.options }, this.reverseRelation));
		}

		if (instance) {
			var contentKey = this.keySource;
			if (contentKey !== this.key && _.isObject(this.instance.get(this.key))) {
				contentKey = this.key;
			}

			this.setKeyContents(this.instance.get(contentKey));
			this.relatedCollection = store.getCollection(this.relatedModel);

			if (this.keySource !== this.key) {
				delete this.instance.attributes[this.keySource];
			}

			this.instance._relations[this.key] = this;

			this.initialize(opts);

			if (this.options.autoFetch) {
				this.instance.getAsync(this.key, _.isObject(this.options.autoFetch) ? this.options.autoFetch : {});
			}

			this.listenTo(this.instance, 'destroy', this.destroy).listenTo(this.relatedCollection, 'relational:add relational:change:id', this.tryAddRelated).listenTo(this.relatedCollection, 'relational:remove', this.removeRelated);
		}
	},
	checkPreconditions: function checkPreconditions() {
		var i = this.instance;
		var k = this.key;
		var m = this.model;
		var rm = this.relatedModel;
		var warn = config.showWarnings && typeof console !== 'undefined';

		if (!m || !k || !rm) {
			warn && console.warn('Relation=%o: missing model, key or relatedModel (%o, %o, %o).', this, m, k, rm);
			return false;
		}

		if (!(m.prototype instanceof Model$1)) {
			warn && console.warn('Relation=%o: model does not inherit from Backbone.Relational.Model (%o).', this, i);
			return false;
		}

		if (!(rm.prototype instanceof Model$1)) {
			warn && console.warn('Relation=%o: relatedModel does not inherit from Backbone.Relational.Model (%o).', this, rm);
			return false;
		}

		if (this instanceof relationTypeStore.find('HasMany') && this.reverseRelation.type === relationTypeStore.find('HasMany')) {
			warn && console.warn('Relation=%o: relation is a HasMany, and the reverseRelation is HasMany as well.', this);
			return false;
		}

		if (i && _.keys(i._relations).length) {
			var existing = _.find(i._relations, _.bind(function (rel) {
				return rel.key === k;
			}, this));

			if (existing) {
				warn && console.warn('Cannot create relation=%o on %o for model=%o: already taken by relation=%o.', this, k, i, existing);
				return false;
			}
		}

		return true;
	},
	setRelated: function setRelated(related) {
		this.related = related;
		this.instance.attributes[this.key] = related;
	},
	_isReverseRelation: function _isReverseRelation(relation) {
		return relation.instance instanceof this.relatedModel && this.reverseRelation.key === relation.key && this.key === relation.reverseRelation.key;
	},
	getReverseRelations: function getReverseRelations(model) {
		var reverseRelations = [];

		var models = !_.isUndefined(model) ? [model] : this.related && (this.related.models || [this.related]);
		var relations = null;
		var relation = null;

		for (var i = 0; i < (models || []).length; i++) {
			relations = models[i].getRelations() || [];

			for (var j = 0; j < relations.length; j++) {
				relation = relations[j];

				if (this._isReverseRelation(relation)) {
					reverseRelations.push(relation);
				}
			}
		}

		return reverseRelations;
	},
	destroy: function destroy() {
		var _this = this;

		this.stopListening();

		if (this instanceof relationTypeStore.find('HasOne')) {
			this.setRelated(null);
		} else if (this instanceof relationTypeStore.find('HasMany')) {
			this.setRelated(this._prepareCollection());
		}

		_.each(this.getReverseRelations(), function (relation) {
			relation.removeRelated(_this.instance);
		});
	}
});

var toConsumableArray = function (arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

    return arr2;
  } else {
    return Array.from(arr);
  }
};

var Model$1 = backbone.Model.extend(Semaphore).extend({
	relations: null,
	_relations: null,
	_isInitialized: false,
	_deferProcessing: false,
	_queue: null,
	_attributeChangeFired: false,

	subModelTypeAttribute: 'type',
	subModelTypes: null,

	constructor: function constructor(attributes) {
		var _this = this;

		var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
		var collection = options.collection;

		if (collection) {
			this.collection = collection;

			delete options.collection;

			this._deferProcessing = true;

			var processQueue = function processQueue(model) {
				if (model !== _this) {
					return;
				}

				_this._deferProcessing = false;
				_this.processQueue();
				collection.off('relational:add', processQueue);
			};

			this.listenTo(collection, 'relational:add', processQueue);

			_.defer(function () {
				processQueue(_this);
			});
		}

		store.processOrphanRelations();
		store.listenTo(this, 'relational:unregister', store.unregister);

		this._queue = new BlockingQueue();
		this._queue.block();
		eventQueue.block();

		try {
			backbone.Model.call(this, attributes, options);
		} finally {
			eventQueue.unblock();
		}
	},
	trigger: function trigger(eventName) {
		var _this2 = this;

		var args = _.toArray(arguments);

		if (eventName.length > 5 && eventName.indexOf('change') === 0) {
			if (!eventQueue.isLocked()) {
				var _BBModel$prototype$tr;

				(_BBModel$prototype$tr = backbone.Model.prototype.trigger).call.apply(_BBModel$prototype$tr, [this].concat(toConsumableArray(args)));
			} else {
				eventQueue.add(function () {
					var _BBModel$prototype$tr2;

					var changed = true;
					if (eventName === 'change') {
						changed = _this2.hasChanged() || _this2._attributeChangeFired;
						_this2._attributeChangeFired = false;
					} else {
						var attr = eventName.slice(7);
						var rel = _this2.getRelation(attr);

						if (rel) {
							changed = args[4] === true;

							if (changed) {
								_this2.changed[attr] = args[2];
							} else if (!rel.changed) {
								delete _this2.changed[attr];
							}
						} else if (changed) {
							_this2._attributeChangeFired = true;
						}
					}

					changed && (_BBModel$prototype$tr2 = backbone.Model.prototype.trigger).call.apply(_BBModel$prototype$tr2, [_this2].concat(toConsumableArray(args)));
				});
			}
		} else if (eventName === 'destroy') {
			var _BBModel$prototype$tr3;

			(_BBModel$prototype$tr3 = backbone.Model.prototype.trigger).call.apply(_BBModel$prototype$tr3, [this].concat(toConsumableArray(args)));
			store.unregister(this);
		} else {
			var _BBModel$prototype$tr4;

			(_BBModel$prototype$tr4 = backbone.Model.prototype.trigger).call.apply(_BBModel$prototype$tr4, [this].concat(toConsumableArray(args)));
		}

		return this;
	},
	initializeRelations: function initializeRelations(options) {
		this.acquire();
		this._relations = {};

		_.each(this.relations || [], _.bind(function (rel) {
			store.initializeRelation(this, rel, options);
		}, this));

		this._isInitialized = true;
		this.release();
		this.processQueue();
	},
	updateRelations: function updateRelations(changedAttrs) {
		var _this3 = this;

		var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

		if (this._isInitialized && !this.isLocked()) {
			_.each(this._relations, function (rel) {
				if (!changedAttrs || rel.keySource in changedAttrs || rel.key in changedAttrs) {
					var value = _this3.attributes[rel.keySource] || _this3.attributes[rel.key];
					var attr = changedAttrs && (changedAttrs[rel.keySource] || changedAttrs[rel.key]);

					if (rel.related !== value || value === null && attr === null) {
						_this3.trigger('relational:change:' + rel.key, _this3, value, options);
					}
				}

				if (rel.keySource !== rel.key) {
					delete _this3.attributes[rel.keySource];
				}
			});
		}
	},
	queue: function queue(func) {
		this._queue.add(func);
	},
	processQueue: function processQueue() {
		if (this._isInitialized && !this._deferProcessing && this._queue.isBlocked()) {
			this._queue.unblock();
		}
	},
	getRelation: function getRelation(attr) {
		return this._relations[attr];
	},
	getRelations: function getRelations() {
		return _.values(this._relations);
	},
	getIdsToFetch: function getIdsToFetch(attr) {
		var refresh = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

		var rel = attr instanceof Relation ? attr : this.getRelation(attr);
		var ids = rel ? rel.keyIds && rel.keyIds.slice(0) || (rel.keyId || rel.keyId === 0 ? [rel.keyId] : []) : [];

		if (refresh) {
			var models = rel.related && (rel.related.models || [rel.related]);
			_.each(models, function (model) {
				if (model.id || model.id === 0) {
					ids.push(model.id);
				}
			});
		}

		return ids;
	},
	getAsync: function getAsync(attr, options) {
		var _this4 = this;

		options = _.extend({ add: true, remove: false, refresh: false }, options);

		var requests = [];
		var rel = this.getRelation(attr);
		var idsToFetch = rel && this.getIdsToFetch(rel, options.refresh);
		var coll = rel.related instanceof Collection$1 ? rel.related : rel.relatedCollection;

		if (idsToFetch && idsToFetch.length) {
			var createModels = function createModels() {
				models = _.map(idsToFetch, function (id) {
					var model = rel.relatedModel.findModel(id);

					if (!model) {
						var attrs = {};
						attrs[rel.relatedModel.prototype.idAttribute] = id;
						model = rel.relatedModel.findOrCreate(attrs, options);
						createdModels.push(model);
					}

					return model;
				});
			};

			var models = [];
			var createdModels = [];
			var setUrl = void 0;
			

			if (coll instanceof Collection$1 && _.isFunction(coll.url)) {
				var defaultUrl = coll.url();
				setUrl = coll.url(idsToFetch);

				if (setUrl === defaultUrl) {
					createModels();
					setUrl = coll.url(models);

					if (setUrl === defaultUrl) {
						setUrl = null;
					}
				}
			}

			if (setUrl) {
				var opts = _.defaults({
					url: setUrl,
					error: function error() {
						_.each(createdModels, function (model) {
							model.trigger('destroy', model, model.collection, options);
						});

						if (options.error) {
							var _options$error;

							for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
								args[_key] = arguments[_key];
							}

							(_options$error = options.error).call.apply(_options$error, [this].concat(args));
						}
					}
				}, options);

				requests = [coll.fetch(opts)];
			} else {
				if (!models.length) {
					createModels();
				}

				requests = _.map(models, _.bind(function (model) {
					var opts = _.defaults({
						error: function error() {
							if (_.contains(createdModels, model)) {
								model.trigger('destroy', model, model.collection, options);
							}

							if (options.error) {
								var _options$error2;

								for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
									args[_key2] = arguments[_key2];
								}

								(_options$error2 = options.error).call.apply(_options$error2, [this].concat(args));
							}
						}
					}, options);

					return model.fetch(opts);
				}, this));
			}
		}

		return this.deferArray(requests).then(function () {
			return backbone.Model.prototype.get.call(_this4, attr);
		});
	},
	deferArray: function deferArray(_deferArray) {
		return $.when.apply($, toConsumableArray(_deferArray));
	},
	set: function set$$1(key, value, options) {
		var args = _.toArray(arguments);

		eventQueue.block();

		var attributes = void 0;
		var result = void 0;

		if (_.isObject(key) || key == null) {
			attributes = key;
			options = value;
		} else {
			attributes = {};
			attributes[key] = value;
		}

		try {
			var _BBModel$prototype$se;

			var id = this.id;
			var newId = attributes && this.idAttribute in attributes && attributes[this.idAttribute];

			store.checkId(this, newId);

			result = (_BBModel$prototype$se = backbone.Model.prototype.set).call.apply(_BBModel$prototype$se, [this].concat(toConsumableArray(args)));

			if (!this._isInitialized && !this.isLocked()) {
				this.constructor.initializeModelHierarchy();

				if (newId || newId === 0) {
					store.register(this);
				}

				this.initializeRelations(options);
			} else if (newId && newId !== id) {
				store.update(this);
			}

			if (attributes) {
				this.updateRelations(attributes, options);
			}
		} finally {
			eventQueue.unblock();
		}

		return result;
	},
	clone: function clone() {
		var attributes = _.clone(this.attributes);
		if (!_.isUndefined(attributes[this.idAttribute])) {
			attributes[this.idAttribute] = null;
		}

		_.each(this.getRelations(), function (rel) {
			delete attributes[rel.key];
		});

		return new this.constructor(attributes);
	},
	toJSON: function toJSON(options) {
		if (this.isLocked()) {
			return this.id;
		}

		this.acquire();
		var json = backbone.Model.prototype.toJSON.call(this, options);

		if (this.constructor._superModel && !(this.constructor._subModelTypeAttribute in json)) {
			json[this.constructor._subModelTypeAttribute] = this.constructor._subModelTypeValue;
		}

		_.each(this._relations, function (rel) {
			var related = json[rel.key];
			var includeInJSON = rel.options.includeInJSON;
			var value = null;

			if (includeInJSON === true) {
				if (related && _.isFunction(related.toJSON)) {
					value = related.toJSON(options);
				}
			} else if (_.isString(includeInJSON)) {
				if (related instanceof Collection$1) {
					value = related.pluck(includeInJSON);
				} else if (related instanceof backbone.Model) {
					value = related.get(includeInJSON);
				}

				if (includeInJSON === rel.relatedModel.prototype.idAttribute) {
					if (rel instanceof relationTypeStore.find('HasMany')) {
						value = value.concat(rel.keyIds);
					} else if (rel instanceof relationTypeStore.find('HasOne')) {
						value = value || rel.keyId;

						if (!value && !_.isObject(rel.keyContents)) {
							value = rel.keyContents || null;
						}
					}
				}
			} else if (_.isArray(includeInJSON)) {
				if (related instanceof Collection$1) {
					value = [];
					related.each(function (model) {
						var curJson = {};
						_.each(includeInJSON, function (key) {
							curJson[key] = model.get(key);
						});
						value.push(curJson);
					});
				} else if (related instanceof backbone.Model) {
					value = {};
					_.each(includeInJSON, function (key) {
						value[key] = related.get(key);
					});
				}
			} else {
				delete json[rel.key];
			}

			if (value === null && options && options.wait) {
				value = related;
			}

			if (includeInJSON) {
				json[rel.keyDestination] = value;
			}

			if (rel.keyDestination !== rel.key) {
				delete json[rel.key];
			}
		});

		this.release();
		return json;
	}
}, {
	setup: function setup(superModel) {
		var _this5 = this;

		this.prototype.relations = (this.prototype.relations || []).slice(0);

		this._subModels = {};
		this._superModel = null;

		if (this.prototype.hasOwnProperty('subModelTypes')) {
			store.addSubModels(this.prototype.subModelTypes, this);
		} else {
			this.prototype.subModelTypes = null;
		}

		_.each(this.prototype.relations || [], function (rel) {
			if (!rel.model) {
				rel.model = _this5;
			}

			if (rel.reverseRelation && rel.model === _this5) {
				var preInitialize = true;
				if (_.isString(rel.relatedModel)) {
					var relatedModel = store.getObjectByName(rel.relatedModel);
					preInitialize = relatedModel && relatedModel.prototype instanceof _this5;
				}

				if (preInitialize) {
					store.initializeRelation(null, rel);
				} else if (_.isString(rel.relatedModel)) {
					store.addOrphanRelation(rel);
				}
			}
		});

		return this;
	},
	build: function build(attributes, options) {
		this.initializeModelHierarchy();

		var Model$$1 = this._findSubModelType(this, attributes) || this;

		return new Model$$1(attributes, options);
	},
	_findSubModelType: function _findSubModelType(type, attributes) {
		if (type._subModels && type.prototype.subModelTypeAttribute in attributes) {
			var subModelTypeAttribute = attributes[type.prototype.subModelTypeAttribute];
			var subModelType = type._subModels[subModelTypeAttribute];
			if (subModelType) {
				return subModelType;
			} else {
				for (subModelTypeAttribute in type._subModels) {
					subModelType = this._findSubModelType(type._subModels[subModelTypeAttribute], attributes);
					if (subModelType) {
						return subModelType;
					}
				}
			}
		}
		return null;
	},
	initializeModelHierarchy: function initializeModelHierarchy() {
		this.inheritRelations();

		if (this.prototype.subModelTypes) {
			var resolvedSubModels = _.keys(this._subModels);
			var unresolvedSubModels = _.omit(this.prototype.subModelTypes, resolvedSubModels);
			_.each(unresolvedSubModels, function (subModelTypeName) {
				var subModelType = store.getObjectByName(subModelTypeName);
				subModelType && subModelType.initializeModelHierarchy();
			});
		}
	},
	inheritRelations: function inheritRelations() {
		if (!_.isUndefined(this._superModel) && !_.isNull(this._superModel)) {
			return;
		}

		store.setupSuperModel(this);

		if (this._superModel) {
			this._superModel.inheritRelations();
			if (this._superModel.prototype.relations) {
				var inheritedRelations = _.filter(this._superModel.prototype.relations || [], _.bind(function (superRel) {
					return !_.any(this.prototype.relations || [], _.bind(function (rel) {
						return superRel.relatedModel === rel.relatedModel && superRel.key === rel.key;
					}, this));
				}, this));

				this.prototype.relations = inheritedRelations.concat(this.prototype.relations);
			}
		} else {
			this._superModel = false;
		}
	},
	findOrCreate: function findOrCreate(attributes, options) {
		options || (options = {});
		var parsedAttributes = _.isObject(attributes) && options.parse && this.prototype.parse ? this.prototype.parse(_.clone(attributes), options) : attributes;

		var model = this.findModel(parsedAttributes);

		if (_.isObject(attributes)) {
			if (model && options.merge !== false) {
				delete options.collection;
				delete options.url;

				model.set(parsedAttributes, options);
			} else if (!model && options.create !== false) {
				model = this.build(parsedAttributes, _.defaults({ parse: false }, options));
			}
		}

		return model;
	},
	find: function find(attributes, options) {
		options || (options = {});
		options.create = false;
		return this.findOrCreate(attributes, options);
	},
	findModel: function findModel(attributes) {
		return store.find(this, attributes);
	},
	extend: function extend(protoProps, classProps) {
		var child = backbone.Model.extend.call(this, protoProps, classProps);
		child.setup(this);
		return child;
	}
});

var Collection$1 = backbone.Collection.extend({
	_prepareModel: function _prepareModel(attrs, options) {
		var model = void 0;

		if (attrs instanceof backbone.Model) {
			if (!attrs.collection) {
				attrs.collection = this;
			}
			model = attrs;
		} else {
			options = options ? _.clone(options) : {};
			options.collection = this;

			if (typeof this.model.findOrCreate !== 'undefined') {
				model = this.model.findOrCreate(attrs, options);
			} else {
				var TargetModel = this.model;
				model = new TargetModel(attrs, options);
			}

			if (model && model.validationError) {
				this.trigger('invalid', this, attrs, options);
				model = false;
			}
		}

		return model;
	},
	set: function set$$1(models, options) {
		if (!this.model.prototype instanceof Model$1) {
			return backbone.Collection.prototype.set.call(this, models, options);
		}

		if (options && options.parse) {
			models = this.parse(models, options);
		}

		var singular = !_.isArray(models);
		var newModels = [];
		var toAdd = [];
		var model = null;

		models = singular ? models ? [models] : [] : _.clone(models);

		for (var i = 0; i < models.length; i++) {
			model = models[i];
			if (!(model instanceof backbone.Model)) {
				model = this._prepareModel(model, options);
			}

			if (model) {
				toAdd.push(model);

				if (!(this.get(model) || this.get(model.cid))) {
					newModels.push(model);
				} else if (model.id != null) {
					this._byId[model.id] = model;
				}
			}
		}

		toAdd = singular ? toAdd.length ? toAdd[0] : null : toAdd;
		var result = backbone.Collection.prototype.set.call(this, toAdd, _.defaults({ merge: false, parse: false }, options));

		for (var _i = 0; _i < newModels.length; _i++) {
			model = newModels[_i];

			if (this.get(model) || this.get(model.cid)) {
				this.trigger('relational:add', model, this, options);
			}
		}

		return result;
	},
	trigger: function trigger(eventName) {
		var _this = this;

		var args = _.toArray(arguments);

		if (!(this.model.prototype instanceof Model$1)) {
			var _BBCollection$prototy;

			return (_BBCollection$prototy = backbone.Collection.prototype.trigger).call.apply(_BBCollection$prototy, [this].concat(toConsumableArray(args)));
		}

		if (eventName === 'add' || eventName === 'remove' || eventName === 'reset' || eventName === 'sort') {
			if (_.isObject(args[3])) {
				args[3] = _.clone(args[3]);
			}

			eventQueue.add(function () {
				var _BBCollection$prototy2;

				(_BBCollection$prototy2 = backbone.Collection.prototype.trigger).call.apply(_BBCollection$prototy2, [_this].concat(toConsumableArray(args)));
			});
		} else {
			var _BBCollection$prototy3;

			(_BBCollection$prototy3 = backbone.Collection.prototype.trigger).call.apply(_BBCollection$prototy3, [this].concat(toConsumableArray(args)));
		}

		return this;
	},
	sort: function sort(options) {
		var result = backbone.Collection.prototype.sort.call(this, options);

		if (this.model.prototype instanceof Model$1) {
			this.trigger('relational:reset', this, options);
		}

		return result;
	},
	reset: function reset(models, options) {
		options = _.extend({ merge: true }, options);
		var result = backbone.Collection.prototype.reset.call(this, models, options);

		if (this.model.prototype instanceof Model$1) {
			this.trigger('relational:reset', this, options);
		}

		return result;
	},
	_removeModels: function _removeModels(models, options) {
		var _this2 = this;

		var toRemove = [];

		_.each(models, function (model) {
			model = _this2.get(model) || model && _this2.get(model.cid);
			model && toRemove.push(model);
		});

		var result = backbone.Collection.prototype._removeModels.call(this, toRemove, options);

		_.each(toRemove, function (model) {
			_this2.trigger('relational:remove', model, _this2, options);
		});

		return result;
	}
});

var HasOne = Relation.extend({
	options: {
		reverseRelation: { type: 'HasMany' }
	},

	initialize: function initialize(opts) {
		var _this = this;

		this.listenTo(this.instance, 'relational:change:' + this.key, this.onChange);

		var related = this.findRelated(opts);
		this.setRelated(related);

		_.each(this.getReverseRelations(), function (relation) {
			relation.addRelated(_this.instance, opts);
		});
	},
	findRelated: function findRelated(options) {
		var related = null;

		options = _.defaults({ parse: this.options.parse }, options);

		if (this.keyContents instanceof this.relatedModel) {
			related = this.keyContents;
		} else if (this.keyContents || this.keyContents === 0) {
			var opts = _.defaults({ create: this.options.createModels }, options);
			related = this.relatedModel.findOrCreate(this.keyContents, opts);
		}

		if (related) {
			this.keyId = null;
		}

		return related;
	},
	setKeyContents: function setKeyContents(keyContents) {
		this.keyContents = keyContents;
		this.keyId = store.resolveIdForItem(this.relatedModel, this.keyContents);
	},
	onChange: function onChange(model, attr, options) {
		var _this2 = this;

		if (this.isLocked()) {
			return;
		}
		this.acquire();
		options = options ? _.clone(options) : {};

		var changed = _.isUndefined(options.__related);
		var oldRelated = changed ? this.related : options.__related;

		if (changed) {
			this.setKeyContents(attr);
			var related = this.findRelated(options);
			this.setRelated(related);
		}

		if (oldRelated && this.related !== oldRelated) {
			_.each(this.getReverseRelations(oldRelated), function (relation) {
				relation.removeRelated(_this2.instance, null, options);
			});
		}

		_.each(this.getReverseRelations(), function (relation) {
			relation.addRelated(_this2.instance, options);
		});

		if (!options.silent && this.related !== oldRelated) {
			this.changed = true;
			eventQueue.add(function () {
				_this2.instance.trigger('change:' + _this2.key, _this2.instance, _this2.related, options, true);
				_this2.changed = false;
			});
		}
		this.release();
	},
	tryAddRelated: function tryAddRelated(model, coll, options) {
		if ((this.keyId || this.keyId === 0) && model.id === this.keyId) {
			this.addRelated(model, options);
			this.keyId = null;
		}
	},
	addRelated: function addRelated(model, options) {
		var _this3 = this;

		model.queue(function () {
			if (model !== _this3.related) {
				var oldRelated = _this3.related || null;
				_this3.setRelated(model);
				_this3.onChange(_this3.instance, model, _.defaults({ __related: oldRelated }, options));
			}
		});
	},
	removeRelated: function removeRelated(model, coll, options) {
		if (!this.related) {
			return;
		}

		if (model === this.related) {
			var oldRelated = this.related || null;
			this.setRelated(null);
			this.onChange(this.instance, model, _.defaults({ __related: oldRelated }, options));
		}
	}
});

var HasMany = Relation.extend({
	collectionType: null,

	options: {
		reverseRelation: { type: 'HasOne' },
		collectionType: Collection$1,
		collectionKey: true,
		collectionOptions: {}
	},

	initialize: function initialize(opts) {
		this.listenTo(this.instance, 'relational:change:' + this.key, this.onChange);

		this.collectionType = this.options.collectionType;
		if (_.isFunction(this.collectionType) && this.collectionType !== Collection$1 && !(this.collectionType.prototype instanceof Collection$1)) {
			this.collectionType = _.result(this, 'collectionType');
		}
		if (_.isString(this.collectionType)) {
			this.collectionType = store.getObjectByName(this.collectionType);
		}
		if (this.collectionType !== Collection$1 && !(this.collectionType.prototype instanceof Collection$1)) {
			throw new Error('`collectionType` must inherit from Collection');
		}

		var related = this.findRelated(opts);
		this.setRelated(related);
	},
	_prepareCollection: function _prepareCollection(collection) {
		if (this.related) {
			this.stopListening(this.related);
		}

		if (!collection || !(collection instanceof Collection$1)) {
			var options = _.isFunction(this.options.collectionOptions) ? this.options.collectionOptions(this.instance) : this.options.collectionOptions;

			collection = new this.collectionType(null, options);
		}

		collection.model = this.relatedModel;

		if (this.options.collectionKey) {
			var key = this.options.collectionKey === true ? this.options.reverseRelation.key : this.options.collectionKey;

			if (collection[key] && collection[key] !== this.instance) {
				if (config.showWarnings && typeof console !== 'undefined') {
					console.warn('Relation=%o; collectionKey=%s already exists on collection=%o', this, key, this.options.collectionKey);
				}
			} else if (key) {
				collection[key] = this.instance;
			}
		}

		this.listenTo(collection, 'relational:add', this.handleAddition).listenTo(collection, 'relational:remove', this.handleRemoval).listenTo(collection, 'relational:reset', this.handleReset);

		return collection;
	},
	findRelated: function findRelated(options) {
		var _this = this;

		var related = null;

		options = _.defaults({ parse: this.options.parse }, options);

		if (this.keyContents instanceof Collection$1) {
			this._prepareCollection(this.keyContents);
			related = this.keyContents;
		} else {
			var toAdd = [];

			_.each(this.keyContents, function (attributes) {
				var model = null;

				if (attributes instanceof _this.relatedModel) {
					model = attributes;
				} else {
					model = _.isObject(attributes) && options.parse && _this.relatedModel.prototype.parse ? _this.relatedModel.prototype.parse(_.clone(attributes), options) : attributes;
				}

				model && toAdd.push(model);
			});

			if (this.related instanceof Collection$1) {
				related = this.related;
			} else {
				related = this._prepareCollection();
			}

			related.set(toAdd, _.defaults({ parse: false }, options));
		}

		this.keyIds = _.difference(this.keyIds, _.pluck(related.models, 'id'));

		return related;
	},
	setKeyContents: function setKeyContents(keyContents) {
		var _this2 = this;

		this.keyContents = keyContents instanceof Collection$1 ? keyContents : null;
		this.keyIds = [];

		if (!this.keyContents && (keyContents || keyContents === 0)) {
			this.keyContents = _.isArray(keyContents) ? keyContents : [keyContents];

			_.each(this.keyContents, function (item) {
				var itemId = store.resolveIdForItem(_this2.relatedModel, item);
				if (itemId || itemId === 0) {
					_this2.keyIds.push(itemId);
				}
			});
		}
	},
	onChange: function onChange(model, attr, options) {
		var _this3 = this;

		options = options ? _.clone(options) : {};
		this.setKeyContents(attr);
		this.changed = false;

		var related = this.findRelated(options);
		this.setRelated(related);

		if (!options.silent) {
			eventQueue.add(function () {
				if (_this3.changed) {
					_this3.instance.trigger('change:' + _this3.key, _this3.instance, _this3.related, options, true);
					_this3.changed = false;
				}
			});
		}
	},
	handleAddition: function handleAddition(model, coll, options) {
		var _this4 = this;

		options = options ? _.clone(options) : {};
		this.changed = true;

		_.each(this.getReverseRelations(model), function (relation) {
			relation.addRelated(_this4.instance, options);
		});

		!options.silent && eventQueue.add(function () {
			_this4.instance.trigger('add:' + _this4.key, model, _this4.related, options);
		});
	},
	handleRemoval: function handleRemoval(model, coll, options) {
		var _this5 = this;

		options = options ? _.clone(options) : {};
		this.changed = true;

		_.each(this.getReverseRelations(model), _.bind(function (relation) {
			relation.removeRelated(this.instance, null, options);
		}, this));

		!options.silent && eventQueue.add(function () {
			_this5.instance.trigger('remove:' + _this5.key, model, _this5.related, options);
		});
	},
	handleReset: function handleReset(coll, options) {
		var _this6 = this;

		options = options ? _.clone(options) : {};
		!options.silent && eventQueue.add(function () {
			_this6.instance.trigger('reset:' + _this6.key, _this6.related, options);
		});
	},
	tryAddRelated: function tryAddRelated(model, coll, options) {
		var item = _.contains(this.keyIds, model.id);

		if (item) {
			this.addRelated(model, options);
			this.keyIds = _.without(this.keyIds, model.id);
		}
	},
	addRelated: function addRelated(model, options) {
		var _this7 = this;

		model.queue(function () {
			if (_this7.related && !_this7.related.get(model)) {
				_this7.related.add(model, _.defaults({ parse: false }, options));
			}
		});
	},
	removeRelated: function removeRelated(model, coll, options) {
		if (this.related.get(model)) {
			this.related.remove(model, options);
		}
	}
});

relationTypeStore.registerType('HasOne', HasOne);
relationTypeStore.registerType('HasMany', HasMany);

exports.Collection = Collection$1;
exports.Model = Model$1;
exports.Semaphore = Semaphore;
exports.BlockingQueue = BlockingQueue;
exports.eventQueue = eventQueue;
exports.Store = Store;
exports.store = store;
exports.relationTypeStore = relationTypeStore;
exports.Relation = Relation;
exports.HasOne = HasOne;
exports.HasMany = HasMany;
exports.config = config;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=backbone-relational.js.map
