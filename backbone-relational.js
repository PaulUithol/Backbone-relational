(function( window ) {
	var Backbone = this.Backbone || {};
	
	/**
	 * Backbone.Store keeps track of all created (and destruction of) Backbone.RelationalModel.
	 * Handles lookup for relations.
	 */
	Backbone.Store =  function( options ) {
		options = options || {};
		this.initialize( options );
	};
	
	// Set up all inheritable **Backbone.Store** properties and methods.
	_.extend(Backbone.Store.prototype, Backbone.Events, {
		_collections: [],
		_autoRelations: [],
		
		// Initialize is an empty function by default. Override it with your own
		// initialization logic.
		initialize: function(){},
		
		/**
		 * @param {object} relation:
		 * 	- type
		 *	- key
		 *	- relatedModel
		 *	- relatedKey
		 *	- relationType
		 */
		addAutoRelation: function( relation ) {
			var exists = _.any( this._autoRelations, function( rel ) {
				return _.all( relation, function( val, key ) {
					return val === rel[ key ];
				});
			});
			
			if ( !exists && relation.model && relation.type ) {
				this._autoRelations.push( relation );
				
				if ( !relation.model.prototype.relations ) {
					relation.model.prototype.relations = [];
				}
				relation.model.prototype.relations.push( relation );
				
				this.retroFitAutoRelation( relation );
			}
		},
		
		/**
		 * Add a autoRelation to already existing objects in the store
		 */
		retroFitAutoRelation: function( relation ) {
			var coll = this.getCollection( relation.model );
			
			coll.each( function( model ) {
				//console.debug( 'retroFitting autoRelation rel=%o to model=%o', relation, model );
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
		
		_createCollection: function( type ) {
			var coll;
			
			// If we have an instance, take it's constructor
			if ( type instanceof Backbone.RelationalModel ) {
				type = type.constructor;
			}
			
			// Type should inherit from Backbone.RelationalModel
			if ( type instanceof Backbone.RelationalModel.constructor ) {
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
			
			if ( coll ) {
				coll.add( model );
			}
		},
		
		unregister: function( model ) {
			var coll = this.getCollection( model );
			
			if ( coll ) {
				coll.remove( model );
			}
		}
	});
	Backbone.store = new Backbone.Store();
	
	/**
	 * @param instance
	 * @param key
	 * @param relatedModel
	 * @param options:
	 *	- includeInJSON
	 *	- createModels
	 * 	- reverseRelation Specifying a 'reverseRelation' is optional. If provided, Relation will
	 *    reciprocate the relation to the 'relatedModel'.
	 *		- type {string|object} HasOne or HasMany
	 *		- key
	 *		- includeInJSON
	 *
	 */
	Backbone.Relation = function( instance, options ) {
		this.instance = instance;
		
		// Make sure 'options' is sane, and fill with defaults from subclasses and this object's prototype
		options = ( typeof options === 'object' && options ) || {};
		
		this.reverseRelation = _.defaults( options.reverseRelation || {}, this.options.reverseRelation );
		this.reverseRelation.type = this.reverseRelation && this.reverseRelation.type &&
			( _.isString( this.reverseRelation.type ) ? Backbone[ this.reverseRelation.type ] : this.reverseRelation.type );
		
		this.options = _.defaults( options, this.options, Backbone.Relation.prototype.options );
		
		this.key = this.options.key;
		this.keyContents = this.instance.get( this.key );
		// Someone have a better suggestion than eval for turning a string into a ref to a constructor..?
		this.relatedModel = this.options.relatedModel &&
			( _.isString( this.options.relatedModel ) ? eval( this.options.relatedModel ) : this.options.relatedModel );
		
		if ( !this.checkPreconditions( this.instance, this.key, this.relatedModel, this.reverseRelation ) ) {
			return false;
		}
		
		// Set up the reverse relationship on 'relatedModel' if a 'reverseRelation' is specified
		// (and 'relatedModel' and 'reverseRelation.type' are valid)
		if ( !this.options.isAutoRelation && this.reverseRelation && this.reverseRelation.key
				&& this.reverseRelation.type instanceof Backbone.Relation.constructor ) {
			var relation = {
				isAutoRelation: true,
				model: this.relatedModel,
				relatedModel: this.instance.constructor,
				reverseRelation: this.options
			};
			// Add further properties from this.reverseRelations (type, key, etc.)
			relation = _.defaults( relation, this.reverseRelation );
			
			// Add the reverse relation to store.coll.autoRelations.
			Backbone.store.addAutoRelation( relation );
		}
		
		var dit = this;
		
		// Add this Relation to instance._relations, if we're not already in there.
		this.instance._relations = this.instance._relations || [];
		if( _.indexOf( this.instance._relations, this ) < 0 ) {
			this.instance._relations.push( this );
		}
		
		// When an 'instance' is destroyed, check if it is 'this.instance'.
		Backbone.store.getCollection( this.instance ).bind( 'remove', function( model ) {
				if ( model === this.instance ) {
					dit.destroy();
				}
			});
		
		// When 'relatedModel' are created or destroyed, check if it affects this relation.
		Backbone.store.getCollection( this.relatedModel )
			.bind( 'add', function( model, coll ) {
					//console.debug( 'adding model=%o to coll=%o', model, coll );
					dit.tryAddRelated( model );
				})
			.bind( 'remove', function( model, coll ) {
					//console.debug( 'removing model=%o from coll=%o', model, coll );
					dit.removeRelated( model );
				});
		
		this.initialize( this.options );
	};
	// Fix inheritance :\
	Backbone.Relation.extend = Backbone.Model.extend;
	
	// Set up all inheritable **Backbone.Store** properties and methods.
	_.extend(Backbone.Relation.prototype, Backbone.Events, {
		options: {
			createModels: true, // create objects from the contents of keys if the object is not found in Backbone.store
			includeInJSON: true, // serialize the related model(s) in toJSON on create/update, or not
			isAutoRelation: false
		},
		
		_synchronize: false,
		
		instance: null,
		
		key: null,
		keyContents: null,
		
		relatedModel: null,
		
		reverseRelation: null,
		
		related: null,
		
		// Initialize is an empty function by default. Override it with your own
		// initialization logic.
		initialize: function() {},
		
		/**
		 * Check several pre-conditions.
		 * @return {bool} True if pre-conditions are satisfied, false if they're not.
		 */
		checkPreconditions: function( instance, key, relatedModel, reverseRelation ) {
			if ( !instance || !key || !relatedModel ) {
				console && console.warn( 'No instance, key or relatedModel (%o, %o, %o)', instance, key, relatedModel );
				return false;
			}
			
			// Check if 'instance' is a Backbone.RelationalModel
			if ( !( instance instanceof Backbone.RelationalModel ) ) {
				console && console.warn( 'instance is not a Backbone.RelationalModel (%o)', instance );
				return false;
			}
			
			// Check if the type in 'relatedModel' inherits from Backbone.Model
			if ( !( relatedModel instanceof Backbone.RelationalModel.constructor ) ) {
				console && console.warn( 'relatedModel does not inherit from Backbone.RelationalModel (%o)', relatedModel );
				return false;
			}
			
			// Check if we're not attempting to create a relationship twice (from two sides)
			if ( instance._relations && instance._relations.length ) {
				var exists = _.any( instance._relations, function( rel ) {
					return rel.instance === instance && rel.relatedModel === relatedModel && rel.key === key;
				}, this );
				
				if ( exists ) {
					console && console.warn( 'Relation between instance=%o.%s and relatedModel=%o.%s already exists',
						instance, key, relatedModel, reverseRelation.key );
					return false;
				}
			}
			
			return true;
		},
		
		setRelated: function( related, options ) {
			this.related = related;
			var value = {};
			value[ this.key ] = related;
			this.instance.set( value, _.defaults( options || {}, { silent: true } ) );
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
		
		findRelated: function() {},
		
		tryAddRelated: function( model ) {},
		addRelated: function( model ) {},
		removeRelated: function( model ) {},
		
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
			
			// If the key is changed, notify reverse relations and initialize the new relation
			this.instance.bind( 'change:' + this.key, this.onChange );
			
			var model = this.findRelated();
			this.setRelated( model );
			
			// Notify new 'related' object of the new relation
			_.each( this.getReverseRelations(), function( relation ) {
					relation.addRelated( this.instance );
				}, this );
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
		
		onChange: function( model, attr, options ) {
			if ( this._synchronize ) {
				return;
			}
			
			options = options || {};
			var oldRelated = _.isUndefined( options.related ) ? this.related : options.related;
			
			// Only set this.keyContents if it's value is set from outside (not from another Relation);
			// 'options.related' is set by 'addRelated'/'removeRelated'.
			if ( _.isUndefined( options.related ) ) {	
				this.keyContents = this.instance.get( this.key );
			}
			
			// Notify old 'related' object of the terminated relation
			if ( oldRelated ) {
				_.each( this.getReverseRelations( oldRelated ), function( relation ) {
						relation.removeRelated( this.instance );
					}, this );
			}
			
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
			
			// 'options.related' is set by 'addRelated'/'removeRelated'; if present, a change
			// event hasn't been fired yet. Do it now, but don't handle it again.
			if ( _.isUndefined( options.related ) ) {	
				this._synchronize = true;
				
				// Notify new 'related' object of the new relation
				_.each( this.getReverseRelations(), function( relation ) {
						relation.addRelated( this.instance );
					}, this);
				
				this.instance.trigger( 'change:' + this.key, this.instance, this.related );
				this._synchronize = false;
			}
		},
		
		/**
		 * If a new 'this.relatedModel' appears in Backbone.store, try to match it to the original
		 * contents of the key on 'this.instance'.
		 */
		tryAddRelated: function( model ) {
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
		
		addRelated: function( model ) {
			if ( model !== this.related ) {
				var oldRelated = this.related || null;
				this.setRelated( model );
				this.onChange( this.instance, model, { related: oldRelated } );
			}
		},
		
		removeRelated: function( model ) {
			if ( !this.related ) {
				return;
			}
			
			if ( model.id === this.related.id ) {
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
			var dit = this;
			_.bindAll( this, 'handleAddition', 'handleRemoval' );
			
			// If the key is changed, notify reverse relations and initialize the new relation
			this.instance.bind( 'change:' + this.key, function( model, attr ) {
				dit.keyContents = attr;
				
				// Notify old 'related' object of the terminated relation
				_.each( dit.getReverseRelations(), function( relation ) {
						relation.removeRelated( dit.instance );
					});
				
				dit.related.unbind( 'add', this.handleAddition );
				dit.related.unbind('remove', this.handleRemoval );
				
				// Set new 'related'
				if ( attr instanceof Backbone.Collection ) {
					dit.related = attr;
					dit.related.bind( 'add', dit.handleAddition );
					dit.related.bind('remove', dit.handleRemoval );
				}
				else {
					dit.setRelated( dit.getNewCollection() );
					dit.findRelated();
				}
				
				// Notify new 'related' object of the new relation
				_.each( dit.getReverseRelations(), function( relation ) {
						relation.addRelated( dit.instance );
					});
			});
			
			
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
					var model = Backbone.store.find( this.relatedModel, id );
					
					if ( !model && this.options.createModels && !_.isString( item ) ) {
						model = new this.relatedModel( item );
					}
					
					if ( model && !this.related.get( id ) ) {
						this.related.add( model );
					}
				}, this);
			}
		},
		
		tryAddRelated: function( model ) {
			if ( !this.related.getByCid( model ) && !this.related.get( model ) ) {
				// Check if this new model was specified in 'this.keyContents'
				var item = _.any( this.keyContents, function( item ) {
					var id = _.isString( item ) ? item : item[ this.relatedModel.prototype.idAttribute ];
					return id === model.id;
				}, this );
				
				if ( item ) {
					this.related.add( model );
				}
			}
		},
		
		/**
		 * When a model is added to a 'HasMany', a reverse 'HasOne' relation should be set to 'model'.
		 * Call 'addRelated' to add 'model' to related model
		 */
		handleAddition: function( model ) {
			//console.debug( 'handleAddition to key=%s, model=%o', this.key, model );
			_.each( this.getReverseRelations( model ), function( relation ) {
					relation.addRelated( this.instance );
				}, this );
			this.instance._changed = true;
		},
		
		/**
		 * When a model is removed from a 'HasMany', a reverse 'HasOne' relation should be nullified.
		 * Call 'removeRelated' to remove 'model' from related model
		 */
		handleRemoval: function( model ) {
			//console.debug( 'handleRemoval to key=%s, model=%o', this.key, model );
			_.each( this.getReverseRelations( model ), function( relation ) {
					relation.removeRelated( this.instance );
				}, this );
			this.instance._changed = true;
		},
		
		addRelated: function( model ) {
			//console.debug( 'addRelated=%o', model );
			if ( !this.related.get( model.id ) ) {
				this.related.add( model, { silent: true } );
			}
		},
		
		removeRelated: function( model ) {
			//console.debug( 'removeRelated=%o', model );
			if ( this.related.get( model.id ) ) {
				this.related.remove( model, { silent: true } );
			}
		}
	});
	
	Backbone.RelationalModel = Backbone.Model.extend({
		autoSave: false,
		
		relations: null, // Relation descriptions on the prototype
		_relations: null, // Relation instances
		
		// Used for locking and loop detection in serialization
		_synchronize: false,
		
		/**
		 * Initialize Relations present in this.relations; determine the type (HasOne/HasMany), then create a new instance.
		 * The regular constructor (which fills this.attributes, initialize, etc) hasn't run yet at this time!
		 */
		initializeRelations: function() {
			this._synchronize = true; // Lock; setting up relations often also involve calls to 'set'
			Backbone.store.register( this );
			
			_.each( this.relations, function( rel ) {
				var type = rel.type && ( _.isString( rel.type ) ? Backbone[ rel.type ] : rel.type );
				if ( type instanceof Backbone.Relation.constructor ) {
					new type( this, rel ); // Also pushes the new Relation into _relations
				}
			}, this );
			
			this._synchronize = false;
		},
		
		getRelations: function() {
			return this._relations || [];
		},
		
		set: function( attributes, options ) {
			Backbone.Model.prototype.set.apply( this, arguments );
			
			// 'set' is called in Backbone.Model.prototype.constructor, before 'initialize' is called
			// and before 'previousAttributes' is created; '_changed' is also reset right after 'set'.
			// Ideal place to set up relations :)
			// (btw: can't use '_relations' to check if relations are initialized because a reverse relation
			// may have been created on this model separately.)
			if ( !this._previousAttributes && !this._synchronize && this.relations ) {
				this.initializeRelations();
			}
		},
		
		destroy: function( options ) {
			Backbone.store.unregister( this );
			Backbone.Model.prototype.destroy.call( this, options );
		},
		
		/**
		 * If this.autoSave is enabled, save when the model is updated
		 */
		change: function( options ) {
			// Because Backbone.sync is overriden to do an extra GET on creation, ignore the cases where
			// the model is new, and being updated from the server (which should be the only time the 'id' attribute is changed).
			var doUpdate = !this.isNew() && _.isUndefined( this.changedAttributes()[this.idAttribute] );
			
			Backbone.Model.prototype.change.call(this, options);
			
			if ( doUpdate && this.autoSave ) {
				this.save();
			}
		},
		
		/**
		 * Convert relations to JSON, omits them when required
		 */
		toJSON: function() {
			// For loop detection. If this Model has already been serialized in this branch, return to avoid loops
			if ( this._synchronize ) {
				return this.id;
			}
			
			var json = Backbone.Model.prototype.toJSON.call( this );
			
			_.each( this._relations, function( rel ) {
					var value = json[ rel.key ];
					
					if ( rel.options.includeInJSON && value && _.isFunction( value.toJSON ) ) {
						this._synchronize = true;
						json[ rel.key ] = value.toJSON();
						this._synchronize = false;
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
})( this );