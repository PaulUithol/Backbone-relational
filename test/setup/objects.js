import {
	Model as RelationalModel,
	Collection as RelationalCollection,
	HasMany, HasOne
} from 'backbone-relational';

import { Model as BackboneModel } from 'backbone';

/**
 * Zoo/Animal/Food/Visitor
 */

export const Food = RelationalModel.extend({
	urlRoot: '/food/'
});

export const Animal = RelationalModel.extend({
	urlRoot: '/animal/',

	relations: [
		{ // A simple HasOne without reverse relation
			type: HasOne,
			key: 'favoriteFood',
			relatedModel: Food
		}
	],

	// For validation testing. Wikipedia says elephants are reported up to 12.000 kg. Any more, we must've weighted wrong ;).
	validate(attrs) {
		if (attrs.species === 'elephant' && attrs.weight && attrs.weight > 12000) {
			return 'Too heavy.';
		}
	},

	toString() {
		return 'Animal (' + this.id + ')';
	}
});

export const AnimalCollection = RelationalCollection.extend({
	model: Animal
});

export const Zoo = RelationalModel.extend({
	urlRoot: '/zoo/',

	relations: [
		{
			type: HasMany,
			key: 'animals',
			relatedModel: Animal,
			includeInJSON: ['id', 'species'],
			collectionType: AnimalCollection,
			reverseRelation: {
				key: 'livesIn',
				includeInJSON: ['id', 'name']
			}
		},
		{ // A simple HasMany without reverse relation
			type: HasMany,
			key: 'visitors',
			relatedModel: 'Visitor'
		}
	],

	toString() {
		return 'Zoo (' + this.id + ')';
	}
});

export const Visitor = RelationalModel.extend();

/**
 * House/Person/Job/Company
 */

export const House = RelationalModel.extend({
	relations: [{
		type: HasMany,
		key: 'occupants',
		relatedModel: 'Person',
		reverseRelation: {
			key: 'livesIn',
			includeInJSON: false
		}
	}],

	toString() {
		return 'House (' + this.id + ')';
	}
});

export const User = RelationalModel.extend({
	urlRoot: '/user/',

	toString() {
		return 'User (' + this.id + ')';
	}
});

export const Person = RelationalModel.extend({
	relations: [
		{
			// Create a cozy, recursive, one-to-one relationship
			type: HasOne,
			key: 'likesALot',
			relatedModel: 'Person',
			reverseRelation: {
				type: HasOne,
				key: 'likedALotBy'
			}
		},
		{
			type: HasOne,
			key: 'user',
			keyDestination: 'user_id',
			relatedModel: 'User',
			includeInJSON: BackboneModel.prototype.idAttribute,
			reverseRelation: {
				type: HasOne,
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

	toString() {
		return 'Person (' + this.id + ')';
	}
});

export const PersonCollection = RelationalCollection.extend({
	model: Person
});

export const Password = RelationalModel.extend({
	relations: [{
		type: HasOne,
		key: 'user',
		relatedModel: 'User',
		reverseRelation: {
			type: HasOne,
			key: 'password'
		}
	}],

	toString() {
		return 'Password (' + this.id + ')';
	}
});

// A link table between 'Person' and 'Company', to achieve many-to-many relations
export const Job = RelationalModel.extend({
	defaults: {
		'startDate': null,
		'endDate': null
	},

	toString() {
		return 'Job (' + this.id + ')';
	}
});

export const Company = RelationalModel.extend({
	relations: [
		{
			type: 'HasMany',
			key: 'employees',
			relatedModel: Job,
			reverseRelation: {
				key: 'company'
			}
		},
		{
			type: 'HasOne',
			key: 'ceo',
			relatedModel: Person,
			reverseRelation: {
				key: 'runs'
			}
		}
	],

	toString() {
		return 'Company (' + this.id + ')';
	}
});

/**
 * Node/NodeList
 */

export const Node = RelationalModel.extend({
	urlRoot: '/node/',

	relations: [{
		type: HasOne,
		key: 'parent',
		reverseRelation: {
			key: 'children'
		}
	}
	],

	toString() {
		return 'Node (' + this.id + ')';
	}
});

export const NodeList = RelationalCollection.extend({
	model: Node
});

/**
 * Customer/Address/Shop/Agent
 */

export const Customer = RelationalModel.extend({
	urlRoot: '/customer/',

	toString() {
		return 'Customer (' + this.id + ')';
	}
});

export const CustomerCollection = RelationalCollection.extend({
	model: Customer,

	initialize(models, options) {
		options || (options = {});
		this.url = options.url;
	}
});

export const Address = RelationalModel.extend({
	urlRoot: '/address/',

	toString() {
		return 'Address (' + this.id + ')';
	}
});

export const Shop = RelationalModel.extend({
	relations: [
		{
			type: HasMany,
			key: 'customers',
			collectionType: CustomerCollection,
			collectionOptions(instance) {
				return { 'url': 'shop/' + instance.id + '/customers/' };
			},
			relatedModel: 'Customer',
			autoFetch: true
		},
		{
			type: HasOne,
			key: 'address',
			relatedModel: 'Address',
			autoFetch: {
				success(model, response) {
					response.successOK = true;
				},
				error(model, response) {
					response.errorOK = true;
				}
			}
		}
	],

	toString() {
		return 'Shop (' + this.id + ')';
	}
});

export const Agent = RelationalModel.extend({
	urlRoot: '/agent/',

	relations: [
		{
			type: HasMany,
			key: 'customers',
			relatedModel: Customer,
			includeInJSON: RelationalModel.prototype.idAttribute
		},
		{
			type: HasOne,
			key: 'address',
			relatedModel: Address,
			autoFetch: false
		}
	],

	toString() {
		return 'Agent (' + this.id + ')';
	}
});
