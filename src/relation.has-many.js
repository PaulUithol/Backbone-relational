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

	initialize: function( opts ) {
		this.listenTo( this.instance, 'relational:change:' + this.key, this.onChange );

		// Handle a custom 'collectionType'
		this.collectionType = this.options.collectionType;
		if ( _.isFunction( this.collectionType ) && this.collectionType !== Collection && !( this.collectionType.prototype instanceof Collection ) ) {
			this.collectionType = _.result( this, 'collectionType' );
		}
		if ( _.isString( this.collectionType ) ) {
			this.collectionType = store.getObjectByName( this.collectionType );
		}
		if ( this.collectionType !== Collection && !( this.collectionType.prototype instanceof Collection ) ) {
			throw new Error( '`collectionType` must inherit from Collection' );
		}

		var related = this.findRelated( opts );
		this.setRelated( related );
	},

	/**
	 * Bind events and setup collectionKeys for a collection that is to be used as the backing store for a HasMany.
	 * If no 'collection' is supplied, a new collection will be created of the specified 'collectionType' option.
	 * @param {Collection} [collection]
	 * @return {Collection}
	 */
	_prepareCollection: function( collection ) {
		if ( this.related ) {
			this.stopListening( this.related );
		}

		if ( !collection || !( collection instanceof Collection ) ) {
			var options = _.isFunction( this.options.collectionOptions ) ?
				this.options.collectionOptions( this.instance ) : this.options.collectionOptions;

			collection = new this.collectionType( null, options );
		}

		collection.model = this.relatedModel;

		if ( this.options.collectionKey ) {
			var key = this.options.collectionKey === true ? this.options.reverseRelation.key : this.options.collectionKey;

			if ( collection[ key ] && collection[ key ] !== this.instance ) {
				if ( config.showWarnings && typeof console !== 'undefined' ) {
					console.warn( 'Relation=%o; collectionKey=%s already exists on collection=%o', this, key, this.options.collectionKey );
				}
			}
			else if ( key ) {
				collection[ key ] = this.instance;
			}
		}

		this.listenTo( collection, 'relational:add', this.handleAddition )
			.listenTo( collection, 'relational:remove', this.handleRemoval )
			.listenTo( collection, 'relational:reset', this.handleReset );

		return collection;
	},

	/**
	 * Find related Models.
	 * @param {Object} [options]
	 * @return {Collection}
	 */
	findRelated: function( options ) {
		var related = null;

		options = _.defaults( { parse: this.options.parse }, options );

		// Replace 'this.related' by 'this.keyContents' if it is a Collection
		if ( this.keyContents instanceof Collection ) {
			this._prepareCollection( this.keyContents );
			related = this.keyContents;
		}
		// Otherwise, 'this.keyContents' should be an array of related object ids.
		// Re-use the current 'this.related' if it is a Collection; otherwise, create a new collection.
		else {
			var toAdd = [];

			_.each( this.keyContents, _.bind(function( attributes ) {
				var model = null;

				if ( attributes instanceof this.relatedModel ) {
					model = attributes;
				}
				else {
					// If `merge` is true, update models here, instead of during update.
					model = ( _.isObject( attributes ) && options.parse && this.relatedModel.prototype.parse ) ?
						this.relatedModel.prototype.parse( _.clone( attributes ), options ) : attributes;
				}

				model && toAdd.push( model );
			}, this ));

			if ( this.related instanceof Collection ) {
				related = this.related;
			}
			else {
				related = this._prepareCollection();
			}

			// By now, `parse` will already have been executed just above for models if specified.
			// Disable to prevent additional calls.
			related.set( toAdd, _.defaults( { parse: false }, options ) );
		}

		// Remove entries from `keyIds` that were already part of the relation (and are thus 'unchanged')
		this.keyIds = _.difference( this.keyIds, _.map( related.models, 'id' ) );

		return related;
	},

	/**
	 * Normalize and reduce `keyContents` to a list of `ids`, for easier comparison
	 * @param {String|Number|String[]|Number[]|Collection} keyContents
	 */
	setKeyContents: function( keyContents ) {
		this.keyContents = keyContents instanceof Collection ? keyContents : null;
		this.keyIds = [];

		if ( !this.keyContents && ( keyContents || keyContents === 0 ) ) { // since 0 can be a valid `id` as well
			// Handle cases the an API/user supplies just an Object/id instead of an Array
			this.keyContents = _.isArray( keyContents ) ? keyContents : [ keyContents ];

			_.each( this.keyContents, _.bind(function( item ) {
				var itemId = store.resolveIdForItem( this.relatedModel, item );
				if ( itemId || itemId === 0 ) {
					this.keyIds.push( itemId );
				}
			}, this ));
		}
	},

	/**
	 * Event handler for `change:<key>`.
	 * If the contents of the key are changed, notify old & new reverse relations and initialize the new relation.
	 */
	onChange: function( model, attr, options ) {
		options = options ? _.clone( options ) : {};
		this.setKeyContents( attr );
		this.changed = false;

		var related = this.findRelated( options );
		this.setRelated( related );

		if ( !options.silent ) {
			var dit = this;
			eventQueue.add( function() {
				// The `changed` flag can be set in `handleAddition` or `handleRemoval`
				if ( dit.changed ) {
					dit.instance.trigger( 'change:' + dit.key, dit.instance, dit.related, options, true );
					dit.changed = false;
				}
			});
		}
	},

	/**
	 * When a model is added to a 'HasMany', trigger 'add' on 'this.instance' and notify reverse relations.
	 * (should be 'HasOne', must set 'this.instance' as their related).
	 */
	handleAddition: function( model, coll, options ) {
		//console.debug('handleAddition called; args=%o', arguments);
		options = options ? _.clone( options ) : {};
		this.changed = true;

		_.each( this.getReverseRelations( model ), _.bind(function( relation ) {
			relation.addRelated( this.instance, options );
		}, this ));

		// Only trigger 'add' once the newly added model is initialized (so, has its relations set up)
		var dit = this;
		!options.silent && eventQueue.add( function() {
			dit.instance.trigger( 'add:' + dit.key, model, dit.related, options );
		});
	},

	/**
	 * When a model is removed from a 'HasMany', trigger 'remove' on 'this.instance' and notify reverse relations.
	 * (should be 'HasOne', which should be nullified)
	 */
	handleRemoval: function( model, coll, options ) {
		//console.debug('handleRemoval called; args=%o', arguments);
		options = options ? _.clone( options ) : {};
		this.changed = true;

		_.each( this.getReverseRelations( model ), _.bind(function( relation ) {
			relation.removeRelated( this.instance, null, options );
		}, this ));

		var dit = this;
		!options.silent && eventQueue.add( function() {
			dit.instance.trigger( 'remove:' + dit.key, model, dit.related, options );
		});
	},

	handleReset: function( coll, options ) {
		var dit = this;
		options = options ? _.clone( options ) : {};
		!options.silent && eventQueue.add( function() {
			dit.instance.trigger( 'reset:' + dit.key, dit.related, options );
		});
	},

	tryAddRelated: function( model, coll, options ) {
		var item = _.includes( this.keyIds, model.id );

		if ( item ) {
			this.addRelated( model, options );
			this.keyIds = _.without( this.keyIds, model.id );
		}
	},

	addRelated: function( model, options ) {
		// Allow 'model' to set up its relations before proceeding.
		// (which can result in a call to 'addRelated' from a relation of 'model')
		var dit = this;
		model.queue( function() {
			if ( dit.related && !dit.related.get( model ) ) {
				dit.related.add( model, _.defaults( { parse: false }, options ) );
			}
		});
	},

	removeRelated: function( model, coll, options ) {
		if ( this.related.get( model ) ) {
			this.related.remove( model, options );
		}
	}
});
