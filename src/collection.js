import { Collection as BBCollection, Model as BBModel } from 'backbone';
import _ from 'underscore';
import eventQueue from './event-queue';

export default BBCollection.extend({
	/**
	 * Override module.Collection._prepareModel, so objects will be built using the correct type
	 * if the collection.model has subModels.
	 * Attempts to find a model for `attrs` in Backbone.store through `findOrCreate`
	 * (which sets the new properties on it if found), or instantiates a new model.
	 */
	_prepareModel: function( attrs, options ) {
		var model;

		if ( attrs instanceof BBModel ) {
			if ( !attrs.collection ) {
				attrs.collection = this;
			}
			model = attrs;
		}
		else {
			options = options ? _.clone( options ) : {};
			options.collection = this;

			if ( typeof this.model.findOrCreate !== 'undefined' ) {
				model = this.model.findOrCreate( attrs, options );
			}
			else {
				model = new this.model( attrs, options );
			}

			if ( model && model.validationError ) {
				this.trigger( 'invalid', this, attrs, options );
				model = false;
			}
		}

		return model;
	},
	/**
	 * Override module.Collection.set, so we'll create objects from attributes where required,
	 * and update the existing models. Also, trigger 'relational:add'.
	 */
	set: function( models, options ) {
		// Short-circuit if this Collection doesn't hold RelationalModels
		// if ( !( this.model.prototype instanceof module.Model ) ) {
		// 	return set.call( this, models, options );
		// }

		if ( options && options.parse ) {
			models = this.parse( models, options );
		}

		var singular = !_.isArray( models ),
			newModels = [],
			toAdd = [],
			model = null;

		models = singular ? ( models ? [ models ] : [] ) : _.clone( models );

		//console.debug( 'calling add on coll=%o; model=%o, options=%o', this, models, options );
		for ( var i = 0; i < models.length; i++ ) {
			model = models[i];
			if ( !( model instanceof BBModel ) ) {
				model = this._prepareModel( model, options );
			}

			if ( model ) {
				toAdd.push( model );

				if ( !( this.get( model ) || this.get( model.cid ) ) ) {
					newModels.push( model );
				}
				// If we arrive in `add` while performing a `set` (after a create, so the model gains an `id`),
				// we may get here before `_onModelEvent` has had the chance to update `_byId`.
				else if ( model.id != null ) {
					this._byId[ model.id ] = model;
				}
			}
		}

		// Add 'models' in a single batch, so the original add will only be called once (and thus 'sort', etc).
		// If `parse` was specified, the collection and contained models have been parsed now.
		toAdd = singular ? ( toAdd.length ? toAdd[ 0 ] : null ) : toAdd;
		var result = BBCollection.prototype.set.call( this, toAdd, _.defaults( { merge: false, parse: false }, options ) );

		for ( i = 0; i < newModels.length; i++ ) {
			model = newModels[i];
			// Fire a `relational:add` event for any model in `newModels` that has actually been added to the collection.
			if ( this.get( model ) || this.get( model.cid ) ) {
				this.trigger( 'relational:add', model, this, options );
			}
		}

		return result;
	},
	/**
	 * Override 'module.Collection.trigger' so 'add', 'remove' and 'reset' events are queued until relations
	 * are ready.
	 */
	trigger: function( eventName ) {
		// Short-circuit if this Collection doesn't hold RelationalModels
		// if ( !( this.model.prototype instanceof module.Model ) ) {
		// 	return trigger.apply( this, arguments );
		// }

		if ( eventName === 'add' || eventName === 'remove' || eventName === 'reset' || eventName === 'sort' ) {
			var dit = this,
				args = arguments;

			if ( _.isObject( args[ 3 ] ) ) {
				args = _.toArray( args );
				// the fourth argument is the option object.
				// we need to clone it, as it could be modified while we wait on the eventQueue to be unblocked
				args[ 3 ] = _.clone( args[ 3 ] );
			}

			eventQueue.add( function() {
				BBCollection.prototype.trigger.apply( dit, args );
			});
		}
		else {
			BBCollection.prototype.trigger.apply( this, arguments );
		}

		return this;
	},
	/**
	 * Override 'module.Collection.sort' to trigger 'relational:reset'.
	 */
	sort: function( options ) {
		var result = BBCollection.prototype.sort.call( this, options );

		// if ( this.model.prototype instanceof module.Model ) {
			this.trigger( 'relational:reset', this, options );
		// }

		return result;
	},
	/**
	 * Override 'module.Collection.reset' to trigger 'relational:reset'.
	 */
	reset: function( models, options ) {
		options = _.extend( { merge: true }, options );
		var result = BBCollection.prototype.reset.call( this, models, options );

		// if ( this.model.prototype instanceof module.Model ) {
			this.trigger( 'relational:reset', this, options );
		// }

		return result;
	},
	/**
	 * Override 'Backbone.Collection._removeModels' to trigger 'relational:remove'.
	 */
	_removeModels: function( models, options ) {
		// Short-circuit if this Collection doesn't hold RelationalModels
		// if ( !( this.model.prototype instanceof module.Model ) ) {
		// 	return _removeModels.call( this, models, options );
		// }

		var toRemove = [];

		//console.debug('calling remove on coll=%o; models=%o, options=%o', this, models, options );
		_.each( models, _.bind(function( model ) {
			model = this.get( model ) || ( model && this.get( model.cid ) );
			model && toRemove.push( model );
		}, this ));

		var result = BBCollection.prototype._removeModels.call( this, toRemove, options );

		_.each( toRemove, _.bind(function( model ) {
			this.trigger( 'relational:remove', model, this, options );
		}, this ));

		return result;
	}
});
