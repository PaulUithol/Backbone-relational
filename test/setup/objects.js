var _ = window._ = require('underscore');
var $ = window.$ = require('jquery');
var Backbone = window.Backbone = require('backbone');
Backbone.Relational = require('../../dist/backbone-relational');
Backbone.Relational.showWarnings = false;

/**
 * 'Zoo'
 */
exports.Zoo = window.Zoo = Backbone.Relational.Model.extend({
	urlRoot: '/zoo/',

	relations: [
		{
			type: Backbone.Relational.HasMany,
			key: 'animals',
			relatedModel: 'Animal',
			includeInJSON: [ 'id', 'species' ],
			collectionType: 'AnimalCollection',
			reverseRelation: {
				key: 'livesIn',
				includeInJSON: [ 'id', 'name' ]
			}
		},
		{ // A simple HasMany without reverse relation
			type: Backbone.Relational.HasMany,
			key: 'visitors',
			relatedModel: 'Visitor'
		}
	],

	toString: function() {
		return 'Zoo (' + this.id + ')';
	}
});


exports.Animal = window.Animal = Backbone.Relational.Model.extend({
	urlRoot: '/animal/',

	relations: [
		{ // A simple HasOne without reverse relation
			type: Backbone.Relational.HasOne,
			key: 'favoriteFood',
			relatedModel: 'Food'
		}
	],

	// For validation testing. Wikipedia says elephants are reported up to 12.000 kg. Any more, we must've weighted wrong ;).
	validate: function( attrs ) {
		if ( attrs.species === 'elephant' && attrs.weight && attrs.weight > 12000 ) {
			return "Too heavy.";
		}
	},

	toString: function() {
		return 'Animal (' + this.id + ')';
	}
});

exports.AnimalCollection = window.AnimalCollection = Backbone.Relational.Collection.extend({
	model: Animal
});

exports.Food = window.Food = Backbone.Relational.Model.extend({
	urlRoot: '/food/'
});

exports.Visitor = window.Visitor = Backbone.Relational.Model.extend();


/**
 * House/Person/Job/Company
 */

exports.House = window.House = Backbone.Relational.Model.extend({
	relations: [{
		type: Backbone.Relational.HasMany,
		key: 'occupants',
		relatedModel: 'Person',
		reverseRelation: {
			key: 'livesIn',
			includeInJSON: false
		}
	}],

	toString: function() {
		return 'House (' + this.id + ')';
	}
});

exports.User = window.User = Backbone.Relational.Model.extend({
	urlRoot: '/user/',

	toString: function() {
		return 'User (' + this.id + ')';
	}
});

exports.Person = window.Person = Backbone.Relational.Model.extend({
	relations: [
		{
			// Create a cozy, recursive, one-to-one relationship
			type: Backbone.Relational.HasOne,
			key: 'likesALot',
			relatedModel: 'Person',
			reverseRelation: {
				type: Backbone.Relational.HasOne,
				key: 'likedALotBy'
			}
		},
		{
			type: Backbone.Relational.HasOne,
			key: 'user',
			keyDestination: 'user_id',
			relatedModel: 'User',
			includeInJSON: Backbone.Model.prototype.idAttribute,
			reverseRelation: {
				type: Backbone.Relational.HasOne,
				includeInJSON: 'name',
				key: 'person'
			}
		},
		{
			type: 'HasMany',
			key: 'jobs',
			relatedModel: 'Job',
			reverseRelation: {
				key: 'person'
			}
		}
	],

	toString: function() {
		return 'Person (' + this.id + ')';
	}
});

exports.PersonCollection = window.PersonCollection = Backbone.Relational.Collection.extend({
	model: Person
});

exports.Password = window.Password = Backbone.Relational.Model.extend({
	relations: [{
		type: Backbone.Relational.HasOne,
		key: 'user',
		relatedModel: 'User',
		reverseRelation: {
			type: Backbone.Relational.HasOne,
			key: 'password'
		}
	}],

	toString: function() {
		return 'Password (' + this.id + ')';
	}
});

// A link table between 'Person' and 'Company', to achieve many-to-many relations
exports.Job = window.Job = Backbone.Relational.Model.extend({
	defaults: {
		'startDate': null,
		'endDate': null
	},

	toString: function() {
		return 'Job (' + this.id + ')';
	}
});

exports.Company = window.Company = Backbone.Relational.Model.extend({
	relations: [{
			type: 'HasMany',
			key: 'employees',
			relatedModel: 'Job',
			reverseRelation: {
				key: 'company'
			}
		},
		{
			type: 'HasOne',
			key: 'ceo',
			relatedModel: 'Person',
			reverseRelation: {
				key: 'runs'
			}
		}
	],

	toString: function() {
		return 'Company (' + this.id + ')';
	}
});


/**
 * Node/NodeList
 */
exports.Node = window.Node = Backbone.Relational.Model.extend({
	urlRoot: '/node/',

	relations: [{
			type: Backbone.Relational.HasOne,
			key: 'parent',
			reverseRelation: {
				key: 'children'
			}
		}
	],

	toString: function() {
		return 'Node (' + this.id + ')';
	}
});

exports.NodeList = window.NodeList = Backbone.Relational.Collection.extend({
	model: Node
});


/**
 * Customer/Address/Shop/Agent
 */

exports.Customer = window.Customer = Backbone.Relational.Model.extend({
	urlRoot: '/customer/',

	toString: function() {
		return 'Customer (' + this.id + ')';
	}
});

exports.CustomerCollection = window.CustomerCollection = Backbone.Relational.Collection.extend({
	model: Customer,

	initialize: function( models, options ) {
		options || (options = {});
		this.url = options.url;
	}
});

exports.Address = window.Address = Backbone.Relational.Model.extend({
	urlRoot: '/address/',

	toString: function() {
		return 'Address (' + this.id + ')';
	}
});

exports.Shop = window.Shop = Backbone.Relational.Model.extend({
	relations: [
		{
			type: Backbone.Relational.HasMany,
			key: 'customers',
			collectionType: 'CustomerCollection',
			collectionOptions: function( instance ) {
				return { 'url': 'shop/' + instance.id + '/customers/' };
			},
			relatedModel: 'Customer',
			autoFetch: true
		},
		{
			type: Backbone.Relational.HasOne,
			key: 'address',
			relatedModel: 'Address',
			autoFetch: {
				success: function( model, response ) {
					response.successOK = true;
				},
				error: function( model, response ) {
					response.errorOK = true;
				}
			}
		}
	],

	toString: function() {
		return 'Shop (' + this.id + ')';
	}
});

exports.Agent = window.Agent = Backbone.Relational.Model.extend({
	urlRoot: '/agent/',

	relations: [
		{
			type: Backbone.Relational.HasMany,
			key: 'customers',
			relatedModel: 'Customer',
			includeInJSON: Backbone.Relational.Model.prototype.idAttribute
		},
		{
			type: Backbone.Relational.HasOne,
			key: 'address',
			relatedModel: 'Address',
			autoFetch: false
		}
	],

	toString: function() {
		return 'Agent (' + this.id + ')';
	}
});
