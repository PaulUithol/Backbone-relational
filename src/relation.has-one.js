import _ from './utils/underscore-compat';
import Relation from './relation';
import store from './store';
import eventQueue from './event-queue';

export default Relation.extend({
	options: {
		reverseRelation: { type: 'HasMany' }
	},

	initialize(opts) {
		this.listenTo(this.instance, 'relational:change:' + this.key, this.onChange);

		let related = this.findRelated(opts);
		this.setRelated(related);

		// Notify new 'related' object of the new relation.
		_.each(this.getReverseRelations(), (relation) => {
			relation.addRelated(this.instance, opts);
		});
	},

	/**
	 * Find related Models.
	 * @param {Object} [options]
	 * @return {Backbone.Model}
	 */
	findRelated(options) {
		let related = null;

		options = _.defaults({ parse: this.options.parse }, options);

		if (this.keyContents instanceof this.relatedModel) {
			related = this.keyContents;
		} else if (this.keyContents || this.keyContents === 0) { // since 0 can be a valid `id` as well
			let opts = _.defaults({ create: this.options.createModels }, options);
			related = this.relatedModel.findOrCreate(this.keyContents, opts);
		}

		// Nullify `keyId` if we have a related model; in case it was already part of the relation
		if (related) {
			this.keyId = null;
		}

		return related;
	},

	/**
	 * Normalize and reduce `keyContents` to an `id`, for easier comparison
	 * @param {String|Number|Backbone.Model} keyContents
	 */
	setKeyContents(keyContents) {
		this.keyContents = keyContents;
		this.keyId = store.resolveIdForItem(this.relatedModel, this.keyContents);
	},

	/**
	 * Event handler for `change:<key>`.
	 * If the key is changed, notify old & new reverse relations and initialize the new relation.
	 */
	onChange(model, attr, options) {
		// Don't accept recursive calls to onChange (like onChange->findRelated->findOrCreate->initializeRelations->addRelated->onChange)
		if (this.isLocked()) {
			return;
		}
		this.acquire();
		options = options ? _.clone(options) : {};

		// 'options.__related' is set by 'addRelated'/'removeRelated'. If it is set, the change
		// is the result of a call from a relation. If it's not, the change is the result of
		// a 'set' call on this.instance.
		let changed = _.isUndefined(options.__related);
		let oldRelated = changed ? this.related : options.__related;

		if (changed) {
			this.setKeyContents(attr);
			let related = this.findRelated(options);
			this.setRelated(related);
		}

		// Notify old 'related' object of the terminated relation
		if (oldRelated && this.related !== oldRelated) {
			_.each(this.getReverseRelations(oldRelated), (relation) => {
				relation.removeRelated(this.instance, null, options);
			});
		}

		// Notify new 'related' object of the new relation. Note we do re-apply even if this.related is oldRelated;
		// that can be necessary for bi-directional relations if 'this.instance' was created after 'this.related'.
		// In that case, 'this.instance' will already know 'this.related', but the reverse might not exist yet.
		_.each(this.getReverseRelations(), (relation) => {
			relation.addRelated(this.instance, options);
		});

		// Fire the 'change:<key>' event if 'related' was updated
		if (!options.silent && this.related !== oldRelated) {
			this.changed = true;
			eventQueue.add(() => {
				this.instance.trigger('change:' + this.key, this.instance, this.related, options, true);
				this.changed = false;
			});
		}
		this.release();
	},

	/**
	 * If a new 'this.relatedModel' appears in the 'store', try to match it to the last set 'keyContents'
	 */
	tryAddRelated(model, coll, options) {
		if ((this.keyId || this.keyId === 0) && model.id === this.keyId) { // since 0 can be a valid `id` as well
			this.addRelated(model, options);
			this.keyId = null;
		}
	},

	addRelated(model, options) {
		// Allow 'model' to set up its relations before proceeding.
		// (which can result in a call to 'addRelated' from a relation of 'model')
		model.queue(() => {
			if (model !== this.related) {
				let oldRelated = this.related || null;
				this.setRelated(model);
				this.onChange(this.instance, model, _.defaults({ __related: oldRelated }, options));
			}
		});
	},

	removeRelated(model, coll, options) {
		if (!this.related) {
			return;
		}

		if (model === this.related) {
			let oldRelated = this.related || null;
			this.setRelated(null);
			this.onChange(this.instance, model, _.defaults({ __related: oldRelated }, options));
		}
	}
});
