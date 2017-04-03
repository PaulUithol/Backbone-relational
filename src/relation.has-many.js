import _ from 'underscore';
import Relation from './relation';
import store from './store';
import eventQueue from './event-queue';
import Collection from './collection';
import config from './config';

export default Relation.extend({
	collectionType: null,

	options: {
		reverseRelation: { type: 'HasOne' },
		collectionType: Collection,
		collectionKey: true,
		collectionOptions: {}
	},

	initialize(opts) {
		this.listenTo(this.instance, 'relational:change:' + this.key, this.onChange);

		// Handle a custom 'collectionType'
		this.collectionType = this.options.collectionType;
		if (_.isFunction(this.collectionType) && this.collectionType !== Collection && !(this.collectionType.prototype instanceof Collection)) {
			this.collectionType = _.result(this, 'collectionType');
		}
		if (_.isString(this.collectionType)) {
			this.collectionType = store.getObjectByName(this.collectionType);
		}
		if (this.collectionType !== Collection && !(this.collectionType.prototype instanceof Collection)) {
			throw new Error('`collectionType` must inherit from Collection');
		}

		let related = this.findRelated(opts);
		this.setRelated(related);
	},

	/**
	 * Bind events and setup collectionKeys for a collection that is to be used as the backing store for a HasMany.
	 * If no 'collection' is supplied, a new collection will be created of the specified 'collectionType' option.
	 * @param {Collection} [collection]
	 * @return {Collection}
	 */
	_prepareCollection(collection) {
		if (this.related) {
			this.stopListening(this.related);
		}

		if (!collection || !(collection instanceof Collection)) {
			let options = _.isFunction(this.options.collectionOptions) ?
				this.options.collectionOptions(this.instance) : this.options.collectionOptions;

			collection = new this.collectionType(null, options);
		}

		collection.model = this.relatedModel;

		if (this.options.collectionKey) {
			let key = this.options.collectionKey === true ? this.options.reverseRelation.key : this.options.collectionKey;

			if (collection[ key ] && collection[ key ] !== this.instance) {
				if (config.showWarnings && typeof console !== 'undefined') {
					console.warn('Relation=%o; collectionKey=%s already exists on collection=%o', this, key, this.options.collectionKey);
				}
			} else if (key) {
				collection[ key ] = this.instance;
			}
		}

		this.listenTo(collection, 'relational:add', this.handleAddition)
			.listenTo(collection, 'relational:remove', this.handleRemoval)
			.listenTo(collection, 'relational:reset', this.handleReset);

		return collection;
	},

	/**
	 * Find related Models.
	 * @param {Object} [options]
	 * @return {Collection}
	 */
	findRelated(options) {
		let related = null;

		options = _.defaults({ parse: this.options.parse }, options);

		// Replace 'this.related' by 'this.keyContents' if it is a Collection
		// Otherwise, 'this.keyContents' should be an array of related object ids.
		// Re-use the current 'this.related' if it is a Collection; otherwise, create a new collection.
		if (this.keyContents instanceof Collection) {
			this._prepareCollection(this.keyContents);
			related = this.keyContents;
		} else {
			let toAdd = [];

			_.each(this.keyContents, (attributes) => {
				let model = null;

				if (attributes instanceof this.relatedModel) {
					model = attributes;
				} else {
					// If `merge` is true, update models here, instead of during update.
					model = (_.isObject(attributes) && options.parse && this.relatedModel.prototype.parse) ?
						this.relatedModel.prototype.parse(_.clone(attributes), options) : attributes;
				}

				model && toAdd.push(model);
			});

			if (this.related instanceof Collection) {
				related = this.related;
			} else {
				related = this._prepareCollection();
			}

			// By now, `parse` will already have been executed just above for models if specified.
			// Disable to prevent additional calls.
			related.set(toAdd, _.defaults({ parse: false }, options));
		}

		// Remove entries from `keyIds` that were already part of the relation (and are thus 'unchanged')
		this.keyIds = _.difference(this.keyIds, _.pluck(related.models, 'id'));

		return related;
	},

	/**
	 * Normalize and reduce `keyContents` to a list of `ids`, for easier comparison
	 * @param {String|Number|String[]|Number[]|Collection} keyContents
	 */
	setKeyContents(keyContents) {
		this.keyContents = keyContents instanceof Collection ? keyContents : null;
		this.keyIds = [];

		if (!this.keyContents && (keyContents || keyContents === 0)) { // since 0 can be a valid `id` as well
			// Handle cases the an API/user supplies just an Object/id instead of an Array
			this.keyContents = _.isArray(keyContents) ? keyContents : [keyContents];

			_.each(this.keyContents, (item) => {
				let itemId = store.resolveIdForItem(this.relatedModel, item);
				if (itemId || itemId === 0) {
					this.keyIds.push(itemId);
				}
			});
		}
	},

	/**
	 * Event handler for `change:<key>`.
	 * If the contents of the key are changed, notify old & new reverse relations and initialize the new relation.
	 */
	onChange(model, attr, options) {
		options = options ? _.clone(options) : {};
		this.setKeyContents(attr);
		this.changed = false;

		let related = this.findRelated(options);
		this.setRelated(related);

		if (!options.silent) {
			eventQueue.add(() => {
				// The `changed` flag can be set in `handleAddition` or `handleRemoval`
				if (this.changed) {
					this.instance.trigger('change:' + this.key, this.instance, this.related, options, true);
					this.changed = false;
				}
			});
		}
	},

	/**
	 * When a model is added to a 'HasMany', trigger 'add' on 'this.instance' and notify reverse relations.
	 * (should be 'HasOne', must set 'this.instance' as their related).
	 */
	handleAddition(model, coll, options) {
		//console.debug('handleAddition called; args=%o', arguments);
		options = options ? _.clone(options) : {};
		this.changed = true;

		_.each(this.getReverseRelations(model), (relation) => {
			relation.addRelated(this.instance, options);
		});

		// Only trigger 'add' once the newly added model is initialized (so, has its relations set up)
		!options.silent && eventQueue.add(() => {
			this.instance.trigger('add:' + this.key, model, this.related, options);
		});
	},

	/**
	 * When a model is removed from a 'HasMany', trigger 'remove' on 'this.instance' and notify reverse relations.
	 * (should be 'HasOne', which should be nullified)
	 */
	handleRemoval(model, coll, options) {
		//console.debug('handleRemoval called; args=%o', arguments);
		options = options ? _.clone(options) : {};
		this.changed = true;

		_.each(this.getReverseRelations(model), function(relation) {
			relation.removeRelated(this.instance, null, options);
		}, this);

		!options.silent && eventQueue.add(() => {
			this.instance.trigger('remove:' + this.key, model, this.related, options);
		});
	},

	handleReset(coll, options) {
		options = options ? _.clone(options) : {};
		!options.silent && eventQueue.add(() => {
			this.instance.trigger('reset:' + this.key, this.related, options);
		});
	},

	tryAddRelated(model, coll, options) {
		let item = _.contains(this.keyIds, model.id);

		if (item) {
			this.addRelated(model, options);
			this.keyIds = _.without(this.keyIds, model.id);
		}
	},

	addRelated(model, options) {
		// Allow 'model' to set up its relations before proceeding.
		// (which can result in a call to 'addRelated' from a relation of 'model')
		model.queue(() => {
			if (this.related && !this.related.get(model)) {
				this.related.add(model, _.defaults({ parse: false }, options));
			}
		});
	},

	removeRelated(model, coll, options) {
		if (this.related.get(model)) {
			this.related.remove(model, options);
		}
	}
});
