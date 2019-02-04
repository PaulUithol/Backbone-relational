import { reset } from './setup/setup';
import { store, Model, HasMany, HasOne, Collection } from 'backbone-relational';
import { Person, Agent, Company, Zoo, AnimalCollection, Shop, Customer, Animal, House, User, Node, Job, Address } from './setup/objects';
import initObjects from './setup/data';
import _ from '../src/utils/underscore-compat';

let objects;

QUnit.module('Backbone.Relational.Relation options', {
	beforeEach() {
		reset();
		store.addModelScope({
			Person,
			Agent,
			Company,
			Animal,
			Zoo,
			Shop,
			Customer,
			House,
			User,
			Node,
			Job,
			Address
		});
		objects = initObjects();
	}
}, () => {
	QUnit.test('`includeInJSON` (Person to JSON)', function(assert) {
		let json = objects.person1.toJSON();
		assert.equal(json.user_id, 'user-1', 'The value of \'user_id\' is the user\'s id (not an object, since \'includeInJSON\' is set to the idAttribute)');
		assert.ok(json.likesALot instanceof Object, 'The value of \'likesALot\' is an object (\'includeInJSON\' is \'true\')');
		assert.equal(json.likesALot.likesALot, 'person-1', 'Person is serialized only once');

		json = objects.person1.get('user').toJSON();
		assert.equal(json.person, 'boy', 'The value of \'person\' is the person\'s name (`includeInJSON` is set to \'name\')');

		json = objects.person2.toJSON();
		assert.ok(objects.person2.get('livesIn') instanceof House, '\'person2\' has a \'livesIn\' relation');
		assert.equal(json.livesIn, undefined , 'The value of \'livesIn\' is not serialized (`includeInJSON` is \'false\')');

		json = objects.person3.toJSON();
		assert.ok(json.user_id === null, 'The value of \'user_id\' is null');
		assert.ok(json.likesALot === null, 'The value of \'likesALot\' is null');
	});

	QUnit.test('`includeInJSON` (Zoo to JSON)', function(assert) {
		let zoo = new Zoo({
			id: 0,
			name: 'Artis',
			city: 'Amsterdam',
			animals: [
				new Animal({ id: 1, species: 'bear', name: 'Baloo' }),
				new Animal({ id: 2, species: 'tiger', name: 'Shere Khan' })
			]
		});

		let jsonZoo = zoo.toJSON(),
		jsonBear = jsonZoo.animals[ 0 ];

		assert.ok(_.isArray(jsonZoo.animals), 'animals is an Array');
		assert.equal(jsonZoo.animals.length, 2);
		assert.equal(jsonBear.id, 1, 'animal\'s id has been included in the JSON');
		assert.equal(jsonBear.species, 'bear', 'animal\'s species has been included in the JSON');
		assert.ok(!jsonBear.name, 'animal\'s name has not been included in the JSON');

		let tiger = zoo.get('animals').get(1),
		jsonTiger = tiger.toJSON();

		assert.ok(_.isObject(jsonTiger.livesIn) && !_.isArray(jsonTiger.livesIn), 'zoo is an Object');
		assert.equal(jsonTiger.livesIn.id, 0, 'zoo.id is included in the JSON');
		assert.equal(jsonTiger.livesIn.name, 'Artis', 'zoo.name is included in the JSON');
		assert.ok(!jsonTiger.livesIn.city, 'zoo.city is not included in the JSON');
	});

	QUnit.test('\'createModels\' is false', function(assert) {
		let NewUser = Model.extend({});
		let NewPerson = Model.extend({
			relations: [{
				type: HasOne,
				key: 'user',
				relatedModel: NewUser,
				createModels: false
			}]
		});

		let person = new NewPerson({
			id: 'newperson-1',
			resource_uri: 'newperson-1',
			user: { id: 'newuser-1', resource_uri: 'newuser-1' }
		});

		assert.ok(person.get('user') == null);

		let user = new NewUser({ id: 'newuser-1', name: 'SuperUser' });

		assert.ok(person.get('user') === user);
		// Old data gets overwritten by the explicitly created user, since a model was never created from the old data
		assert.ok(person.get('user').get('resource_uri') == null);
	});

	QUnit.test('Relations load from both `keySource` and `key`', function(assert) {
		let Property = Model.extend({
			idAttribute: 'property_id'
		});
		let View = Model.extend({
			idAttribute: 'id',

			relations: [{
				type: HasMany,
				key: 'properties',
				keySource: 'property_ids',
				relatedModel: Property,
				reverseRelation: {
					key: 'view',
					keySource: 'view_id'
				}
			}]
		});

		let property1 = new Property({
			property_id: 1,
			key: 'width',
			value: 500,
			view_id: 5
		});

		let view = new View({
			id: 5,
			property_ids: [2]
		});

		let property2 = new Property({
			property_id: 2,
			key: 'height',
			value: 400
		});

		// The values from view.property_ids should be loaded into view.properties
		assert.ok(view.get('properties') && view.get('properties').length === 2, '\'view\' has two \'properties\'');
		assert.ok(typeof view.get('property_ids') === 'undefined', '\'view\' does not have \'property_ids\'');

		view.set('properties', [property1, property2]);
		assert.ok(view.get('properties') && view.get('properties').length === 2, '\'view\' has two \'properties\'');

		view.set('property_ids', [1, 2]);
		assert.ok(view.get('properties') && view.get('properties').length === 2, '\'view\' has two \'properties\'');
	});

	QUnit.test('`keySource` is emptied after a set, doesn\'t get confused by `unset`', function(assert) {
		let SubModel = Model.extend();

		let MyModel = Model.extend({
			relations: [{
				type: HasOne,
				key: 'submodel',
				keySource: 'sub_data',
				relatedModel: SubModel
			}]
		});

		let inst = new MyModel({'id': 123});

		// `set` may be called from fetch
		inst.set({
			'id': 123,
			'some_field': 'some_value',
			'sub_data': {
				'id': 321,
				'key': 'value'
			},
			'to_unset': 'unset value'
		});

		assert.ok(inst.get('submodel').get('key') === 'value', 'value of submodule.key should be \'value\'');
		inst.set({ 'to_unset': '' }, { 'unset': true });
		assert.ok(inst.get('submodel').get('key') === 'value', 'after unset value of submodule.key should be still \'value\'');

		assert.ok(typeof inst.get('sub_data') === 'undefined', 'keySource field should be removed from model');
		assert.ok(typeof inst.get('submodel') !== 'undefined', 'key field should be added...');
		assert.ok(inst.get('submodel') instanceof SubModel, '... and should be model instance');

		// set called from fetch
		inst.set({
			'sub_data': {
				'id': 321,
				'key': 'value2'
			}
		});

		assert.ok(typeof inst.get('sub_data') === 'undefined', 'keySource field should be removed from model');
		assert.ok(typeof inst.get('submodel') !== 'undefined', 'key field should be present...');
		assert.ok(inst.get('submodel').get('key') === 'value2', '... and should be updated');
	});

	QUnit.test('\'keyDestination\' saves to \'key\'', function(assert) {
		let Property = Model.extend({
			idAttribute: 'property_id'
		});
		let View = Model.extend({
			idAttribute: 'id',

			relations: [{
				type: HasMany,
				key: 'properties',
				keyDestination: 'properties_attributes',
				relatedModel: Property,
				reverseRelation: {
					key: 'view',
					keyDestination: 'view_attributes',
					includeInJSON: true
				}
			}]
		});

		let property1 = new Property({
			property_id: 1,
			key: 'width',
			value: 500,
			view: 5
		});

		let view = new View({
			id: 5,
			properties: [2]
		});

		let property2 = new Property({
			property_id: 2,
			key: 'height',
			value: 400
		});

		let viewJSON = view.toJSON();
		assert.ok(viewJSON.properties_attributes && viewJSON.properties_attributes.length === 2, '\'viewJSON\' has two \'properties_attributes\'');
		assert.ok(typeof viewJSON.properties === 'undefined', '\'viewJSON\' does not have \'properties\'');
	});

	QUnit.test('\'collectionOptions\' sets the options on the created HasMany Collections', function(assert) {
		let shop = new Shop({ id: 1 });
		assert.equal(shop.get('customers').url, 'shop/' + shop.id + '/customers/');
	});

	QUnit.test('`parse` with deeply nested relations', function(assert) {
		let collParseCalled = 0,
		modelParseCalled = 0;

		let Job = Model.extend({});

		let JobCollection = Collection.extend({
			model: Job,

			parse(resp, options) {
				collParseCalled++;
				return resp.data || resp;
			}
		});

		let Company = Model.extend({
			relations: [{
				type: 'HasMany',
				key: 'employees',
				parse: true,
				relatedModel: Job,
				collectionType: JobCollection,
				reverseRelation: {
					key: 'company'
				}
			}]
		});

		let Person = Model.extend({
			relations: [{
				type: 'HasMany',
				key: 'jobs',
				parse: true,
				relatedModel: Job,
				collectionType: JobCollection,
				reverseRelation: {
					key: 'person',
					parse: false
				}
			}],

			parse(resp, options) {
				modelParseCalled++;
				let data = _.clone(resp.model);
				data.id = data.id.uri;
				return data;
			}
		});

		Company.prototype.parse = Job.prototype.parse = function(resp, options) {
			modelParseCalled++;
			let data = _.clone(resp.model);
			data.id = data.id.uri;
			return data;
		};

		let data = {
			model: {
				id: { uri: 'c1' },
				employees: [
					{
						model: {
							id: { uri: 'e1' },
							person: {
								/*model: {
								id: { uri: 'p1' },
								jobs: [ 'e1', { model: { id: { uri: 'e3' } } } ]
							}*/
							id: 'p1',
							jobs: ['e1', { model: { id: { uri: 'e3' } } }]
						}
					}
				},
				{
					model: {
						id: { uri: 'e2' },
						person: {
							id: 'p2'
							/*model: {
							id: { uri: 'p2' }
						}*/
					}
				}
			}
		]
	}
};

let company = new Company(data, { parse: true }),
employees = company.get('employees'),
job = employees.first(),
person = job.get('person');

assert.ok(job && job.id === 'e1', 'job exists');
assert.ok(person && person.id === 'p1', 'person exists');

assert.ok(modelParseCalled === 4, 'model.parse called 4 times? ' + modelParseCalled);
assert.ok(collParseCalled === 0, 'coll.parse called 0 times? ' + collParseCalled);
});
});

QUnit.module('Backbone.Relational.Relation preconditions', { beforeEach: reset }, () => {
	QUnit.test('\'type\', \'key\', \'relatedModel\' are required properties', function(assert) {
		let Properties = Model.extend({});
		let View = Model.extend({
			relations: [
				{
					key: 'listProperties',
					relatedModel: Properties
				}
			]
		});

		let view = new View();
		assert.ok(_.size(view._relations) === 0);
		assert.ok(view.getRelations().length === 0);

		View = Model.extend({
			relations: [
				{
					type: HasOne,
					relatedModel: Properties
				}
			]
		});

		view = new View();
		assert.ok(_.size(view._relations) === 0);

		View = Model.extend({
			relations: [
				{
					type: HasOne,
					key: 'parentView'
				}
			]
		});

		view = new View();
		assert.ok(_.size(view._relations) === 1);
		assert.ok(view.getRelation('parentView').relatedModel === View, 'No \'relatedModel\' makes it self-referential');
	});

	QUnit.test('\'type\' can be a string or an object reference', function(assert) {
		let Properties = Model.extend({});
		let View = Model.extend({
			relations: [
				{
					type: 'HasOne',
					key: 'listProperties',
					relatedModel: Properties
				}
			]
		});

		let view = new View();
		assert.ok(_.size(view._relations) === 1);

		View = Model.extend({
			relations: [
				{
					type: 'HasOne',
					key: 'listProperties',
					relatedModel: Properties
				}
			]
		});

		view = new View();
		assert.ok(_.size(view._relations) === 1);

		View = Model.extend({
			relations: [
				{
					type: HasOne,
					key: 'listProperties',
					relatedModel: Properties
				}
			]
		});

		view = new View();
		assert.ok(_.size(view._relations) === 1);
	});

	QUnit.test('\'key\' can be a string or an object reference', function(assert) {
		let Properties = Model.extend({});
		let View = Model.extend({
			relations: [
				{
					type: HasOne,
					key: 'listProperties',
					relatedModel: Properties
				}
			]
		});

		let view = new View();
		assert.ok(_.size(view._relations) === 1);

		View = Model.extend({
			relations: [
				{
					type: HasOne,
					key: 'listProperties',
					relatedModel: Properties
				}
			]
		});

		view = new View();
		assert.ok(_.size(view._relations) === 1);
	});

	QUnit.test('HasMany with a reverseRelation HasMany is not allowed', function(assert) {
		let User = Model.extend({});
		let Password = Model.extend({
			relations: [{
				type: 'HasMany',
				key: 'users',
				relatedModel: User,
				reverseRelation: {
					type: 'HasMany',
					key: 'passwords'
				}
			}]
		});

		let password = new Password({
			plaintext: 'qwerty',
			users: ['person-1', 'person-2', 'person-3']
		});

		assert.ok(_.size(password._relations) === 0, 'No _relations created on Password');
	});

	QUnit.test('Duplicate relations not allowed (two simple relations)', function(assert) {
		let Properties = Model.extend({});
		let View = Model.extend({
			relations: [
				{
					type: HasOne,
					key: 'properties',
					relatedModel: Properties
				},
				{
					type: HasOne,
					key: 'properties',
					relatedModel: Properties
				}
			]
		});

		let view = new View();
		view.set({ properties: new Properties() });
		assert.ok(_.size(view._relations) === 1);
	});

	QUnit.test('Duplicate relations not allowed (one relation with a reverse relation, one without)', function(assert) {
		let Properties = Model.extend({});
		let View = Model.extend({
			relations: [
				{
					type: HasOne,
					key: 'properties',
					relatedModel: Properties,
					reverseRelation: {
						type: HasOne,
						key: 'view'
					}
				},
				{
					type: HasOne,
					key: 'properties',
					relatedModel: Properties
				}
			]
		});

		let view = new View();
		view.set({ properties: new Properties() });
		assert.ok(_.size(view._relations) === 1);
	});

	QUnit.test('Duplicate relations not allowed (two relations with reverse relations)', function(assert) {
		let Properties = Model.extend({});
		let View = Model.extend({
			relations: [
				{
					type: HasOne,
					key: 'properties',
					relatedModel: Properties,
					reverseRelation: {
						type: HasOne,
						key: 'view'
					}
				},
				{
					type: HasOne,
					key: 'properties',
					relatedModel: Properties,
					reverseRelation: {
						type: HasOne,
						key: 'view'
					}
				}
			]
		});

		let view = new View();
		view.set({ properties: new Properties() });
		assert.ok(_.size(view._relations) === 1);
	});

	QUnit.test('Duplicate relations not allowed (different relations, reverse relations)', function(assert) {
		let Properties = Model.extend({});
		let View = Model.extend({
			relations: [
				{
					type: HasOne,
					key: 'listProperties',
					relatedModel: Properties,
					reverseRelation: {
						type: HasOne,
						key: 'view'
					}
				},
				{
					type: HasOne,
					key: 'windowProperties',
					relatedModel: Properties,
					reverseRelation: {
						type: HasOne,
						key: 'view'
					}
				}
			]
		});

		let view = new View(),
		prop1 = new Properties({ name: 'a' }),
		prop2 = new Properties({ name: 'b' });

		view.set({ listProperties: prop1, windowProperties: prop2 });

		assert.ok(_.size(view._relations) === 2);
		assert.ok(_.size(prop1._relations) === 1);
		assert.ok(view.get('listProperties').get('name') === 'a');
		assert.ok(view.get('windowProperties').get('name') === 'b');
	});
});

QUnit.module('Backbone.Relational.Relation general', { beforeEach: reset }, () => {
	QUnit.test('Only valid models (no validation failure) should be added to a relation', function(assert) {
		let zoo = new Zoo();

		zoo.on('add:animals', function(animal) {
			assert.ok(animal instanceof Animal);
		});

		let smallElephant = new Animal({ name: 'Jumbo', species: 'elephant', weight: 2000, livesIn: zoo });
		assert.equal(zoo.get('animals').length, 1, 'Just 1 elephant in the zoo');

		// should fail validation, so it shouldn't be added
		zoo.get('animals').add({ name: 'Big guy', species: 'elephant', weight: 13000 }, { validate: true });

		assert.equal(zoo.get('animals').length, 1, 'Still just 1 elephant in the zoo');
	});

	QUnit.test('Updating (retrieving) a model keeps relation consistency intact', function(assert) {
		let zoo = new Zoo();

		let lion = new Animal({
			species: 'Lion',
			livesIn: zoo
		});

		assert.equal(zoo.get('animals').length, 1);

		lion.set({
			id: 5,
			species: 'Lion',
			livesIn: zoo
		});

		assert.equal(zoo.get('animals').length, 1);

		zoo.set({
			name: 'Dierenpark Amersfoort',
			animals: [5]
		});

		assert.equal(zoo.get('animals').length, 1);
		assert.ok(zoo.get('animals').at(0) === lion, 'lion is in zoo');
		assert.ok(lion.get('livesIn') === zoo);

		let elephant = new Animal({
			species: 'Elephant',
			livesIn: zoo
		});

		assert.equal(zoo.get('animals').length, 2);
		assert.ok(elephant.get('livesIn') === zoo);

		zoo.set({
			id: 2
		});

		assert.equal(zoo.get('animals').length, 2);
		assert.ok(lion.get('livesIn') === zoo);
		assert.ok(elephant.get('livesIn') === zoo);
	});

	QUnit.test('Setting id on objects with reverse relations updates related collection correctly', function(assert) {
		let zoo1 = new Zoo();

		assert.ok(zoo1.get('animals').size() === 0, 'zoo has no animals');

		let lion = new Animal({ livesIn: 2 });
		zoo1.set('id', 2);

		assert.ok(lion.get('livesIn') === zoo1, 'zoo1 connected to lion');
		assert.ok(zoo1.get('animals').length === 1, 'zoo1 has one Animal');
		assert.ok(zoo1.get('animals').at(0) === lion, 'lion added to zoo1');
		assert.ok(zoo1.get('animals').get(lion) === lion, 'lion can be retrieved from zoo1');

		lion.set({ id: 5, livesIn: 2 });

		assert.ok(lion.get('livesIn') === zoo1, 'zoo1 connected to lion');
		assert.ok(zoo1.get('animals').length === 1, 'zoo1 has one Animal');
		assert.ok(zoo1.get('animals').at(0) === lion, 'lion added to zoo1');
		assert.ok(zoo1.get('animals').get(lion) === lion, 'lion can be retrieved from zoo1');

		// Other way around
		let elephant = new Animal({ id: 6 }),
		tiger = new Animal({ id: 7 }),
		zoo2 = new Zoo({ animals: [6] });

		assert.ok(elephant.get('livesIn') === zoo2, 'zoo2 connected to elephant');
		assert.ok(zoo2.get('animals').length === 1, 'zoo2 has one Animal');
		assert.ok(zoo2.get('animals').at(0) === elephant, 'elephant added to zoo2');
		assert.ok(zoo2.get('animals').get(elephant) === elephant, 'elephant can be retrieved from zoo2');

		zoo2.set({ id: 5, animals: [6, 7] });

		assert.ok(elephant.get('livesIn') === zoo2, 'zoo2 connected to elephant');
		assert.ok(tiger.get('livesIn') === zoo2, 'zoo2 connected to tiger');
		assert.ok(zoo2.get('animals').length === 2, 'zoo2 has one Animal');
		assert.ok(zoo2.get('animals').at(0) === elephant, 'elephant added to zoo2');
		assert.ok(zoo2.get('animals').at(1) === tiger, 'tiger added to zoo2');
		assert.ok(zoo2.get('animals').get(elephant) === elephant, 'elephant can be retrieved from zoo2');
		assert.ok(zoo2.get('animals').get(tiger) === tiger, 'tiger can be retrieved from zoo2');
	});

	QUnit.test('Collections can be passed as attributes on creation', function(assert) {
		let animals = new AnimalCollection([
			{ id: 1, species: 'Lion' },
			{ id: 2 ,species: 'Zebra' }
		]);

		let zoo = new Zoo({ animals: animals });

		assert.equal(zoo.get('animals'), animals, 'The \'animals\' collection has been set as the zoo\'s animals');
		assert.equal(zoo.get('animals').length, 2, 'Two animals in \'zoo\'');

		zoo.destroy();

		let newZoo = new Zoo({ animals: animals.models });

		assert.ok(newZoo.get('animals').length === 2, 'Two animals in the \'newZoo\'');
	});

	QUnit.test('Models can be passed as attributes on creation', function(assert) {
		let artis = new Zoo({ name: 'Artis' });

		let animal = new Animal({ species: 'Hippo', livesIn: artis });

		assert.equal(artis.get('animals').at(0), animal, 'Artis has a Hippo');
		assert.equal(animal.get('livesIn'), artis, 'The Hippo is in Artis');
	});

	QUnit.test('id checking handles `undefined`, `null`, `0` ids properly', function(assert) {
		let parent = new Node();
		let child = new Node({ parent: parent });

		assert.ok(child.get('parent') === parent);
		parent.destroy();
		assert.ok(child.get('parent') === null, child.get('parent') + ' === null');

		// It used to be the case that `randomOtherNode` became `child`s parent here, since both the `parent.id`
		// (which is stored as the relation's `keyContents`) and `randomOtherNode.id` were undefined.
		let randomOtherNode = new Node();
		assert.ok(child.get('parent') === null, child.get('parent') + ' === null');

		// Create a child with parent id=0, then create the parent
		child = new Node({ parent: 0 });
		assert.ok(child.get('parent') === null, child.get('parent') + ' === null');

		parent = new Node({ id: 0 });
		assert.ok(child.get('parent') === parent);

		child.destroy();
		parent.destroy();

		// The other way around; create the parent with id=0, then the child
		parent = new Node({ id: 0 });
		assert.equal(parent.get('children').length, 0);

		child = new Node({ parent: 0 });
		assert.ok(child.get('parent') === parent);
	});

	QUnit.test('Relations are not affected by `silent: true`', function(assert) {
		let ceo = new Person({ id: 1 });
		let company = new Company({
			employees: [{ id: 2 }, { id: 3 }, 4],
			ceo: 1
		}, { silent: true }),
		employees = company.get('employees'),
		employee = employees.first();

		assert.ok(company.get('ceo') === ceo);
		assert.ok(employees instanceof Collection);
		assert.equal(employees.length, 2);

		employee.set('company', null, { silent: true });
		assert.equal(employees.length, 1);

		employees.add(employee, { silent: true });
		assert.ok(employee.get('company') === company);

		ceo.set('runs', null, { silent: true });
		assert.ok(!company.get('ceo'));

		let employee4 = new Job({ id: 4 });
		assert.equal(employees.length, 3);
	});

	QUnit.test('Repeated model initialization and a collection should not break existing models', function(assert) {
		let dataCompanyA = {
			id: 'company-a',
			name: 'Big Corp.',
			employees: [{ id: 'job-a' }, { id: 'job-b' }]
		};
		let dataCompanyB = {
			id: 'company-b',
			name: 'Small Corp.',
			employees: []
		};

		let companyA = new Company(dataCompanyA);

		// Attempting to instantiate another model with the same data will throw an error
		assert.throws(function() { new Company(dataCompanyA); }, 'Can only instantiate one model for a given `id` (per model type)');

		// init-ed a lead and its nested contacts are a collection
		assert.ok(companyA.get('employees') instanceof Collection, 'Company\'s employees should be a collection');
		assert.equal(companyA.get('employees').length, 2, 'with elements');

		let CompanyCollection = Collection.extend({
			model: Company
		});
		let companyCollection = new CompanyCollection([dataCompanyA, dataCompanyB]);

		// After loading a collection with models of the same type
		// the existing company should still have correct collections
		assert.ok(companyCollection.get(dataCompanyA.id) === companyA);
		assert.ok(companyA.get('employees') instanceof Collection, 'Company\'s employees should still be a collection');
		assert.equal(companyA.get('employees').length, 2, 'with elements');
	});

	QUnit.test('Destroy removes models from (non-reverse) relations', function(assert) {
		let agent = new Agent({ id: 1, customers: [2, 3, 4], address: { city: 'Utrecht' } });

		let c2 = new Customer({ id: 2 });
		let c3 = new Customer({ id: 3 });
		let c4 = new Customer({ id: 4 });

		assert.ok(agent.get('customers').length === 3);

		c2.destroy();

		assert.ok(agent.get('customers').length === 2);
		assert.ok(agent.get('customers').get(c3) === c3);
		assert.ok(agent.get('customers').get(c4) === c4);

		agent.get('customers').remove(c3);

		assert.ok(agent.get('customers').length === 1);

		assert.ok(agent.get('address') instanceof Address);

		agent.get('address').destroy();

		assert.ok(!agent.get('address'));

		agent.destroy();

		assert.equal(agent.get('customers').length, 0);
	});

	QUnit.test('If keySource is used, don\'t remove a model that is present in the key attribute', function(assert) {
		let ForumPost = Model.extend({
			// Normally would set something here, not needed for test
		});
		let Forum = Model.extend({
			relations: [{
				type: HasMany,
				key: 'posts',
				relatedModel: ForumPost,
				reverseRelation: {
					key: 'forum',
					keySource: 'forum_id'
				}
			}]
		});

		let testPost = new ForumPost({
			id: 1,
			title: 'Hello World',
			forum: { id: 1, title: 'Cupcakes' }
		});

		let testForum = Forum.findOrCreate(1);

		assert.notEqual(testPost.get('forum'), null, 'The post\'s forum is not null');
		assert.equal(testPost.get('forum').get('title'), 'Cupcakes', 'The post\'s forum title is Cupcakes');
		assert.equal(testForum.get('title'), 'Cupcakes', 'A forum of id 1 has the title cupcakes');

		let testPost2 = new ForumPost({
			id: 3,
			title: 'Hello World',
			forum: { id: 2, title: 'Donuts' },
			forum_id: 3
		});

		assert.notEqual(testPost2.get('forum'), null, 'The post\'s forum is not null');
		assert.equal(testPost2.get('forum').get('title'), 'Donuts', 'The post\'s forum title is Donuts');
		assert.deepEqual(testPost2.getRelation('forum').keyContents, { id: 2, title: 'Donuts' }, 'The expected forum is 2');
		assert.equal(testPost2.getRelation('forum').keyId, null, 'There\'s no expected forum anymore');

		let testPost3 = new ForumPost({
			id: 4,
			title: 'Hello World',
			forum: null,
			forum_id: 3
		});

		assert.equal(testPost3.get('forum'), null, 'The post\'s forum is null');
		assert.equal(testPost3.getRelation('forum').keyId, 3, 'Forum is expected to have id=3');
	});

	// GH-187

	QUnit.test('Can pass related model in constructor', function(assert) {
		let A = Model.extend();
		let B = Model.extend({
			relations: [{
				type: HasOne,
				key: 'a',
				keySource: 'a_id',
				relatedModel: A
			}]
		});

		let a1 = new A({ id: 'a1' });
		let b1 = new B();
		b1.set('a', a1);
		assert.ok(b1.get('a') instanceof A);
		assert.ok(b1.get('a').id === 'a1');

		let a2 = new A({ id: 'a2' });
		let b2 = new B({ a: a2 });
		assert.ok(b2.get('a') instanceof A);
		assert.ok(b2.get('a').id === 'a2');
	});
});
