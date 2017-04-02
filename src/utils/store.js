import _ from 'underscore';
import { Model as BBModel } from 'backbone';
import BObject from './object';
import relationTypeStore from '../relation-type-store';
import config from '../config';
import Collection from '../collection';

/**
 * Backbone.Store keeps track of all created (and destruction of) Backbone.Relational.Model.
 * Handles lookup for relations.
 */
export default BObject.extend({
	initialize() {
		this._collections = [];
		this._reverseRelations = [];
		this._orphanRelations = [];
		this._subModels = [];
		this._modelScopes = [window];
	},

	/**
	 * Create a new `Relation`.
	 * @param {Backbone.Relational.Model} [model]
	 * @param {Object} relation
	 * @param {Object} [options]
	 */
	initializeRelation(model, relation, options) {
		let { type: Type } = relation;
		if (_.isString(Type)) {
			Type = relationTypeStore.find(Type) || this.getObjectByName(Type);
		}

		if (_.isObject(Type)) {
			let relationType = new Type(model, relation, options); // Also pushes the new Relation into `model._relations`
		}	else if (config.showWarnings && console) {
			console.warn('Relation=%o; missing or invalid relation type!', relation);
		}
	},

	/**
	 * Add a scope for `getObjectByName` to look for model types by name.
	 * @param {Object} scope
	 */
	addModelScope(scope) {
		this._modelScopes.push(scope);
	},

	/**
	 * Remove a scope.
	 * @param {Object} scope
	 */
	removeModelScope(scope) {
		this._modelScopes = _.without(this._modelScopes, scope);
	},

	/**
	 * Add a set of subModelTypes to the store, that can be used to resolve the '_superModel'
	 * for a model later in 'setupSuperModel'.
	 *
	 * @param {Backbone.Relational.Model} subModelTypes
	 * @param {Backbone.Relational.Model} superModelType
	 */
	addSubModels(subModelTypes, superModelType) {
		this._subModels.push({
			superModelType,
			subModels: subModelTypes
		});
	},

	/**
	 * Check if the given modelType is registered as another model's subModel. If so, add it to the super model's
	 * '_subModels', and set the modelType's '_superModel', '_subModelTypeName', and '_subModelTypeAttribute'.
	 *
	 * @param {Backbone.Relational.Model} modelType
	 */
	setupSuperModel(modelType) {
		_.find(this._subModels, function(subModelDef) {
			return _.filter(subModelDef.subModels || [], function(subModelTypeName, typeValue) {
				let subModelType = this.getObjectByName(subModelTypeName);

				if (modelType === subModelType) {
					// Set 'modelType' as a child of the found superModel
					subModelDef.superModelType._subModels[ typeValue ] = modelType;

					// Set '_superModel', '_subModelTypeValue', and '_subModelTypeAttribute' on 'modelType'.
					modelType._superModel = subModelDef.superModelType;
					modelType._subModelTypeValue = typeValue;
					modelType._subModelTypeAttribute = subModelDef.superModelType.prototype.subModelTypeAttribute;
					return true;
				}
			}, this).length;
		}, this);
	},

	/**
	 * Add a reverse relation. Is added to the 'relations' property on model's prototype, and to
	 * existing instances of 'model' in the store as well.
	 * @param {Object} relation
	 * @param {Backbone.Relational.Model} relation.model
	 * @param {String} relation.type
	 * @param {String} relation.key
	 * @param {String|Object} relation.relatedModel
	 */
	addReverseRelation(relation) {
		let exists = _.any(this._reverseRelations, function(rel) {
			return _.all(relation || [], function(val, key) {
				return val === rel[ key ];
			});
		});

		if (!exists && relation.model && relation.type) {
			this._reverseRelations.push(relation);
			this._addRelation(relation.model, relation);
			this.retroFitRelation(relation);
		}
	},

	/**
	 * Deposit a `relation` for which the `relatedModel` can't be resolved at the moment.
	 *
	 * @param {Object} relation
	 */
	addOrphanRelation(relation) {
		let exists = _.any(this._orphanRelations, function(rel) {
			return _.all(relation || [], function(val, key) {
				return val === rel[ key ];
			});
		});

		if (!exists && relation.model && relation.type) {
			this._orphanRelations.push(relation);
		}
	},

	/**
	 * Try to initialize any `_orphanRelation`s
	 */
	processOrphanRelations() {
		// Make sure to operate on a copy since we're removing while iterating
		_.each(this._orphanRelations.slice(0), function(rel) {
			let relatedModel = this.getObjectByName(rel.relatedModel);
			if (relatedModel) {
				this.initializeRelation(null, rel);
				this._orphanRelations = _.without(this._orphanRelations, rel);
			}
		}, this);
	},

	/**
	 *
	 * @param {Backbone.Relational.Model.constructor} type
	 * @param {Object} relation
	 * @private
	 */
	_addRelation(type, relation) {
		if (!type.prototype.relations) {
			type.prototype.relations = [];
		}
		type.prototype.relations.push(relation);

		_.each(type._subModels || [], function(subModel) {
			this._addRelation(subModel, relation);
		}, this);
	},

	/**
	 * Add a 'relation' to all existing instances of 'relation.model' in the store
	 * @param {Object} relation
	 */
	retroFitRelation(relation) {
		let { type: RelationType } = relation;

		let coll = this.getCollection(relation.model, false);
		coll && coll.each(function(model) {
			if (!(model instanceof relation.model)) {
				return;
			}

			let relationType = new RelationType(model, relation);
		}, this);
	},

	/**
	 * Find the Store's collection for a certain type of model.
	 * @param {Backbone.Relational.Model} type
	 * @param {Boolean} [create=true] Should a collection be created if none is found?
	 * @return {Backbone.Relational.Collection} A collection if found (or applicable for 'model'), or null
	 */
	getCollection(type, create) {
		if (type instanceof BBModel) {
			type = type.constructor;
		}

		let rootModel = type;
		while (rootModel._superModel) {
			rootModel = rootModel._superModel;
		}

		let coll = _.find(this._collections, function(item) {
			return item.model === rootModel;
		});

		if (!coll && create !== false) {
			coll = this._createCollection(rootModel);
		}

		return coll;
	},

	/**
	 * Find a model type on one of the modelScopes by name. Names are split on dots.
	 * @param {String} name
	 * @return {Object}
	 */
	getObjectByName(name) {
		let parts = name.split('.'),
			type = null;

		_.find(this._modelScopes, function(scope) {
			type = _.reduce(parts || [], function(memo, val) {
				return memo ? memo[ val ] : undefined;
			}, scope);

			if (type && type !== scope) {
				return true;
			}
		}, this);

		return type;
	},

	_createCollection(type) {
		// If 'type' is an instance, take its constructor
		if (!_.isObject(type)) {
			type = type.constructor;
		}

		// Type should inherit from Backbone.Relational.Model.
		// if ( type.prototype instanceof Backbone.Relational.Model ) {
		let coll = new Collection();
		coll.model = type;

		this._collections.push(coll);
		// }

		return coll;
	},

	/**
	 * Find the attribute that is to be used as the `id` on a given object
	 * @param type
	 * @param {String|Number|Object|Backbone.Relational.Model} item
	 * @return {String|Number}
	 */
	resolveIdForItem(type, item = null) {
		if (item === null) {
			return null;
		}

		if (_.isString(item) || _.isNumber(item)) {
			return item;
		}

		return item.id || item[ type.prototype.idAttribute ] || null;
	},

	/**
	 * Find a specific model of a certain `type` in the store
	 * @param type
	 * @param {String|Number|Object|Backbone.Relational.Model} item
	 */
	find(type, item) {
		let id = this.resolveIdForItem(type, item),
			coll = this.getCollection(type);

		// Because the found object could be of any of the type's superModel
		// types, only return it if it's actually of the type asked for.
		if (coll) {
			let obj = coll.get(id);

			if (obj instanceof type) {
				return obj;
			}
		}

		return null;
	},

	/**
	 * Add a 'model' to its appropriate collection. Retain the original contents of 'model.collection'.
	 * @param {Backbone.Relational.Model} model
	 */
	register(model) {
		let coll = this.getCollection(model);

		if (coll) {
			let modelColl = model.collection;
			coll.add(model);
			model.collection = modelColl;
		}
	},

	/**
	 * Check if the given model may use the given `id`
	 * @param model
	 * @param [id]
	 */
	checkId(model, id) {
		let coll = this.getCollection(model),
			duplicate = coll && coll.get(id);

		if (duplicate && model !== duplicate) {
			if (config.showWarnings && console) {
				console.warn('Duplicate id! Old RelationalModel=%o, new RelationalModel=%o', duplicate, model);
			}

			throw new Error('Cannot instantiate more than one Backbone.Relational.Model with the same id per type!');
		}
	},

	/**
	 * Explicitly update a model's id in its store collection
	 * @param {Backbone.Relational.Model} model
	 */
	update(model) {
		let coll = this.getCollection(model);

		// Register a model if it isn't yet (which happens if it was created without an id).
		if (!coll.contains(model)) {
			this.register(model);
		}

		// This triggers updating the lookup indices kept in a collection
		coll._onModelEvent('change:' + model.idAttribute, model, coll);

		// Trigger an event on model so related models (having the model's new id in their keyContents) can add it.
		model.trigger('relational:change:id', model, coll);
	},

	/**
	 * Unregister from the store: a specific model, a collection, or a model type.
	 * @param {Backbone.Relational.Model|Backbone.Relational.Model.constructor|Backbone.Relational.Collection} type
	 */
	unregister(type) {
		let coll;
		let models = _.clone(type.models);
		if (type.model) {
			coll = this.getCollection(type.model);
		}		else {
			coll = this.getCollection(type);
			models = _.clone(coll.models);
		}

		if (type instanceof BBModel) {
			models = [type];
		}

		_.each(models, function(model) {
			this.stopListening(model);
			_.invoke(model.getRelations(), 'stopListening');
		}, this);

		// If we've unregistered an entire store collection, reset the collection (which is much faster).
		// Otherwise, remove each model one by one.
		if (_.contains(this._collections, type)) {
			coll.reset([]);
		}		else {
			_.each(models, function(model) {
				if (coll.get(model)) {
					coll.remove(model);
				}				else {
					coll.trigger('relational:remove', model, coll);
				}
			}, this);
		}
	},

	/**
	 * Reset the `store` to it's original state. The `reverseRelations` are kept though, since attempting to
	 * re-initialize these on models would lead to a large amount of warnings.
	 */
	reset() {
		this.stopListening();

		// Unregister each collection to remove event listeners
		_.each(this._collections, function(coll) {
			this.unregister(coll);
		}, this);

		this._collections = [];
		this._subModels = [];
		this._modelScopes = [window];
	}
});
