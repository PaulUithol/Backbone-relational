import _ from 'underscore';
import Semaphore from './utils/semaphore';
import BObject from './utils/object';
import relationTypeStore from './relation-type-store';
import store from './store';
import config from './config';

/**
 * The main Relation class, from which 'HasOne' and 'HasMany' inherit. Internally, 'relational:<key>' events
 * are used to regulate addition and removal of models from relations.
 *
 * @param {Backbone.Relational.Model} [instance] Model that this relation is created for. If no model is supplied,
 *      Relation just tries to instantiate it's `reverseRelation` if specified, and bails out after that.
 * @param {Object} options
 * @param {string} options.key
 * @param {Backbone.Relational.Model.constructor} options.relatedModel
 * @param {Boolean|String} [options.includeInJSON=true] Serialize the given attribute for related model(s)' in toJSON, or just their ids.
 * @param {Boolean} [options.createModels=true] Create objects from the contents of keys if the object is not found in Backbone.store.
 * @param {Object} [options.reverseRelation] Specify a bi-directional relation. If provided, Relation will reciprocate
 *    the relation to the 'relatedModel'. Required and optional properties match 'options', except that it also needs
 *    {Backbone.Relation|String} type ('HasOne' or 'HasMany').
 * @param {Object} opts
 */
export default BObject.extend( Semaphore ).extend({
	instance: null,
	key: null,
	keyContents: null,
	relatedModel: null,
	relatedCollection: null,
	reverseRelation: null,
	related: null,

	constructor( instance, options, opts ) {
		this.instance = instance;
		// Make sure 'options' is sane, and fill with defaults from subclasses and this object's prototype
		options = _.isObject( options ) ? options : {};
		this.reverseRelation = _.defaults( options.reverseRelation || {}, this.options.reverseRelation );
		this.options = _.defaults( options, this.options, {
			createModels: true,
			includeInJSON: true,
			isAutoRelation: false,
			autoFetch: false,
			parse: false
		});

		// TODO: handle this logic else where. it's crazy to have a parent depend on its children!!
		if ( _.isString( this.reverseRelation.type ) ) {
			this.reverseRelation.type = relationTypeStore.find( this.reverseRelation.type ) || store.getObjectByName( this.reverseRelation.type );
		}

		this.key = this.options.key;
		this.keySource = this.options.keySource || this.key;
		this.keyDestination = this.options.keyDestination || this.keySource || this.key;

		this.model = this.options.model || this.instance.constructor;

		this.relatedModel = this.options.relatedModel;

		if ( _.isUndefined( this.relatedModel ) ) {
			this.relatedModel = this.model;
		}

		// if ( _.isFunction( this.relatedModel ) && !( this.relatedModel.prototype instanceof Backbone.Model ) ) {
		// 	this.relatedModel = _.result( this, 'relatedModel' );
		// }
		if ( _.isString( this.relatedModel ) ) {
			this.relatedModel = store.getObjectByName( this.relatedModel );
		}

		if ( !this.checkPreconditions() ) {
			return;
		}

		// Add the reverse relation on 'relatedModel' to the store's reverseRelations
		if ( !this.options.isAutoRelation && this.reverseRelation.type && this.reverseRelation.key ) {
			store.addReverseRelation( _.defaults({
					isAutoRelation: true,
					model: this.relatedModel,
					relatedModel: this.model,
					reverseRelation: this.options // current relation is the 'reverseRelation' for its own reverseRelation
				},
				this.reverseRelation // Take further properties from this.reverseRelation (type, key, etc.)
			) );
		}

		if ( instance ) {
			var contentKey = this.keySource;
			if ( contentKey !== this.key && _.isObject( this.instance.get( this.key ) ) ) {
				contentKey = this.key;
			}

			this.setKeyContents( this.instance.get( contentKey ) );
			this.relatedCollection = store.getCollection( this.relatedModel );

			// Explicitly clear 'keySource', to prevent a leaky abstraction if 'keySource' differs from 'key'.
			if ( this.keySource !== this.key ) {
				delete this.instance.attributes[ this.keySource ];
			}

			// Add this Relation to instance._relations
			this.instance._relations[ this.key ] = this;

			this.initialize( opts );

			if ( this.options.autoFetch ) {
				this.instance.getAsync( this.key, _.isObject( this.options.autoFetch ) ? this.options.autoFetch : {} );
			}

			// When 'relatedModel' are created or destroyed, check if it affects this relation.
			this.listenTo( this.instance, 'destroy', this.destroy )
				.listenTo( this.relatedCollection, 'relational:add relational:change:id', this.tryAddRelated )
				.listenTo( this.relatedCollection, 'relational:remove', this.removeRelated );
		}
	},

	/**
	 * Check several pre-conditions.
	 * @return {Boolean} True if pre-conditions are satisfied, false if they're not.
	 */
	checkPreconditions: function() {
		var i = this.instance,
			k = this.key,
			m = this.model,
			rm = this.relatedModel,
			warn = config.showWarnings && typeof console !== 'undefined';

		if ( !m || !k || !rm ) {
			warn && console.warn( 'Relation=%o: missing model, key or relatedModel (%o, %o, %o).', this, m, k, rm );
			return false;
		}
		// Check if the type in 'model' inherits from Backbone.Relational.Model
		// if ( !( m.prototype instanceof module.Model ) ) {
		// 	warn && console.warn( 'Relation=%o: model does not inherit from Backbone.Relational.Model (%o).', this, i );
		// 	return false;
		// }
		// Check if the type in 'relatedModel' inherits from Backbone.Relational.Model
		// if ( !( rm.prototype instanceof module.Model ) ) {
		// 	warn && console.warn( 'Relation=%o: relatedModel does not inherit from Backbone.Relational.Model (%o).', this, rm );
		// 	return false;
		// }
		// Check if this is not a HasMany, and the reverse relation is HasMany as well
		// TODO: handle this logic elsewhere!
		if ( this instanceof relationTypeStore.find('HasMany') && this.reverseRelation.type === relationTypeStore.find('HasMany') ) {
			warn && console.warn( 'Relation=%o: relation is a HasMany, and the reverseRelation is HasMany as well.', this );
			return false;
		}
		// Check if we're not attempting to create a relationship on a `key` that's already used.
		if ( i && _.keys( i._relations ).length ) {
			var existing = _.find( i._relations, function( rel ) {
				return rel.key === k;
			}, this );

			if ( existing ) {
				warn && console.warn( 'Cannot create relation=%o on %o for model=%o: already taken by relation=%o.',
					this, k, i, existing );
				return false;
			}
		}

		return true;
	},

	/**
	 * Set the related model(s) for this relation
	 * @param {Backbone.Model|Backbone.Relational.Collection} related
	 */
	setRelated: function( related ) {
		this.related = related;
		this.instance.attributes[ this.key ] = related;
	},

	/**
	 * Determine if a relation (on a different RelationalModel) is the reverse
	 * relation of the current one.
	 * @param {Backbone.Relation} relation
	 * @return {Boolean}
	 */
	_isReverseRelation: function( relation ) {
		return relation.instance instanceof this.relatedModel && this.reverseRelation.key === relation.key &&
			this.key === relation.reverseRelation.key;
	},

	/**
	 * Get the reverse relations (pointing back to 'this.key' on 'this.instance') for the currently related model(s).
	 * @param {Backbone.Relational.Model} [model] Get the reverse relations for a specific model.
	 *    If not specified, 'this.related' is used.
	 * @return {Backbone.Relation[]}
	 */
	getReverseRelations: function( model ) {
		var reverseRelations = [];
		// Iterate over 'model', 'this.related.models' (if this.related is a Backbone.Relational.Collection), or wrap 'this.related' in an array.
		var models = !_.isUndefined( model ) ? [ model ] : this.related && ( this.related.models || [ this.related ] ),
			relations = null,
			relation = null;

		for ( var i = 0; i < ( models || [] ).length; i++ ) {
			relations = models[ i ].getRelations() || [];

			for ( var j = 0; j < relations.length; j++ ) {
				relation = relations[ j ];


				if ( this._isReverseRelation( relation ) ) {
					reverseRelations.push( relation );
				}
			}
		}

		return reverseRelations;
	},

	/**
	 * When `this.instance` is destroyed, cleanup our relations.
	 * Get reverse relation, call removeRelated on each.
	 */
	destroy: function() {
		this.stopListening();

		if ( this instanceof relationTypeStore.find( 'HasOne' ) ) {
			this.setRelated( null );
		}
		else if ( this instanceof relationTypeStore.find( 'HasMany' ) ) {
			this.setRelated( this._prepareCollection() );
		}

		_.each( this.getReverseRelations(), function( relation ) {
			relation.removeRelated( this.instance );
		}, this );
	}
});
