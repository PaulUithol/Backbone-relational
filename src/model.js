import { Model as BBModel } from 'backbone';
import _ from 'underscore';
import Semaphore from './utils/semaphore';
import store from './store';
import eventQueue from './event-queue';
import BlockingQueue from './utils/blocking-queue';
import Relation from './relation';
import Collection from './collection';
import $ from 'jquery';
import relationTypeStore from './relation-type-store';

/**
 * A type of Backbone.Model that also maintains relations to other models and collections.
 * New events when compared to the original:
 *  - 'add:<key>' (model, related collection, options)
 *  - 'remove:<key>' (model, related collection, options)
 *  - 'change:<key>' (model, related model or collection, options)
 */
export default BBModel.extend(Semaphore).extend({
	relations: null, // Relation descriptions on the prototype
	_relations: null, // Relation instances
	_isInitialized: false,
	_deferProcessing: false,
	_queue: null,
	_attributeChangeFired: false, // Keeps track of `change` event firing under some conditions (like nested `set`s)

	subModelTypeAttribute: 'type',
	subModelTypes: null,

	constructor(attributes, options) {
		// Nasty hack, for cases like 'model.get( <HasMany key> ).add( item )'.
		// Defer 'processQueue', so that when 'Relation.createModels' is used we trigger 'HasMany'
		// collection events only after the model is really fully set up.
		// Example: event for "p.on( 'add:jobs' )" -> "p.get('jobs').add( { company: c.id, person: p.id } )".
		if (options && options.collection) {
			let dit = this,
				collection = this.collection = options.collection;

			// Prevent `collection` from cascading down to nested models; they shouldn't go into this `if` clause.
			delete options.collection;

			this._deferProcessing = true;

			let processQueue = function(model) {
				if (model === dit) {
					dit._deferProcessing = false;
					dit.processQueue();
					collection.off('relational:add', processQueue);
				}
			};
			collection.on('relational:add', processQueue);

			// So we do process the queue eventually, regardless of whether this model actually gets added to 'options.collection'.
			_.defer(function() {
				processQueue(dit);
			});
		}

		store.processOrphanRelations();
		store.listenTo(this, 'relational:unregister', store.unregister);

		this._queue = new BlockingQueue();
		this._queue.block();
		eventQueue.block();

		try {
			BBModel.apply(this, arguments);
		}		finally {
			// Try to run the global queue holding external events
			eventQueue.unblock();
		}
	},

	/**
	 * Override 'trigger' to queue 'change' and 'change:*' events
	 */
	trigger(eventName) {
		if (eventName.length > 5 && eventName.indexOf('change') === 0) {
			let dit = this,
				args = arguments;

			if (!eventQueue.isLocked()) {
				// If we're not in a more complicated nested scenario, fire the change event right away
				BBModel.prototype.trigger.apply(dit, args);
			}			else {
				eventQueue.add(function() {
					// Determine if the `change` event is still valid, now that all relations are populated
					let changed = true;
					if (eventName === 'change') {
						// `hasChanged` may have gotten reset by nested calls to `set`.
						changed = dit.hasChanged() || dit._attributeChangeFired;
						dit._attributeChangeFired = false;
					}					else {
						let attr = eventName.slice(7),
							rel = dit.getRelation(attr);

						if (rel) {
							// If `attr` is a relation, `change:attr` get triggered from `Relation.onChange`.
							// These take precedence over `change:attr` events triggered by `Model.set`.
							// The relation sets a fourth attribute to `true`. If this attribute is present,
							// continue triggering this event; otherwise, it's from `Model.set` and should be stopped.
							changed = (args[ 4 ] === true);

							// If this event was triggered by a relation, set the right value in `this.changed`
							// (a Collection or Model instead of raw data).
							if (changed) {
								dit.changed[ attr ] = args[ 2 ];
							} else if (!rel.changed) {
								// Otherwise, this event is from `Model.set`. If the relation doesn't report a change,
								// remove attr from `dit.changed` so `hasChanged` doesn't take it into account.
								delete dit.changed[ attr ];
							}
						}						else if (changed) {
							dit._attributeChangeFired = true;
						}
					}

					changed && BBModel.prototype.trigger.apply(dit, args);
				});
			}
		}		else if (eventName === 'destroy') {
			BBModel.prototype.trigger.apply(this, arguments);
			store.unregister(this);
		}		else {
			BBModel.prototype.trigger.apply(this, arguments);
		}

		return this;
	},

	/**
	 * Initialize Relations present in this.relations; determine the type (HasOne/HasMany), then creates a new instance.
	 * Invoked in the first call so 'set' (which is made from the Backbone.Model constructor).
	 */
	initializeRelations(options) {
		this.acquire(); // Setting up relations often also involve calls to 'set', and we only want to enter this function once
		this._relations = {};

		_.each(this.relations || [], function(rel) {
			store.initializeRelation(this, rel, options);
		}, this);

		this._isInitialized = true;
		this.release();
		this.processQueue();
	},

	/**
	 * When new values are set, notify this model's relations (also if options.silent is set).
	 * (called from `set`; Relation.setRelated locks this model before calling 'set' on it to prevent loops)
	 * @param {Object} [changedAttrs]
	 * @param {Object} [options]
	 */
	updateRelations(changedAttrs, options) {
		if (this._isInitialized && !this.isLocked()) {
			_.each(this._relations, function(rel) {
				if (!changedAttrs || (rel.keySource in changedAttrs || rel.key in changedAttrs)) {
					// Fetch data in `rel.keySource` if data got set in there, or `rel.key` otherwise
					let value = this.attributes[ rel.keySource ] || this.attributes[ rel.key ],
						attr = changedAttrs && (changedAttrs[ rel.keySource ] || changedAttrs[ rel.key ]);

					// Update a relation if its value differs from this model's attributes, or it's been explicitly nullified.
					// Which can also happen before the originally intended related model has been found (`val` is null).
					if (rel.related !== value || (value === null && attr === null)) {
						this.trigger('relational:change:' + rel.key, this, value, options || {});
					}
				}

				// Explicitly clear 'keySource', to prevent a leaky abstraction if 'keySource' differs from 'key'.
				if (rel.keySource !== rel.key) {
					delete this.attributes[ rel.keySource ];
				}
			}, this);
		}
	},

	/**
	 * Either add to the queue (if we're not initialized yet), or execute right away.
	 */
	queue(func) {
		this._queue.add(func);
	},

	/**
	 * Process _queue
	 */
	processQueue() {
		if (this._isInitialized && !this._deferProcessing && this._queue.isBlocked()) {
			this._queue.unblock();
		}
	},

	/**
	 * Get a specific relation.
	 * @param {string} attr The relation key to look for.
	 * @return {Backbone.Relation} An instance of 'Backbone.Relation', if a relation was found for 'attr', or null.
	 */
	getRelation(attr) {
		return this._relations[ attr ];
	},

	/**
	 * Get all of the created relations.
	 * @return {Backbone.Relation[]}
	 */
	getRelations() {
		return _.values(this._relations);
	},


	/**
	 * Get a list of ids that will be fetched on a call to `getAsync`.
	 * @param {string|Backbone.Relation} attr The relation key to fetch models for.
	 * @param [refresh=false] Add ids for models that are already in the relation, refreshing them?
	 * @return {Array} An array of ids that need to be fetched.
	 */
	getIdsToFetch(attr, refresh) {
		let rel = attr instanceof Relation ? attr : this.getRelation(attr),
			ids = rel ? (rel.keyIds && rel.keyIds.slice(0)) || ((rel.keyId || rel.keyId === 0) ? [rel.keyId] : []) : [];

		// On `refresh`, add the ids for current models in the relation to `idsToFetch`
		if (refresh) {
			let models = rel.related && (rel.related.models || [rel.related]);
			_.each(models, function(model) {
				if (model.id || model.id === 0) {
					ids.push(model.id);
				}
			});
		}

		return ids;
	},

	/**
	 * Get related objects. Returns a single promise, which can either resolve immediately (if the related model[s])
	 * are already present locally, or after fetching the contents of the requested attribute.
	 * @param {string} attr The relation key to fetch models for.
	 * @param {Object} [options] Options for 'Backbone.Model.fetch' and 'Backbone.sync'.
	 * @param {Boolean} [options.refresh=false] Fetch existing models from the server as well (in order to update them).
	 * @return {jQuery.Deferred} A jQuery promise object. When resolved, its `done` callback will be called with
	 *  contents of `attr`.
	 */
	getAsync(attr, options) {
		// Set default `options` for fetch
		options = _.extend({ add: true, remove: false, refresh: false }, options);

		let dit = this,
			requests = [],
			rel = this.getRelation(attr),
			idsToFetch = rel && this.getIdsToFetch(rel, options.refresh),
			coll = rel.related instanceof Collection ? rel.related : rel.relatedCollection;

		if (idsToFetch && idsToFetch.length) {
			let models = [],
				createdModels = [],
				setUrl,
				createModels = function() {
					// Find (or create) a model for each one that is to be fetched
					models = _.map(idsToFetch, function(id) {
						let model = rel.relatedModel.findModel(id);

						if (!model) {
							let attrs = {};
							attrs[ rel.relatedModel.prototype.idAttribute ] = id;
							model = rel.relatedModel.findOrCreate(attrs, options);
							createdModels.push(model);
						}

						return model;
					}, this);
				};

			// Try if the 'collection' can provide a url to fetch a set of models in one request.
			// This assumes that when 'Collection.url' is a function, it can handle building of set urls.
			// To make sure it can, test if the url we got by supplying a list of models to fetch is different from
			// the one supplied for the default fetch action (without args to 'url').
			if (coll instanceof Collection && _.isFunction(coll.url)) {
				let defaultUrl = coll.url();
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
				// Do a single request to fetch all models
				let opts = _.defaults(
					{
						error() {
							_.each(createdModels, function(model) {
								model.trigger('destroy', model, model.collection, options);
							});

							options.error && options.error.apply(models, arguments);
						},
						url: setUrl
					},
					options
				);

				requests = [coll.fetch(opts)];
			}			else {
				// Make a request per model to fetch
				if (!models.length) {
					createModels();
				}

				requests = _.map(models, function(model) {
					let opts = _.defaults(
						{
							error() {
								if (_.contains(createdModels, model)) {
									model.trigger('destroy', model, model.collection, options);
								}
								options.error && options.error.apply(models, arguments);
							}
						},
						options
					);
					return model.fetch(opts);
				}, this);
			}
		}

		return this.deferArray(requests).then(
			function() {
				return BBModel.prototype.get.call(dit, attr);
			}
		);
	},

	deferArray(deferArray) {
		return $.when.apply(null, deferArray);
	},

	set(key, value, options) {
		eventQueue.block();

		// Duplicate backbone's behavior to allow separate key/value parameters, instead of a single 'attributes' object
		let attributes,
			result;

		if (_.isObject(key) || key == null) {
			attributes = key;
			options = value;
		}		else {
			attributes = {};
			attributes[ key ] = value;
		}

		try {
			let id = this.id,
				newId = attributes && this.idAttribute in attributes && attributes[ this.idAttribute ];

			// Check if we're not setting a duplicate id before actually calling `set`.
			store.checkId(this, newId);

			result = BBModel.prototype.set.apply(this, arguments);

			// Ideal place to set up relations, if this is the first time we're here for this model
			if (!this._isInitialized && !this.isLocked()) {
				this.constructor.initializeModelHierarchy();

				// Only register models that have an id. A model will be registered when/if it gets an id later on.
				if (newId || newId === 0) {
					store.register(this);
				}

				this.initializeRelations(options);
			} else if (newId && newId !== id) {
				// The store should know about an `id` update asap
				store.update(this);
			}

			if (attributes) {
				this.updateRelations(attributes, options);
			}
		}		finally {
			// Try to run the global queue holding external events
			eventQueue.unblock();
		}

		return result;
	},

	clone() {
		let attributes = _.clone(this.attributes);
		if (!_.isUndefined(attributes[ this.idAttribute ])) {
			attributes[ this.idAttribute ] = null;
		}

		_.each(this.getRelations(), function(rel) {
			delete attributes[ rel.key ];
		});

		return new this.constructor(attributes);
	},

	/**
	 * Convert relations to JSON, omits them when required
	 */
	toJSON(options) {
		// If this Model has already been fully serialized in this branch once, return to avoid loops
		if (this.isLocked()) {
			return this.id;
		}

		this.acquire();
		let json = BBModel.prototype.toJSON.call(this, options);

		if (this.constructor._superModel && !(this.constructor._subModelTypeAttribute in json)) {
			json[ this.constructor._subModelTypeAttribute ] = this.constructor._subModelTypeValue;
		}

		_.each(this._relations, function(rel) {
			let related = json[ rel.key ],
				includeInJSON = rel.options.includeInJSON,
				value = null;

			if (includeInJSON === true) {
				if (related && _.isFunction(related.toJSON)) {
					value = related.toJSON(options);
				}
			}			else if (_.isString(includeInJSON)) {
				if (related instanceof Collection) {
					value = related.pluck(includeInJSON);
				}				else if (related instanceof BBModel) {
					value = related.get(includeInJSON);
				}

				// Add ids for 'unfound' models if includeInJSON is equal to (only) the relatedModel's `idAttribute`
				if (includeInJSON === rel.relatedModel.prototype.idAttribute) {
					if (rel instanceof relationTypeStore.find('HasMany')) {
						value = value.concat(rel.keyIds);
					}					else if (rel instanceof relationTypeStore.find('HasOne')) {
						value = value || rel.keyId;

						if (!value && !_.isObject(rel.keyContents)) {
							value = rel.keyContents || null;
						}
					}
				}
			}			else if (_.isArray(includeInJSON)) {
				if (related instanceof Collection) {
					value = [];
					related.each(function(model) {
						let curJson = {};
						_.each(includeInJSON, function(key) {
							curJson[ key ] = model.get(key);
						});
						value.push(curJson);
					});
				}				else if (related instanceof BBModel) {
					value = {};
					_.each(includeInJSON, function(key) {
						value[ key ] = related.get(key);
					});
				}
			}			else {
				delete json[ rel.key ];
			}

			// In case of `wait: true`, Backbone will simply push whatever's passed into `save` into attributes.
			// We'll want to get this information into the JSON, even if it doesn't conform to our normal
			// expectations of what's contained in it (no model/collection for a relation, etc).
			if (value === null && options && options.wait) {
				value = related;
			}

			if (includeInJSON) {
				json[ rel.keyDestination ] = value;
			}

			if (rel.keyDestination !== rel.key) {
				delete json[ rel.key ];
			}
		});

		this.release();
		return json;
	}
},
	{
	/**
	 *
	 * @param superModel
	 * @returns {Backbone.Relational.Model.constructor}
	 */
		setup(superModel) {
		// We don't want to share a relations array with a parent, as this will cause problems with reverse
		// relations. Since `relations` may also be a property or function, only use slice if we have an array.
			this.prototype.relations = (this.prototype.relations || []).slice(0);

			this._subModels = {};
			this._superModel = null;

		// If this model has 'subModelTypes' itself, remember them in the store
			if (this.prototype.hasOwnProperty('subModelTypes')) {
				store.addSubModels(this.prototype.subModelTypes, this);
			} else {
				// The 'subModelTypes' property should not be inherited, so reset it.
				this.prototype.subModelTypes = null;
			}

		// Initialize all reverseRelations that belong to this new model.
			_.each(this.prototype.relations || [], function(rel) {
				if (!rel.model) {
					rel.model = this;
				}

				if (rel.reverseRelation && rel.model === this) {
					let preInitialize = true;
					if (_.isString(rel.relatedModel)) {
					/**
					 * The related model might not be defined for two reasons
					 *  1. it is related to itself
					 *  2. it never gets defined, e.g. a typo
					 *  3. the model hasn't been defined yet, but will be later
					 * In neither of these cases do we need to pre-initialize reverse relations.
					 * However, for 3. (which is, to us, indistinguishable from 2.), we do need to attempt
					 * setting up this relation again later, in case the related model is defined later.
					 */
						let relatedModel = store.getObjectByName(rel.relatedModel);
						preInitialize = relatedModel && (relatedModel.prototype instanceof this);
					}

					if (preInitialize) {
						store.initializeRelation(null, rel);
					}				else if (_.isString(rel.relatedModel)) {
						store.addOrphanRelation(rel);
					}
				}
			}, this);

			return this;
		},

	/**
	 * Create a 'Backbone.Model' instance based on 'attributes'.
	 * @param {Object} attributes
	 * @param {Object} [options]
	 * @return {Backbone.Model}
	 */
		build(attributes, options) {
		// 'build' is a possible entrypoint; it's possible no model hierarchy has been determined yet.
			this.initializeModelHierarchy();

		// Determine what type of (sub)model should be built if applicable.
			let Model = this._findSubModelType(this, attributes) || this;

			return new Model(attributes, options);
		},

	/**
	 * Determines what type of (sub)model should be built if applicable.
	 * Looks up the proper subModelType in 'this._subModels', recursing into
	 * types until a match is found.  Returns the applicable 'Backbone.Model'
	 * or null if no match is found.
	 * @param {Backbone.Model} type
	 * @param {Object} attributes
	 * @return {Backbone.Model}
	 */
		_findSubModelType(type, attributes) {
			if (type._subModels && type.prototype.subModelTypeAttribute in attributes) {
				let subModelTypeAttribute = attributes[ type.prototype.subModelTypeAttribute ];
				let subModelType = type._subModels[ subModelTypeAttribute ];
				if (subModelType) {
					return subModelType;
				}			else {
				// Recurse into subModelTypes to find a match
					for (subModelTypeAttribute in type._subModels) {
						subModelType = this._findSubModelType(type._subModels[ subModelTypeAttribute ], attributes);
						if (subModelType) {
							return subModelType;
						}
					}
				}
			}
			return null;
		},

	/**
	 *
	 */
		initializeModelHierarchy() {
		// Inherit any relations that have been defined in the parent model.
			this.inheritRelations();

		// If we came here through 'build' for a model that has 'subModelTypes' then try to initialize the ones that
		// haven't been resolved yet.
			if (this.prototype.subModelTypes) {
				let resolvedSubModels = _.keys(this._subModels);
				let unresolvedSubModels = _.omit(this.prototype.subModelTypes, resolvedSubModels);
				_.each(unresolvedSubModels, function(subModelTypeName) {
					let subModelType = store.getObjectByName(subModelTypeName);
					subModelType && subModelType.initializeModelHierarchy();
				});
			}
		},

		inheritRelations() {
		// Bail out if we've been here before.
			if (!_.isUndefined(this._superModel) && !_.isNull(this._superModel)) {
				return;
			}
		// Try to initialize the _superModel.
			store.setupSuperModel(this);

		// If a superModel has been found, copy relations from the _superModel if they haven't been inherited automatically
		// (due to a redefinition of 'relations').
			if (this._superModel) {
			// The _superModel needs a chance to initialize its own inherited relations before we attempt to inherit relations
			// from the _superModel. You don't want to call 'initializeModelHierarchy' because that could cause sub-models of
			// this class to inherit their relations before this class has had chance to inherit it's relations.
				this._superModel.inheritRelations();
				if (this._superModel.prototype.relations) {
				// Find relations that exist on the '_superModel', but not yet on this model.
					let inheritedRelations = _.filter(this._superModel.prototype.relations || [], function(superRel) {
						return !_.any(this.prototype.relations || [], function(rel) {
							return superRel.relatedModel === rel.relatedModel && superRel.key === rel.key;
						}, this);
					}, this);

					this.prototype.relations = inheritedRelations.concat(this.prototype.relations);
				}
			} else {
				// Otherwise, make sure we don't get here again for this type by making '_superModel' false so we fail the
				// isUndefined/isNull check next time.
				this._superModel = false;
			}
		},

	/**
	 * Find an instance of `this` type in 'Backbone.store'.
	 * A new model is created if no matching model is found, `attributes` is an object, and `options.create` is true.
	 * - If `attributes` is a string or a number, `findOrCreate` will query the `store` and return a model if found.
	 * - If `attributes` is an object and is found in the store, the model will be updated with `attributes` unless `options.merge` is `false`.
	 * @param {Object|String|Number} attributes Either a model's id, or the attributes used to create or update a model.
	 * @param {Object} [options]
	 * @param {Boolean} [options.create=true]
	 * @param {Boolean} [options.merge=true]
	 * @param {Boolean} [options.parse=false]
	 * @return {Backbone.Relational.Model}
	 */
		findOrCreate(attributes, options) {
			options || (options = {});
			let parsedAttributes = (_.isObject(attributes) && options.parse && this.prototype.parse) ?
			this.prototype.parse(_.clone(attributes), options) : attributes;

		// If specified, use a custom `find` function to match up existing models to the given attributes.
		// Otherwise, try to find an instance of 'this' model type in the store
			let model = this.findModel(parsedAttributes);

		// If we found an instance, update it with the data in 'item' (unless 'options.merge' is false).
		// If not, create an instance (unless 'options.create' is false).
			if (_.isObject(attributes)) {
				if (model && options.merge !== false) {
				// Make sure `options.collection` and `options.url` doesn't cascade to nested models
					delete options.collection;
					delete options.url;

					model.set(parsedAttributes, options);
				}			else if (!model && options.create !== false) {
					model = this.build(parsedAttributes, _.defaults({ parse: false }, options));
				}
			}

			return model;
		},

	/**
	 * Find an instance of `this` type in 'Backbone.store'.
	 * - If `attributes` is a string or a number, `find` will query the `store` and return a model if found.
	 * - If `attributes` is an object and is found in the store, the model will be updated with `attributes` unless `options.merge` is `false`.
	 * @param {Object|String|Number} attributes Either a model's id, or the attributes used to create or update a model.
	 * @param {Object} [options]
	 * @param {Boolean} [options.merge=true]
	 * @param {Boolean} [options.parse=false]
	 * @return {Backbone.Relational.Model}
	 */
		find(attributes, options) {
			options || (options = {});
			options.create = false;
			return this.findOrCreate(attributes, options);
		},

	/**
	 * A hook to override the matching when updating (or creating) a model.
	 * The default implementation is to look up the model by id in the store.
	 * @param {Object} attributes
	 * @returns {Backbone.Relational.Model}
	 */
		findModel(attributes) {
			return store.find(this, attributes);
		},
		// Override .extend() to automatically call .setup()
		extend(protoProps, classProps) {
			let child = BBModel.extend.apply(this, arguments);

			child.setup(this);

			return child;
		}
	});
