/**	
 * Backbone-relational.js 0.2
 * (c) 2011 Paul Uithol
 * 
 * For all details and documentation: https://github.com/PaulUithol/Backbone-relational.
 * Depends on (as in, compeletely useless without) Backbone: https://github.com/documentcloud/backbone.
 */
(function( window ) {
	var Backbone = window.Backbone;
	
	Backbone.Lock = {
		_synchronize: 0,
		
		lock: function() {
			this._synchronize++;
		},
		
		unlock: function() {
			if ( this._synchronize === 0 ) {
				console && console.error( 'Object=%o is already unlocked', this );
				throw new Error('Object is already unlocked');
			}
			else {
				this._synchronize--;
			}
		},
		
		isLocked: function() {
			return this._synchronize > 0;
		}
	};
	
	/**
	 * Backbone.Store keeps track of all created (and destruction of) Backbone.RelationalModel.
	 * Handles lookup for relations.
	 */
	Backbone.Store =  function() {
		this._collections = [];
		this._reverseRelations = [];
	};
	
	// Set up all inheritable **Backbone.Store** properties and methods.
	_.extend(Backbone.Store.prototype, Backbone.Events, {
		_collections: null,
		_reverseRelations: null,
		
		/**
		 * Add a reverse relation. Is added to the 'relations' property on model's prototype, and to
		 * existing instances of 'model' in the store.
		 * @param {object} relation; required properties:
		 *  - model, type, key and relatedModel
		 */
		addReverseRelation: function( relation ) {
			
			
			var exists = _.any( this._reverseRelations, function( rel ) {
				return _.all( relation, function( val, key ) {
					return val === rel[ key ];
				});
			});
			
			if ( !exists && relation.model && relation.type ) {
				this._reverseRelations.push( relation );
				
				if ( !relation.model.prototype.relations ) {
					relation.model.prototype.relations = [];
				}
				relation.model.prototype.relations.push( relation );
				
				this.retroFitRelation( relation );
			}
		},
		
		/**
		 * Add a 'relation' to all existing instances of 'relation.model' in the store
		 */
		retroFitRelation: function( relation ) {
			var coll = this.getCollection( relation.model );
			
			coll.each( function( model ) {
				new relation.type( model, relation );
			}, this);
		},
		
		/**
		 * @param model
		 * @return {Backbone.Collection} A collection if found (or applicable for 'model'), or null
		 */
		getCollection: function( model ) {
			var coll =  _.detect( this._collections, function( c ) {
					// Check if model is the type itself (a ref to the constructor), or is of type c.model
					return model === c.model || model instanceof c.model;
				});
			
			if ( !coll ) {
				coll = this._createCollection( model );
			}
			
			return coll;
		},
		
		/**
		 * Find a type on the global object by name. Splits name on dots.
		 * @param {string} name
		 */
		getObjectByName: function( name ) {
			var type = _.reduce( name.split('.'), function( memo, val ) {
				return memo[ val ];
			}, window);
			return type !== window ? type: null;
		},
		
		_createCollection: function( type ) {
			var coll;
			
			// If we have an instance, take it's constructor
			if ( type instanceof Backbone.RelationalModel ) {
				type = type.constructor;
			}
			
			// Type should inherit from Backbone.RelationalModel.
			if ( type.prototype instanceof Backbone.RelationalModel.prototype.constructor ) {
				coll = new Backbone.Collection();
				coll.model = type;
				
				this._collections.push( coll );
			}
			
			return coll;
		},
		
		find: function( type, id ) {
			var coll = this.getCollection( type );
			return coll && coll.get( id );
		},
		
		register: function( model ) {
			var coll = this.getCollection( model );
			coll && coll._add( model );
		},
		
		unregister: function( model ) {
			var coll = this.getCollection( model );
			coll && coll.remove( model );
		}
	});
	Backbone.store = new Backbone.Store();
	
	/**
	 * The main Relation class, from which 'HasOne' and 'HasMany' inherit.
	 * @param {Backbone.RelationalModel} instance
	 * @param {object} options.
	 *  Required properties:
	 *    - {Backbone.RelationalModel} instance
	 *    - {string} key
	 *    - {Backbone.RelationalModel.constructor} relatedModel
	 *  Optional properties:
	 *    - {bool} includeInJSON: create objects from the contents of keys if the object is not found in Backbone.store.
	 *    - {bool} createModels: serialize the attributes for related model(s)' in toJSON on create/update, or just their ids.
	 *    - {object} reverseRelation: Specify a bi-directional relation. If provided, Relation will reciprocate
	 *        the relation to the 'relatedModel'. Required and optional properties match 'options', except for:
	 *        - {string|Backbone.Relation} type: 'HasOne' or 'HasMany'
	 */
	Backbone.Relation = function( instance, options ) {
		var dit = this;
		this.instance = instance;
		
		// Make sure 'options' is sane, and fill with defaults from subclasses and this object's prototype
		options = ( typeof options === 'object' && options ) || {};
		this.reverseRelation = _.defaults( options.reverseRelation || {}, this.options.reverseRelation );
		this.reverseRelation.type = _.isString( this.reverseRelation.type ) ? Backbone[ this.reverseRelation.type ] : this.reverseRelation.type;
		this.options = _.defaults( options, this.options, Backbone.Relation.prototype.options );
		
		this.key = this.options.key;
		this.keyContents = this.instance.get( this.key );
		
		// 'window' should be the global object where 'relatedModel' can be found on if given as a string.
		this.relatedModel = this.options.relatedModel;
		if ( _.isString( this.relatedModel ) ) {
			this.relatedModel = Backbone.store.getObjectByName( this.relatedModel )
		}
		
		if ( this.checkPreconditions() ) {
			// Add this Relation to instance._relations
			this.instance._relations.push( this );
		}
		else {
			return false;
		}
		
		// Add the reverse relation on 'relatedModel' to Backbone.store's reverseRelations
		if ( !this.options.isAutoRelation && this.reverseRelation.type && this.reverseRelation.key ) {
			Backbone.store.addReverseRelation( _.defaults( {
					isAutoRelation: true,
					model: this.relatedModel,
					relatedModel: this.instance.constructor,
					reverseRelation: this.options
				},
				this.reverseRelation // Take further properties from this.reverseRelation (type, key, etc.)
			) );
		}
		
		// When a model in the store is destroyed, check if it is 'this.instance'.
		Backbone.store.getCollection( this.instance ).bind( 'remove', function( model ) {
				if ( model === dit.instance ) {
					dit.destroy();
				}
			});
		
		// When 'relatedModel' are created or destroyed, check if it affects this relation.
		Backbone.store.getCollection( this.relatedModel )
			.bind( 'add', function( model, coll, options ) {
					// Wait until the relations on this instance are set up properly
					dit.instance.queue( function() {
						dit.tryAddRelated( model, options );
					});
				})
			.bind( 'remove', function( model, coll, options ) {
					dit.removeRelated( model, options );
				});
		
		this.initialize( this.options );
	};
	// Fix inheritance :\
	Backbone.Relation.extend = Backbone.Model.extend;
	
	// Set up all inheritable **Backbone.Relation** properties and methods.
	_.extend( Backbone.Relation.prototype, Backbone.Events, Backbone.Lock, {
		options: {
			createModels: true,
			includeInJSON: true,
			isAutoRelation: false
		},
		
		instance: null,
		
		key: null,
		keyContents: null,
		
		relatedModel: null,
		
		reverseRelation: null,
		
		related: null,
		
		/**
		 * Check several pre-conditions.
		 * @return {bool} True if pre-conditions are satisfied, false if they're not.
		 */
		checkPreconditions: function() {
			var i = this.instance, k = this.key, rm = this.relatedModel;
			if ( !i || !k || !rm ) {
				console && console.warn( 'Relation=%o; no instance, key or relatedModel (%o, %o, %o)', this, i, k, rm );
				return false;
			}
			// Check if 'instance' is a Backbone.RelationalModel
			if ( !( i instanceof Backbone.RelationalModel ) ) {
				console && console.warn( 'Relation=%o; instance=%o is not a Backbone.RelationalModel', this, i );
				return false;
			}
			// Check if the type in 'relatedModel' inherits from Backbone.RelationalModel.
			if ( !( rm.prototype instanceof Backbone.RelationalModel.prototype.constructor ) ) {
				console && console.warn( 'Relation=%o; relatedModel does not inherit from Backbone.RelationalModel (%o)', this, rm );
				return false;
			}
			// Check if this is not a HasMany, and the reverse relation is HasMany as well
			if ( this instanceof Backbone.HasMany && this.reverseRelation.type === Backbone.HasMany.prototype.constructor ) {
				console && console.warn( 'Relation=%o; relation is a HasMany, and the reverseRelation is HasMany as well.', this );
				return false;
			}
			// Check if we're not attempting to create a relationship twice (from two sides)
			if ( i._relations.length ) {
				var exists = _.any( i._relations, function( rel ) {
					return rel.instance === i && rel.relatedModel === rm && rel.key === k;
				}, this );
				
				if ( exists ) {
					console && console.warn( 'Relation=%o between instance=%o.%s and relatedModel=%o.%s already exists',
						this, i, k, rm, this.reverseRelation.key );
					return false;
				}
			}
			return true;
		},
		
		setRelated: function( related, options ) {
			this.related = related;
			var value = {};
			value[ this.key ] = related;
			this.instance.lock();
			this.instance.set( value, _.defaults( options || {}, { silent: true } ) );
			this.instance.unlock();
		},
		
		/**
		 * Try to figure out if a relation (on a different RelationalModel) is the reverse
		 * relation of the current one.
		 */
		_isReverseRelation: function( relation ) {
			if ( relation.instance instanceof this.relatedModel
					&& this.reverseRelation && this.reverseRelation.key === relation.key ) {
				return true;
			}
			return false;
		},
		
		/**
		 * Get the reverse relations (pointing back to 'this.instance') for the currently related model(s).
		 * @param model {Backbone.RelationalModel} Optional; get the reverse relations for a specific model.
		 *		If not specified, 'this.related' is used.
		 */
		getReverseRelations: function( model ) {
			var reverseRelations = [];
			var models = !_.isUndefined( model ) ? [ model ] : this.related && ( this.related.models || [ this.related ] );
			_.each( models , function( related ) {
				_.each( related.getRelations(), function( relation ) {
					if ( this._isReverseRelation( relation ) ) {
						reverseRelations.push( relation );
					}
				}, this );
			}, this );
			
			return reverseRelations;
		},
		
		// Cleanup. Get reverse relation, call removeRelated
		destroy: function() {
			_.each( this.getReverseRelations(), function( relation ) {
					relation.removeRelated( this.instance );
				}, this );
		}
	});
	
	Backbone.HasOne = Backbone.Relation.extend({
		options: {
			reverseRelation: { type: 'HasMany' }
		},
		
		initialize: function( options ) {
			_.bindAll( this, 'onChange' );
			this.instance.bind( 'change:' + this.key, this.onChange );
			this.instance.bind( 'silentChange:' + this.key, this.onChange );
			
			var model = this.findRelated();
			this.setRelated( model );
			
			// Notify new 'related' object of the new relation. Queued to allow other Relations on
			// 'this.instance' to set up before notifiying related models, which can expect them to be present.
			var dit = this;
			this.instance.queue( function() {
				_.each( dit.getReverseRelations(), function( relation ) {
						relation.addRelated( dit.instance, {} );
					} );
				});
		},
		
		findRelated: function() {
			var item = this.keyContents;
			var model = null;
			
			if ( item && ( _.isString( item ) || typeof( item ) === 'object' ) ) {
				// Try to find an instance of the appropriate 'relatedModel' in the store
				var id = _.isString( item ) ? item : item[ this.relatedModel.prototype.idAttribute ];
				model = Backbone.store.find( this.relatedModel, id );
				
				if ( !model && this.options.createModels && typeof( item ) === 'object' ) {
					model = new this.relatedModel( item );
				}
			}
			
			return model;
		},
		
		/**
		 * If the key is changed, notify old & new reverse relations and initialize the new relation
		 */
		onChange: function( model, attr, options ) {
			// 'options.related' is set by 'addRelated'/'removeRelated'. If it is set, the change
			// is the result of a call from a relation. If it's not, the change is the result of 
			// a 'set' call on this.instance.
			options = options || {};
			var changed = _.isUndefined( options.related );
			var oldRelated = changed ? this.related : options.related;
			
			if ( changed ) {	
				this.keyContents = this.instance.get( this.key );
				
				// Set new 'related'
				if ( attr instanceof this.relatedModel ) {
					this.related = attr;
				}
				else if ( attr ) {
					var related = this.findRelated();
					this.setRelated( related );
				}
				else {
					this.setRelated( null );
				}
			}
			
			// Notify old 'related' object of the terminated relation
			if ( oldRelated && this.related !== oldRelated ) {
				_.each( this.getReverseRelations( oldRelated ), function( relation ) {
						relation.removeRelated( this.instance, options );
					}, this );
			}
			
			// Notify new 'related' object of the new relation. Note we do re-apply even if this.related is oldRelated;
			// that can be necessary for bi-directional relations if 'this.instance' was created after 'this.related'.
			// In that case, 'this.instance' will already know 'this.related', but the reverse might not exist yet.
			_.each( this.getReverseRelations(), function( relation ) {
					relation.addRelated( this.instance, options );
				}, this);
			
			// Fire the 'update:<key>' event.
			!options.silentChange && this.instance.trigger( 'update:' + this.key, this.instance, this.related, options );
		},
		
		/**
		 * If a new 'this.relatedModel' appears in Backbone.store, try to match it to the original
		 * contents (well, at least since the last 'change') of the key on 'this.instance'.
		 */
		tryAddRelated: function( model, options ) {
			if ( this.related ) {
				return;
			}
			
			var item = this.keyContents;
			if ( item && ( _.isString( item ) || typeof( item ) === 'object' ) ) {
				var id = _.isString( item ) ? item : item[ this.relatedModel.prototype.idAttribute ];
				if ( model.id === id ) {
					this.setRelated( model );
				}
			}
		},
		
		addRelated: function( model, options ) {
			if ( model !== this.related ) {
				var oldRelated = this.related || null;
				this.setRelated( model );
				this.onChange( this.instance, model, { related: oldRelated } );
			}
		},
		
		removeRelated: function( model, options ) {
			if ( !this.related ) {
				return;
			}
			
			if ( model === this.related ) {
				var oldRelated = this.related || null;
				this.setRelated( null );
				this.onChange( this.instance, model, { related: oldRelated } );
			}
		}
	});
	
	Backbone.HasMany = Backbone.Relation.extend({
		options: {
			reverseRelation: { type: 'HasOne' }
		},
		
		initialize: function( options ) {
			_.bindAll( this, 'onChange', 'handleAddition', 'handleRemoval' );
			this.instance.bind( 'change:' + this.key, this.onChange );
			this.instance.bind( 'silentChange:' + this.key, this.onChange );
			
			this.setRelated( this.getNewCollection() );
			this.findRelated();
		},
		
		getNewCollection: function() {
			if ( this.related ) {
				this.related.unbind( 'add', this.handleAddition );
				this.related.unbind('remove', this.handleRemoval );
			}
			
			var related = new Backbone.Collection();
			related.model = this.relatedModel;
			related.bind( 'add', this.handleAddition );
			related.bind('remove', this.handleRemoval );
			return related;
		},
		
		findRelated: function() {
			if ( this.keyContents && _.isArray( this.keyContents ) ) {
				// Try to find instances of the appropriate 'relatedModel' in the store
				_.each( this.keyContents, function( item ) {
					var id = _.isString( item ) ? item : item[ this.relatedModel.prototype.idAttribute ];
					var model = id && Backbone.store.find( this.relatedModel, id );
					
					if ( !model && this.options.createModels && !_.isString( item ) ) {
						model = new this.relatedModel( item );
					}
					
					if ( model && !this.related.getByCid( model ) && !this.related.get( model ) ) {
						this.related._add( model );
					}
				}, this);
			}
		},
		
		/**
		 * If the key is changed, notify old & new reverse relations and initialize the new relation
		 */
		onChange: function( model, attr, options ) {
			this.keyContents = attr;
			
			// Notify old 'related' object of the terminated relation
			_.each( this.getReverseRelations(), function( relation ) {
					relation.removeRelated( this.instance, options );
				}, this );
			
			// Set new 'related'
			if ( attr instanceof Backbone.Collection ) {
				this.related.unbind( 'add', this.handleAddition );
				this.related.unbind('remove', this.handleRemoval );
				this.related = attr;
				this.related.bind( 'add', this.handleAddition );
				this.related.bind( 'remove', this.handleRemoval );
			}
			else {
				this.setRelated( this.getNewCollection() );
				this.findRelated();
			}
			
			// Notify new 'related' object of the new relation
			_.each( this.getReverseRelations(), function( relation ) {
					relation.addRelated( this.instance, options );
				}, this );
			
			!options.silentChange&& this.instance.trigger( 'update:' + this.key, this.instance, this.related, options );
		},
		
		tryAddRelated: function( model ) {
			if ( !this.related.getByCid( model ) && !this.related.get( model ) ) {
				// Check if this new model was specified in 'this.keyContents'
				var item = _.any( this.keyContents, function( item ) {
					var id = _.isString( item ) ? item : item[ this.relatedModel.prototype.idAttribute ];
					return id && id === model.id;
				}, this );
				
				if ( item ) {
					this.related._add( model );
				}
			}
		},
		
		/**
		 * When a model is added to a 'HasMany', trigger 'add' on 'this.instance' and notify reverse relations.
		 * (should be 'HasOne', must set 'this.instance' as their related).
		 */
		handleAddition: function( model, coll, options ) {
			options = options || {};
			var dit = this;
			this.instance.queue( function() {
				_.each( dit.getReverseRelations( model ), function( relation ) {
						relation.addRelated( dit.instance, options );
					}, dit );
				
				// Only trigger 'add' once the newly added model is initialized (so, has it's relations set up)
				model.queue( function() {
					!options.silentChange && dit.instance.trigger( 'add:' + dit.key, model, dit.related, options );
				});
			});
		},
		
		/**
		 * When a model is removed from a 'HasMany', trigger 'remove' on 'this.instance' and notify reverse relations.
		 * (should be 'HasOne', which should be nullified)
		 */
		handleRemoval: function( model, coll, options ) {
			options = options || {};
			
			_.each( this.getReverseRelations( model ), function( relation ) {
					relation.removeRelated( this.instance, options );
				}, this );
			
			!options.silentChange && this.instance.trigger( 'remove:' + this.key, model, this.related, options );
		},
		
		addRelated: function( model, options ) {
			if ( !this.related.getByCid( model ) && !this.related.get( model.id ) ) {
				this.related._add( model, options );
			}
		},
		
		removeRelated: function( model, options ) {
			if ( this.related.getByCid( model ) || this.related.get( model.id ) ) {
				this.related.remove( model, options );
			}
		}
	});
	
	/**
	 * New events:
	 *  - 'add:<key>' (model, coll)
	 *  - 'remove:<key>' (model, coll)
	 */
	Backbone.RelationalModel = Backbone.Model.extend({
		relations: null, // Relation descriptions on the prototype
		_relations: null, // Relation instances
		_isInitialized: false,
		_deferProcessing: false,
		_queue: null,
		
		constructor: function( attributes, options ) {
			// Nasty hack :\
			// Defer 'processQueue', so that when 'Relation.createModels' is used we:
			// a) Survive 'Backbone.Collection._add'; this takes care we won't error on "can't add model to a set twice"
			//    (by creating a model from properties, having the model add itself to the collection via one of
			//    it's relations, then trying to add it to the collection).
			// b) Trigger 'HasMany' collection events only after the model is really fully set up.
			// Example that triggers both a and b: "p.get('jobs').add( { company: c, person: p } )".
			if ( options && options.collection ) {
				this._deferProcessing = true;
				
				var dit = this;
				var processQueue = function( model, coll ) {
					if ( model === dit ) {
						dit.processQueue();
					}
					options.collection.unbind( 'add', processQueue );
				};
				options.collection.bind( 'add', processQueue );
				
				// To make sure we do process the queue eventually, even if this model didn't get added to the collection..
				_.defer( function() {
					processQueue( dit );
				});
			}
			
			this._queue = [];
			Backbone.Model.prototype.constructor.apply( this, arguments );
		},
		
		/**
		 * Initialize Relations present in this.relations; determine the type (HasOne/HasMany), then create a new instance.
		 * The regular constructor (which fills this.attributes, initialize, etc) hasn't run yet at this time!
		 */
		initializeRelations: function() {
			this.lock(); // Lock; setting up relations often also involve calls to 'set'
			this._relations = [];
			
			Backbone.store.register( this );
			
			_.each( this.relations, function( rel ) {
				var type = rel.type && ( _.isString( rel.type ) ? Backbone[ rel.type ] : rel.type );
				if ( type.prototype instanceof Backbone.Relation.prototype.constructor ) {
					new type( this, rel ); // Also pushes the new Relation into _relations
				}
			}, this );
			
			this._isInitialized = true;
			this.unlock();
			
			if ( !this._deferProcessing ) {
				this.processQueue();
			}
		},
		
		/**
		 * Either add to the queue (if 'this.instance' isn't initialized yet, or execute right away.
		 */
		queue: function( func ) {
			if ( !this._isInitialized ) {
				this._queue.push( func );
			}
			else {
				func();
			}
		},
		
		/**
		 * Process _queue
		 */
		processQueue: function() {
			while ( this._queue && this._queue.length ) {
				this._queue.shift()();
			}
		},
		
		getRelations: function() {
			return this._relations;
		},
		
		set: function( attributes, options ) {
			var result = Backbone.Model.prototype.set.apply( this, arguments );
			
			// Do notify this model's relations, even if options.silent is set.
			// Relation.setRelated locks this model to prevent loops; this whole thing is a bit of a hack.. 
			if( this._isInitialized && this._changed && options.silent && !this.isLocked() ) {
				// Remove options.silent, to make sure add/remove events propagate properly in HasMany
				// relations from 'addRelated'->'handleAddition'
				options.silentChange = options.silent;
				delete options.silent;
				
				var changed = this.changedAttributes();
				_.each( changed, function( val, key ) {
					this.trigger('silentChange:' + key, this, val, options );
				}, this );
			}
			
			// 'set' is called in Backbone.Model.prototype.constructor, before 'initialize'; '_changed'
			// is reset right after 'set'. Ideal place to set up relations :)
			// (btw: '_relations' can't be used to check if relations are initialized since a reverse relation
			// may have been created on this model already)
			if ( !this._isInitialized && !this.isLocked() && this.relations ) {
				this.initializeRelations();
			}
			
			return result;
		},
		
		destroy: function( options ) {
			Backbone.store.unregister( this );
			return Backbone.Model.prototype.destroy.call( this, options );
		},
		
		/**
		 * Convert relations to JSON, omits them when required
		 */
		toJSON: function() {
			// If this Model has already been serialized in this branch, return to avoid loops
			if ( this.isLocked() ) {
				return this.id;
			}
			
			var json = Backbone.Model.prototype.toJSON.call( this );
			
			_.each( this._relations, function( rel ) {
					var value = json[ rel.key ];
					
					if ( rel.options.includeInJSON && value && _.isFunction( value.toJSON ) ) {
						this.lock();
						json[ rel.key ] = value.toJSON();
						this.unlock();
					}
					else if ( value instanceof Backbone.Collection ) {
						json[ rel.key ] = value.pluck( value.model.prototype.idAttribute );
					}
					else if ( value instanceof Backbone.Model ) {
						json[ rel.key ] = value.id;
					}
				}, this );
			
			return json;
		}
	});
	_.extend( Backbone.RelationalModel.prototype, Backbone.Lock );
})( this );