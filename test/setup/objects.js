var _ = window._ = require('underscore');
var $ = window.$ = require('jquery');
var Backbone = window.Backbone = require('backbone');
require('../../backbone-relational');

/**
 * 'Zoo'
 */

exports.Zoo = window.Zoo = Backbone.RelationalModel.extend({
	urlRoot: '/zoo/',

	relations: [
		{
			type: Backbone.HasMany,
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
			type: Backbone.HasMany,
			key: 'visitors',
			relatedModel: 'Visitor'
		}
	],

	toString: function() {
		return 'Zoo (' + this.id + ')';
	}
});


exports.Animal = window.Animal = Backbone.RelationalModel.extend({
	urlRoot: '/animal/',

	relations: [
		{ // A simple HasOne without reverse relation
			type: Backbone.HasOne,
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

exports.AnimalCollection = window.AnimalCollection = Backbone.Collection.extend({
	model: Animal
});

exports.Food = window.Food = Backbone.RelationalModel.extend({
	urlRoot: '/food/'
});

exports.Visitor = window.Visitor = Backbone.RelationalModel.extend();


/**
 * House/Person/Job/Company
 */

exports.House = window.House = Backbone.RelationalModel.extend({
	relations: [{
		type: Backbone.HasMany,
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

exports.User = window.User = Backbone.RelationalModel.extend({
	urlRoot: '/user/',

	toString: function() {
		return 'User (' + this.id + ')';
	}
});

exports.Person = window.Person = Backbone.RelationalModel.extend({
	relations: [
		{
			// Create a cozy, recursive, one-to-one relationship
			type: Backbone.HasOne,
			key: 'likesALot',
			relatedModel: 'Person',
			reverseRelation: {
				type: Backbone.HasOne,
				key: 'likedALotBy'
			}
		},
		{
			type: Backbone.HasOne,
			key: 'user',
			keyDestination: 'user_id',
			relatedModel: 'User',
			includeInJSON: Backbone.Model.prototype.idAttribute,
			reverseRelation: {
				type: Backbone.HasOne,
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

exports.PersonCollection = window.PersonCollection = Backbone.Collection.extend({
	model: Person
});

exports.Password = window.Password = Backbone.RelationalModel.extend({
	relations: [{
		type: Backbone.HasOne,
		key: 'user',
		relatedModel: 'User',
		reverseRelation: {
			type: Backbone.HasOne,
			key: 'password'
		}
	}],

	toString: function() {
		return 'Password (' + this.id + ')';
	}
});

// A link table between 'Person' and 'Company', to achieve many-to-many relations
exports.Job = window.Job = Backbone.RelationalModel.extend({
	defaults: {
		'startDate': null,
		'endDate': null
	},

	toString: function() {
		return 'Job (' + this.id + ')';
	}
});

exports.Company = window.Company = Backbone.RelationalModel.extend({
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

exports.Node = window.Node = Backbone.RelationalModel.extend({
	urlRoot: '/node/',

	relations: [{
			type: Backbone.HasOne,
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

exports.NodeList = window.NodeList = Backbone.Collection.extend({
	model: Node
});


/**
 * Customer/Address/Shop/Agent
 */

exports.Customer = window.Customer = Backbone.RelationalModel.extend({
	urlRoot: '/customer/',

	toString: function() {
		return 'Customer (' + this.id + ')';
	}
});

exports.CustomerCollection = window.CustomerCollection = Backbone.Collection.extend({
	model: Customer,

	initialize: function( models, options ) {
		options || (options = {});
		this.url = options.url;
	}
});

exports.Address = window.Address = Backbone.RelationalModel.extend({
	urlRoot: '/address/',

	toString: function() {
		return 'Address (' + this.id + ')';
	}
});

exports.Shop = window.Shop = Backbone.RelationalModel.extend({
	relations: [
		{
			type: Backbone.HasMany,
			key: 'customers',
			collectionType: 'CustomerCollection',
			collectionOptions: function( instance ) {
				return { 'url': 'shop/' + instance.id + '/customers/' };
			},
			relatedModel: 'Customer',
			autoFetch: true
		},
		{
			type: Backbone.HasOne,
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

exports.Agent = window.Agent = Backbone.RelationalModel.extend({
	urlRoot: '/agent/',

	relations: [
		{
			type: Backbone.HasMany,
			key: 'customers',
			relatedModel: 'Customer',
			includeInJSON: Backbone.RelationalModel.prototype.idAttribute
		},
		{
			type: Backbone.HasOne,
			key: 'address',
			relatedModel: 'Address',
			autoFetch: false
		}
	],

	toString: function() {
		return 'Agent (' + this.id + ')';
	}
});
