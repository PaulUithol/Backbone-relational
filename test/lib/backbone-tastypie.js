/**
 * Backbone-tastypie.js 0.1
 * (c) 2011 Paul Uithol
 * 
 * Backbone-tastypie may be freely distributed under the MIT license.
 * Add or override Backbone.js functionality, for compatibility with django-tastypie.
 */
(function( undefined ) {
	var Backbone = this.Backbone;
	
	/**
	 * Override Backbone's sync function, to do a GET upon receiving a HTTP CREATED.
	 * This requires 2 requests to do a create, so you may want to use some other method in production.
	 * Modified from http://joshbohde.com/blog/backbonejs-and-django
	 */
	Backbone.oldSync = Backbone.sync;
	Backbone.sync = function( method, model, options ) {
		if ( method === 'create' ) {
			var dfd = new $.Deferred();
			
			var success = options.success;
			options.success = function( resp, status, xhr ) {
				// On the first request, fire a GET.
				if ( xhr.status === 201 ) { // 201 CREATED
					var location = xhr.getResponseHeader('Location');
					return $.ajax( {
						   url: location,
						   success: [ success, dfd.resolve ],
						   error: dfd.reject
						});
				}
			};
			
			Backbone.oldSync( method, model, options );
			return dfd.promise();
		}
		
		return Backbone.oldSync( method, model, options );
	};

	Backbone.Model.prototype.idAttribute = 'resource_uri';
	
	Backbone.Model.prototype.url = function() {
		// Use the 'resource_uri' if possible
		var url = this.get('resource_uri');
		
		// Try to have the collection construct a url
		if ( !url ) {
			var coll = this.collection;
			url = ( coll && coll.url ) && _.isFunction( coll.url ) ? coll.url() : coll.url;
		}
		
		// Fallback to 'urlRoot'
		if ( !url ) {
			url = this.urlRoot + this.id;
		}
		
		return url;
	};
	
	/**
	 * Return 'data.objects' if it exists and is an array, or else just plain 'data'.
	 */
	Backbone.Model.prototype.parse = function( data ) {
		return data && data.objects && ( _.isArray( data.objects ) ? data.objects[ 0 ] : data.objects ) || data;
	};
	
	Backbone.Collection.prototype.parse = function( data ) {
		return data.objects;
	};
	
	Backbone.Collection.prototype.url = function( models ) {
		if ( models && models.length ) {
			var root = this.urlRoot || models[0].urlRoot;
			// Assuming the last part of each model's idAttribute (which is set to 'resource_uri') contains the model's id.
			var ids = _.map( models, function( model ) {
					var parts = model.id.split('/');
					return parts[ parts.length - 1 ];
				});
			root += 'set/' + ids.join(';') + '/';
		}
		else {
			return this.urlRoot;
		}
	};
})();
