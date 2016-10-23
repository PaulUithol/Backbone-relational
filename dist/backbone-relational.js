/**!
 * Backbone Relational v0.10.0 (backbone-relational)
 * ----------------------------------
 * (c) 2011-2016 Paul Uithol and contributors (https://github.com/PaulUithol/Backbone-relational/graphs/contributors)
 * Distributed under MIT license
 *
 * http://backbonerelational.org
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('backbone'), require('underscore'), require('jquery')) :
  typeof define === 'function' && define.amd ? define(['backbone', 'underscore', 'jquery'], factory) :
  (global.BackboneRelational = factory(global.Backbone,global._,global.$));
}(this, (function (Backbone,_,$) { 'use strict';

var Backbone__default = 'default' in Backbone ? Backbone['default'] : Backbone;
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

var BlockingQueue = function BlockingQueue() {
	this._queue = [];
};

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

var extend$1 = Backbone.Model.extend;

var Events = Backbone__default.Events;

var extendableObject = function extendableObject() {
  var _initialize;

  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  (_initialize = this.initialize).call.apply(_initialize, [this].concat(args));
};
_.extend(extendableObject.prototype, Events);
extendableObject.extend = extend$1;

var config = {
  showWarnings: true
};

var Collection$1 = Backbone.Collection.extend({
	_prepareModel: function _prepareModel(attrs, options) {
		var model;

		if (attrs instanceof Backbone.Model) {
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
				model = new this.model(attrs, options);
			}

			if (model && model.validationError) {
				this.trigger('invalid', this, attrs, options);
				model = false;
			}
		}

		return model;
	},

	set: function set(models, options) {

		if (options && options.parse) {
			models = this.parse(models, options);
		}

		var singular = !_.isArray(models),
		    newModels = [],
		    toAdd = [],
		    model = null;

		models = singular ? models ? [models] : [] : _.clone(models);

		for (var i = 0; i < models.length; i++) {
			model = models[i];
			if (!(model instanceof Backbone.Model)) {
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
		var result = Backbone.Collection.prototype.set.call(this, toAdd, _.defaults({ merge: false, parse: false }, options));

		for (i = 0; i < newModels.length; i++) {
			model = newModels[i];

			if (this.get(model) || this.get(model.cid)) {
				this.trigger('relational:add', model, this, options);
			}
		}

		return result;
	},

	trigger: function trigger(eventName) {

		if (eventName === 'add' || eventName === 'remove' || eventName === 'reset' || eventName === 'sort') {
			var dit = this,
			    args = arguments;

			if (_.isObject(args[3])) {
				args = _.toArray(args);

				args[3] = _.clone(args[3]);
			}

			eventQueue.add(function () {
				Backbone.Collection.prototype.trigger.apply(dit, args);
			});
		} else {
			Backbone.Collection.prototype.trigger.apply(this, arguments);
		}

		return this;
	},

	sort: function sort(options) {
		var result = Backbone.Collection.prototype.sort.call(this, options);

		this.trigger('relational:reset', this, options);


		return result;
	},

	reset: function reset(models, options) {
		options = _.extend({ merge: true }, options);
		var result = Backbone.Collection.prototype.reset.call(this, models, options);

		this.trigger('relational:reset', this, options);


		return result;
	},

	_removeModels: function _removeModels(models, options) {

		var toRemove = [];

		_.each(models, function (model) {
			model = this.get(model) || model && this.get(model.cid);
			model && toRemove.push(model);
		}, this);

		var result = Backbone.Collection.prototype._removeModels.call(this, toRemove, options);

		_.each(toRemove, function (model) {
			this.trigger('relational:remove', model, this, options);
		}, this);

		return result;
	}
});

var RelationTypeStore = extendableObject.extend({
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

var Store = extendableObject.extend({
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
		_.find(this._subModels, function (subModelDef) {
			return _.filter(subModelDef.subModels || [], function (subModelTypeName, typeValue) {
				var subModelType = this.getObjectByName(subModelTypeName);

				if (modelType === subModelType) {
					subModelDef.superModelType._subModels[typeValue] = modelType;

					modelType._superModel = subModelDef.superModelType;
					modelType._subModelTypeValue = typeValue;
					modelType._subModelTypeAttribute = subModelDef.superModelType.prototype.subModelTypeAttribute;
					return true;
				}
			}, this).length;
		}, this);
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
		_.each(this._orphanRelations.slice(0), function (rel) {
			var relatedModel = this.getObjectByName(rel.relatedModel);
			if (relatedModel) {
				this.initializeRelation(null, rel);
				this._orphanRelations = _.without(this._orphanRelations, rel);
			}
		}, this);
	},

	_addRelation: function _addRelation(type, relation) {
		if (!type.prototype.relations) {
			type.prototype.relations = [];
		}
		type.prototype.relations.push(relation);

		_.each(type._subModels || [], function (subModel) {
			this._addRelation(subModel, relation);
		}, this);
	},

	retroFitRelation: function retroFitRelation(relation) {
		var RelationType = relation.type;


		var coll = this.getCollection(relation.model, false);
		coll && coll.each(function (model) {
			if (!(model instanceof relation.model)) {
				return;
			}

			var relationType = new RelationType(model, relation);
		}, this);
	},

	getCollection: function getCollection(type, create) {
		if (type instanceof Backbone.Model) {
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
		var parts = name.split('.'),
		    type = null;

		_.find(this._modelScopes, function (scope) {
			type = _.reduce(parts || [], function (memo, val) {
				return memo ? memo[val] : undefined;
			}, scope);

			if (type && type !== scope) {
				return true;
			}
		}, this);

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
		var id = this.resolveIdForItem(type, item),
		    coll = this.getCollection(type);

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
		var coll = this.getCollection(model),
		    duplicate = coll && coll.get(id);

		if (duplicate && model !== duplicate) {
			if (config.showWarnings && console) {
				console.warn('Duplicate id! Old RelationalModel=%o, new RelationalModel=%o', duplicate, model);
			}

			throw new Error("Cannot instantiate more than one Backbone.Relational.Model with the same id per type!");
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
		var coll = void 0;
		var models = _.clone(type.models);
		if (type.model) {
			coll = this.getCollection(type.model);
		} else {
			coll = this.getCollection(type);
			models = _.clone(coll.models);
		}

		if (type instanceof Backbone.Model) {
			models = [type];
		}

		_.each(models, function (model) {
			this.stopListening(model);
			_.invoke(model.getRelations(), 'stopListening');
		}, this);

		if (_.contains(this._collections, type)) {
			coll.reset([]);
		} else {
			_.each(models, function (model) {
				if (coll.get(model)) {
					coll.remove(model);
				} else {
					coll.trigger('relational:remove', model, coll);
				}
			}, this);
		}
	},

	reset: function reset() {
		this.stopListening();

		_.each(this._collections, function (coll) {
			this.unregister(coll);
		}, this);

		this._collections = [];
		this._subModels = [];
		this._modelScopes = [window];
	}
});

var store = new Store();

var Relation = extendableObject.extend(Semaphore).extend({
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
		var i = this.instance,
		    k = this.key,
		    m = this.model,
		    rm = this.relatedModel,
		    warn = config.showWarnings && typeof console !== 'undefined';

		if (!m || !k || !rm) {
			warn && console.warn('Relation=%o: missing model, key or relatedModel (%o, %o, %o).', this, m, k, rm);
			return false;
		}

		if (this instanceof relationTypeStore.find('HasMany') && this.reverseRelation.type === relationTypeStore.find('HasMany')) {
			warn && console.warn('Relation=%o: relation is a HasMany, and the reverseRelation is HasMany as well.', this);
			return false;
		}

		if (i && _.keys(i._relations).length) {
			var existing = _.find(i._relations, function (rel) {
				return rel.key === k;
			}, this);

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

		var models = !_.isUndefined(model) ? [model] : this.related && (this.related.models || [this.related]),
		    relations = null,
		    relation = null;

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
		this.stopListening();

		if (this instanceof relationTypeStore.find('HasOne')) {
			this.setRelated(null);
		} else if (this instanceof relationTypeStore.find('HasMany')) {
			this.setRelated(this._prepareCollection());
		}

		_.each(this.getReverseRelations(), function (relation) {
			relation.removeRelated(this.instance);
		}, this);
	}
});

var HasOne = Relation.extend({
	options: {
		reverseRelation: { type: 'HasMany' }
	},

	initialize: function initialize(opts) {
		this.listenTo(this.instance, 'relational:change:' + this.key, this.onChange);

		var related = this.findRelated(opts);
		this.setRelated(related);

		_.each(this.getReverseRelations(), function (relation) {
			relation.addRelated(this.instance, opts);
		}, this);
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
		if (this.isLocked()) {
			return;
		}
		this.acquire();
		options = options ? _.clone(options) : {};

		var changed = _.isUndefined(options.__related),
		    oldRelated = changed ? this.related : options.__related;

		if (changed) {
			this.setKeyContents(attr);
			var related = this.findRelated(options);
			this.setRelated(related);
		}

		if (oldRelated && this.related !== oldRelated) {
			_.each(this.getReverseRelations(oldRelated), function (relation) {
				relation.removeRelated(this.instance, null, options);
			}, this);
		}

		_.each(this.getReverseRelations(), function (relation) {
			relation.addRelated(this.instance, options);
		}, this);

		if (!options.silent && this.related !== oldRelated) {
			var dit = this;
			this.changed = true;
			eventQueue.add(function () {
				dit.instance.trigger('change:' + dit.key, dit.instance, dit.related, options, true);
				dit.changed = false;
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
		var dit = this;
		model.queue(function () {
			if (model !== dit.related) {
				var oldRelated = dit.related || null;
				dit.setRelated(model);
				dit.onChange(dit.instance, model, _.defaults({ __related: oldRelated }, options));
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
		var related = null;

		options = _.defaults({ parse: this.options.parse }, options);

		if (this.keyContents instanceof Collection$1) {
			this._prepareCollection(this.keyContents);
			related = this.keyContents;
		} else {
				var toAdd = [];

				_.each(this.keyContents, function (attributes) {
					var model = null;

					if (attributes instanceof this.relatedModel) {
						model = attributes;
					} else {
						model = _.isObject(attributes) && options.parse && this.relatedModel.prototype.parse ? this.relatedModel.prototype.parse(_.clone(attributes), options) : attributes;
					}

					model && toAdd.push(model);
				}, this);

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
		this.keyContents = keyContents instanceof Collection$1 ? keyContents : null;
		this.keyIds = [];

		if (!this.keyContents && (keyContents || keyContents === 0)) {
			this.keyContents = _.isArray(keyContents) ? keyContents : [keyContents];

			_.each(this.keyContents, function (item) {
				var itemId = store.resolveIdForItem(this.relatedModel, item);
				if (itemId || itemId === 0) {
					this.keyIds.push(itemId);
				}
			}, this);
		}
	},

	onChange: function onChange(model, attr, options) {
		options = options ? _.clone(options) : {};
		this.setKeyContents(attr);
		this.changed = false;

		var related = this.findRelated(options);
		this.setRelated(related);

		if (!options.silent) {
			var dit = this;
			eventQueue.add(function () {
				if (dit.changed) {
					dit.instance.trigger('change:' + dit.key, dit.instance, dit.related, options, true);
					dit.changed = false;
				}
			});
		}
	},

	handleAddition: function handleAddition(model, coll, options) {
		options = options ? _.clone(options) : {};
		this.changed = true;

		_.each(this.getReverseRelations(model), function (relation) {
			relation.addRelated(this.instance, options);
		}, this);

		var dit = this;
		!options.silent && eventQueue.add(function () {
			dit.instance.trigger('add:' + dit.key, model, dit.related, options);
		});
	},

	handleRemoval: function handleRemoval(model, coll, options) {
		options = options ? _.clone(options) : {};
		this.changed = true;

		_.each(this.getReverseRelations(model), function (relation) {
			relation.removeRelated(this.instance, null, options);
		}, this);

		var dit = this;
		!options.silent && eventQueue.add(function () {
			dit.instance.trigger('remove:' + dit.key, model, dit.related, options);
		});
	},

	handleReset: function handleReset(coll, options) {
		var dit = this;
		options = options ? _.clone(options) : {};
		!options.silent && eventQueue.add(function () {
			dit.instance.trigger('reset:' + dit.key, dit.related, options);
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
		var dit = this;
		model.queue(function () {
			if (dit.related && !dit.related.get(model)) {
				dit.related.add(model, _.defaults({ parse: false }, options));
			}
		});
	},

	removeRelated: function removeRelated(model, coll, options) {
		if (this.related.get(model)) {
			this.related.remove(model, options);
		}
	}
});

var Model$1 = Backbone.Model.extend(Semaphore).extend({
	relations: null,
	_relations: null,
	_isInitialized: false,
	_deferProcessing: false,
	_queue: null,
	_attributeChangeFired: false,

	subModelTypeAttribute: 'type',
	subModelTypes: null,

	constructor: function constructor(attributes, options) {
		if (options && options.collection) {
			var dit = this,
			    collection = this.collection = options.collection;

			delete options.collection;

			this._deferProcessing = true;

			var processQueue = function processQueue(model) {
				if (model === dit) {
					dit._deferProcessing = false;
					dit.processQueue();
					collection.off('relational:add', processQueue);
				}
			};
			collection.on('relational:add', processQueue);

			_.defer(function () {
				processQueue(dit);
			});
		}

		store.processOrphanRelations();
		store.listenTo(this, 'relational:unregister', store.unregister);

		this._queue = new BlockingQueue();
		this._queue.block();
		eventQueue.block();

		try {
			Backbone.Model.apply(this, arguments);
		} finally {
			eventQueue.unblock();
		}
	},

	trigger: function trigger(eventName) {
		if (eventName.length > 5 && eventName.indexOf('change') === 0) {
			var dit = this,
			    args = arguments;

			if (!eventQueue.isLocked()) {
				Backbone.Model.prototype.trigger.apply(dit, args);
			} else {
				eventQueue.add(function () {
					var changed = true;
					if (eventName === 'change') {
						changed = dit.hasChanged() || dit._attributeChangeFired;
						dit._attributeChangeFired = false;
					} else {
						var attr = eventName.slice(7),
						    rel = dit.getRelation(attr);

						if (rel) {
							changed = args[4] === true;

							if (changed) {
								dit.changed[attr] = args[2];
							} else if (!rel.changed) {
									delete dit.changed[attr];
								}
						} else if (changed) {
							dit._attributeChangeFired = true;
						}
					}

					changed && Backbone.Model.prototype.trigger.apply(dit, args);
				});
			}
		} else if (eventName === 'destroy') {
			Backbone.Model.prototype.trigger.apply(this, arguments);
			store.unregister(this);
		} else {
			Backbone.Model.prototype.trigger.apply(this, arguments);
		}

		return this;
	},

	initializeRelations: function initializeRelations(options) {
		this.acquire();
		this._relations = {};

		_.each(this.relations || [], function (rel) {
			store.initializeRelation(this, rel, options);
		}, this);

		this._isInitialized = true;
		this.release();
		this.processQueue();
	},

	updateRelations: function updateRelations(changedAttrs, options) {
		if (this._isInitialized && !this.isLocked()) {
			_.each(this._relations, function (rel) {
				if (!changedAttrs || rel.keySource in changedAttrs || rel.key in changedAttrs) {
					var value = this.attributes[rel.keySource] || this.attributes[rel.key],
					    attr = changedAttrs && (changedAttrs[rel.keySource] || changedAttrs[rel.key]);

					if (rel.related !== value || value === null && attr === null) {
						this.trigger('relational:change:' + rel.key, this, value, options || {});
					}
				}

				if (rel.keySource !== rel.key) {
					delete this.attributes[rel.keySource];
				}
			}, this);
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

	getIdsToFetch: function getIdsToFetch(attr, refresh) {
		var rel = attr instanceof Relation ? attr : this.getRelation(attr),
		    ids = rel ? rel.keyIds && rel.keyIds.slice(0) || (rel.keyId || rel.keyId === 0 ? [rel.keyId] : []) : [];

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
		options = _.extend({ add: true, remove: false, refresh: false }, options);

		var dit = this,
		    requests = [],
		    rel = this.getRelation(attr),
		    idsToFetch = rel && this.getIdsToFetch(rel, options.refresh),
		    coll = rel.related instanceof Collection$1 ? rel.related : rel.relatedCollection;

		if (idsToFetch && idsToFetch.length) {
			var models = [],
			    createdModels = [],
			    setUrl,
			    createModels = function createModels() {
				models = _.map(idsToFetch, function (id) {
					var model = rel.relatedModel.findModel(id);

					if (!model) {
						var attrs = {};
						attrs[rel.relatedModel.prototype.idAttribute] = id;
						model = rel.relatedModel.findOrCreate(attrs, options);
						createdModels.push(model);
					}

					return model;
				}, this);
			};

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
					error: function error() {
						_.each(createdModels, function (model) {
							model.trigger('destroy', model, model.collection, options);
						});

						options.error && options.error.apply(models, arguments);
					},
					url: setUrl
				}, options);

				requests = [coll.fetch(opts)];
			} else {
				if (!models.length) {
					createModels();
				}

				requests = _.map(models, function (model) {
					var opts = _.defaults({
						error: function error() {
							if (_.contains(createdModels, model)) {
								model.trigger('destroy', model, model.collection, options);
							}
							options.error && options.error.apply(models, arguments);
						}
					}, options);
					return model.fetch(opts);
				}, this);
			}
		}

		return this.deferArray(requests).then(function () {
			return Backbone.Model.prototype.get.call(dit, attr);
		});
	},

	deferArray: function deferArray(_deferArray) {
		return $.when.apply(null, _deferArray);
	},

	set: function set(key, value, options) {
		eventQueue.block();

		var attributes, result;

		if (_.isObject(key) || key == null) {
			attributes = key;
			options = value;
		} else {
			attributes = {};
			attributes[key] = value;
		}

		try {
			var id = this.id,
			    newId = attributes && this.idAttribute in attributes && attributes[this.idAttribute];

			store.checkId(this, newId);

			result = Backbone.Model.prototype.set.apply(this, arguments);

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
		var json = Backbone.Model.prototype.toJSON.call(this, options);

		if (this.constructor._superModel && !(this.constructor._subModelTypeAttribute in json)) {
			json[this.constructor._subModelTypeAttribute] = this.constructor._subModelTypeValue;
		}

		_.each(this._relations, function (rel) {
			var related = json[rel.key],
			    includeInJSON = rel.options.includeInJSON,
			    value = null;

			if (includeInJSON === true) {
				if (related && _.isFunction(related.toJSON)) {
					value = related.toJSON(options);
				}
			} else if (_.isString(includeInJSON)) {
				if (related instanceof Collection$1) {
					value = related.pluck(includeInJSON);
				} else if (related instanceof Backbone.Model) {
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
				} else if (related instanceof Backbone.Model) {
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
				rel.model = this;
			}

			if (rel.reverseRelation && rel.model === this) {
				var preInitialize = true;
				if (_.isString(rel.relatedModel)) {
					var relatedModel = store.getObjectByName(rel.relatedModel);
					preInitialize = relatedModel && relatedModel.prototype instanceof this;
				}

				if (preInitialize) {
					store.initializeRelation(null, rel);
				} else if (_.isString(rel.relatedModel)) {
					store.addOrphanRelation(rel);
				}
			}
		}, this);

		return this;
	},

	build: function build(attributes, options) {
		this.initializeModelHierarchy();

		var model = this._findSubModelType(this, attributes) || this;

		return new model(attributes, options);
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
				var inheritedRelations = _.filter(this._superModel.prototype.relations || [], function (superRel) {
					return !_.any(this.prototype.relations || [], function (rel) {
						return superRel.relatedModel === rel.relatedModel && superRel.key === rel.key;
					}, this);
				}, this);

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
		var child = Backbone.Model.extend.apply(this, arguments);

		child.setup(this);

		return child;
	}
});

var module$1 = config;

module$1.Collection = Collection$1;
module$1.Semaphore = Semaphore;
module$1.BlockingQueue = BlockingQueue;
module$1.eventQueue = eventQueue;
module$1.relationTypeStore = relationTypeStore;

module$1.Store = Store;
module$1.store = store;

module$1.Relation = Relation;
module$1.HasOne = HasOne;
module$1.HasMany = HasMany;

relationTypeStore.registerType('HasOne', module$1.HasOne);
relationTypeStore.registerType('HasMany', module$1.HasMany);

module$1.Model = Model$1;

return module$1;

})));
//# sourceMappingURL=backbone-relational.js.map
