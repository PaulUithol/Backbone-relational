var _ = window._ = require('underscore');
var $ = window.$ = require('jquery');
var Backbone = window.Backbone = require('backbone');

//sessionStorage.clear();
if ( ! window.console ) {
	var names = [ 'log', 'debug', 'info', 'warn', 'error', 'assert', 'dir', 'dirxml',
	'group', 'groupEnd', 'time', 'timeEnd', 'count', 'trace', 'profile', 'profileEnd' ];
	window.console = {};
	for ( var i = 0; i < names.length; ++i )
		window.console[ names[i] ] = function() {};
}

window.requests = [];

Backbone.ajax = function( settings ) {
	var callbackContext = settings.context || this,
		dfd = new $.Deferred();

	dfd = _.extend( settings, dfd );

	dfd.respond = function( status, responseText ) {
		/**
		 * Trigger success/error with arguments like jQuery would:
		 * // Success/Error
		 * if ( isSuccess ) {
		 *   deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
		 * } else {
		 *   deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
		 * }
		 */
		if ( status >= 200 && status < 300 || status === 304 ) {
			_.isFunction( settings.success ) && settings.success( responseText, 'success', dfd );
			dfd.resolveWith( callbackContext, [ responseText, 'success', dfd ] );
		}
		else {
			_.isFunction( settings.error ) && settings.error( responseText, 'error', 'Internal Server Error' );
			dfd.rejectWith( callbackContext, [ dfd, 'error', 'Internal Server Error' ] );
		}
	};

	// Add the request before triggering callbacks that may get us in here again
	window.requests.push( dfd );

	// If a `response` has been defined, execute it.
	// If status < 299, trigger 'success'; otherwise, trigger 'error'
	if ( settings.response && settings.response.status ) {
		dfd.respond( settings.response.status, settings.response.responseText );
	}

	return dfd;
};

Backbone.Model.prototype.url = function() {
	// Use the 'resource_uri' if possible
	var url = this.get( 'resource_uri' );

	// Try to have the collection construct a url
	if ( !url && this.collection ) {
		url = this.collection.url && _.isFunction( this.collection.url ) ? this.collection.url() : this.collection.url;
	}

	// Fallback to 'urlRoot'
	if ( !url && this.urlRoot ) {
		url = this.urlRoot + this.id;
	}

	if ( !url ) {
		throw new Error( 'Url could not be determined!' );
	}

	return url;
};
