import { reset } from './setup/setup';
import { store, Model, HasMany, HasOne, Collection } from 'backbone-relational';
import { Zoo, Animal, House, Person, Node, User, Company, NodeList } from './setup/objects';
import initObjects from './setup/data';

let objects;

QUnit.module('Reverse relations', {
	beforeEach() {
		reset();
		store.addModelScope({
			Zoo, Animal, House, Person, Node, User, Company
		});
		objects = initObjects();
	}
}, () => {
	QUnit.test('Add and remove', function(assert) {
		assert.equal(objects.ourHouse.get('occupants').length, 1, 'objects.ourHouse has 1 occupant');
		assert.equal(objects.person1.get('livesIn'), null, 'Person 1 doesn\'t live anywhere');

		objects.ourHouse.get('occupants').add(objects.person1);

		assert.equal(objects.ourHouse.get('occupants').length, 2, 'Our House has 2 occupants');
		assert.equal(objects.person1.get('livesIn') && objects.person1.get('livesIn').id, objects.ourHouse.id, 'Person 1 lives in objects.ourHouse');

		objects.person1.set({ 'livesIn': objects.theirHouse });

		assert.equal(objects.theirHouse.get('occupants').length, 1, 'objects.theirHouse has 1 occupant');
		assert.equal(objects.ourHouse.get('occupants').length, 1, 'objects.ourHouse has 1 occupant');
		assert.equal(objects.person1.get('livesIn') && objects.person1.get('livesIn').id, objects.theirHouse.id, 'Person 1 lives in objects.theirHouse');
	});

	QUnit.test('Destroy removes models from reverse relations', function(assert) {
		let zoo = new Zoo({ id: 1, animals: [2, 3, 4] });

		let rhino = new Animal({ id: 2, species: 'rhino' });
		let baboon = new Animal({ id: 3, species: 'baboon' });
		let hippo = new Animal({ id: 4, species: 'hippo' });

		assert.ok(zoo.get('animals').length === 3);

		rhino.destroy();

		assert.ok(zoo.get('animals').length === 2);
		assert.ok(zoo.get('animals').get(baboon) === baboon);
		assert.ok(!rhino.get('zoo'));

		zoo.get('animals').remove(hippo);

		assert.ok(zoo.get('animals').length === 1);
		assert.ok(!hippo.get('zoo'));

		zoo.destroy();

		assert.ok(zoo.get('animals').length === 0);
		assert.ok(!baboon.get('zoo'));
	});

	QUnit.test('HasOne relations to self (tree stucture)', function(assert) {
		let child1 = new Node({ id: '2', parent: '1', name: 'First child' });
		let parent = new Node({ id: '1', name: 'Parent' });
		let child2 = new Node({ id: '3', parent: '1', name: 'Second child' });

		assert.equal(parent.get('children').length, 2);
		assert.ok(parent.get('children').include(child1));
		assert.ok(parent.get('children').include(child2));

		assert.ok(child1.get('parent') === parent);
		assert.equal(child1.get('children').length, 0);

		assert.ok(child2.get('parent') === parent);
		assert.equal(child2.get('children').length, 0);
	});

	QUnit.test('Models referencing each other in the same relation', function(assert) {
		let parent = new Node({ id: 1 });
		let child = new Node({ id: 2 });

		child.set('parent', parent);
		parent.save({ 'parent': child });

		assert.ok(parent.get('parent') === child);
		assert.ok(child.get('parent') === parent);
	});

	QUnit.test('HasMany relations to self (tree structure)', function(assert) {
		let child1 = new Node({ id: '2', name: 'First child' });
		let parent = new Node({ id: '1', children: ['2', '3'], name: 'Parent' });
		let child2 = new Node({ id: '3', name: 'Second child' });

		assert.equal(parent.get('children').length, 2);
		assert.ok(parent.get('children').include(child1));
		assert.ok(parent.get('children').include(child2));

		assert.ok(child1.get('parent') === parent);
		assert.equal(child1.get('children').length, 0);

		assert.ok(child2.get('parent') === parent);
		assert.equal(child2.get('children').length, 0);
	});

	QUnit.test('HasOne relations to self (cycle, directed graph structure)', function(assert) {
		let node1 = new Node({ id: '1', parent: '3', name: 'First node' });
		let node2 = new Node({ id: '2', parent: '1', name: 'Second node' });
		let node3 = new Node({ id: '3', parent: '2', name: 'Third node' });

		assert.ok(node1.get('parent') === node3);
		assert.equal(node1.get('children').length, 1);
		assert.ok(node1.get('children').at(0) === node2);

		assert.ok(node2.get('parent') === node1);
		assert.equal(node2.get('children').length, 1);
		assert.ok(node2.get('children').at(0) === node3);

		assert.ok(node3.get('parent') === node2);
		assert.equal(node3.get('children').length, 1);
		assert.ok(node3.get('children').at(0) === node1);
	});

	QUnit.test('New objects (no \'id\' yet) have working relations', function(assert) {
		let person = new Person({
			name: 'Remi'
		});

		person.set({ user: { login: '1', email: '1' } });
		let user1 = person.get('user');

		assert.ok(user1 instanceof User, 'User created on Person');
		assert.equal(user1.get('login'), '1', 'person.user is the correct User');

		let user2 = new User({
			login: '2',
			email: '2'
		});

		assert.ok(user2.get('person') === null, '\'user\' doesn\'t belong to a \'person\' yet');

		person.set({ user: user2 });

		assert.ok(user1.get('person') === null);
		assert.ok(person.get('user') === user2);
		assert.ok(user2.get('person') === person);

		objects.person2.set({ user: user2 });

		assert.ok(person.get('user') === null);
		assert.ok(objects.person2.get('user') === user2);
		assert.ok(user2.get('person') === objects.person2);
	});

	QUnit.test('\'Save\' objects (performing \'set\' multiple times without and with id)', function(assert) {
		objects.person3
		.on('add:jobs', function(model, coll) {
			// console.log('got here 1');
			let company = model.get('company');
			assert.ok(company instanceof Company && company.get('ceo').get('name') === 'Lunar boy' && model.get('person') === objects.person3,
			'add:jobs: Both Person and Company are set on the Job instance once the event gets fired');
		})
		.on('remove:jobs', function(model, coll) {
			// console.log('got here 2');
			assert.ok(false, 'remove:jobs: \'objects.person3\' should not lose his job');
		});

		// Create Models from an object. Should trigger `add:jobs` on `objects.person3`
		let company = new Company({
			name: 'Luna Corp.',
			ceo: {
				name: 'Lunar boy'
			},
			employees: [{ person: 'person-3' }]
		});

		company
		.on('add:employees', function(model, coll) {
			// console.log('got here 3');
			let company = model.get('company');
			assert.ok(company instanceof Company && company.get('ceo').get('name') === 'Lunar boy' && model.get('person') === objects.person3,
			'add:employees: Both Person and Company are set on the Company instance once the event gets fired');
		})
		.on('remove:employees', function(model, coll) {
			// console.log('got here 4');
			assert.ok(true, '\'remove:employees: objects.person3\' should lose a job once');
		});

		// Model.save executes "model.set(model.parse(resp), options)". Set a full map over object, but now with ids.
		// Should trigger `remove:employees`, `add:employees`, and `add:jobs`
		company.set({
			id: 'company-3',
			name: 'Big Corp.',
			ceo: {
				id: 'person-4',
				name: 'Lunar boy',
				resource_uri: 'person-4'
			},
			employees: [{ id: 'job-1', person: 'person-3', resource_uri: 'job-1' }],
			resource_uri: 'company-3'
		});

		// This should not trigger additional `add`/`remove` events
		company.set({
			employees: ['job-1']
		});
	});

	QUnit.test('Set the same value a couple of time, by \'id\' and object', function(assert) {
		objects.person1.set({ likesALot: 'person-2' });
		objects.person1.set({ likesALot: objects.person2 });

		assert.ok(objects.person1.get('likesALot') === objects.person2);
		assert.ok(objects.person2.get('likedALotBy') === objects.person1);

		objects.person1.set({ likesALot: 'person-2' });

		assert.ok(objects.person1.get('likesALot') === objects.person2);
		assert.ok(objects.person2.get('likedALotBy') === objects.person1);
	});

	QUnit.test('Numerical keys', function(assert) {
		let child1 = new Node({ id: 2, name: 'First child' });
		let parent = new Node({ id: 1, children: [2, 3], name: 'Parent' });
		let child2 = new Node({ id: 3, name: 'Second child' });

		assert.equal(parent.get('children').length, 2);
		assert.ok(parent.get('children').include(child1));
		assert.ok(parent.get('children').include(child2));

		assert.ok(child1.get('parent') === parent);
		assert.equal(child1.get('children').length, 0);

		assert.ok(child2.get('parent') === parent);
		assert.equal(child2.get('children').length, 0);
	});

	QUnit.test('Relations that use refs to other models (instead of keys)', function(assert) {
		let child1 = new Node({ id: 2, name: 'First child' });
		let parent = new Node({ id: 1, children: [child1, 3], name: 'Parent' });
		let child2 = new Node({ id: 3, name: 'Second child' });

		assert.ok(child1.get('parent') === parent);
		assert.equal(child1.get('children').length, 0);

		assert.equal(parent.get('children').length, 2);
		assert.ok(parent.get('children').include(child1));
		assert.ok(parent.get('children').include(child2));

		let child3 = new Node({ id: 4, parent: parent, name: 'Second child' });

		assert.equal(parent.get('children').length, 3);
		assert.ok(parent.get('children').include(child3));

		assert.ok(child3.get('parent') === parent);
		assert.equal(child3.get('children').length, 0);
	});

	QUnit.test('Add an already existing model (reverseRelation shouldn\'t exist yet) to a relation as a hash', function(assert) {
		// This test caused a race condition to surface:
		// The 'relation's constructor initializes the 'reverseRelation', which called 'relation.addRelated' in it's 'initialize'.
		// However, 'relation's 'initialize' has not been executed yet, so it doesn't have a 'related' collection yet.
		let Properties = Model.extend({});
		let View = Model.extend({
			relations: [
				{
					type: HasMany,
					key: 'properties',
					relatedModel: Properties,
					reverseRelation: {
						type: HasOne,
						key: 'view'
					}
				}
			]
		});

		let props = new Properties({ id: 1, key: 'width', value: '300px', view: 1 });
		let view = new View({
			id: 1,
			properties: [{ id: 1, key: 'width', value: '300px', view: 1 }]
		});

		assert.ok(props.get('view') === view);
		assert.ok(view.get('properties').include(props));
	});

	QUnit.test('Reverse relations are found for models that have not been instantiated and use .extend()', function(assert) {
		let View = Model.extend({ });
		let Property = Model.extend({
			relations: [{
				type: HasOne,
				key: 'view',
				relatedModel: View,
				reverseRelation: {
					type: HasMany,
					key: 'properties'
				}
			}]
		});

		let view = new View({
			id: 1,
			properties: [{ id: 1, key: 'width', value: '300px' }]
		});

		assert.ok(view.get('properties') instanceof Collection);
	});

	QUnit.test('Reverse relations found for models that have not been instantiated and run .setup() manually', function(assert) {
		// Generated from CoffeeScript code:
		// 	 class View extends Model
		//
		// 	 View.setup()
		//
		// 	 class Property extends Model
		// 	   relations: [
		// 	     type: HasOne
		// 	     key: 'view'
		// 	     relatedModel: View
		// 	     reverseRelation:
		// 	       type: HasMany
		// 	       key: 'properties'
		// 	   ]
		//
		// 	 Property.setup()

		let Property, View,
		__hasProp = {}.hasOwnProperty,
		__extends = function(child, parent) {
			for (let key in parent) {
				if (__hasProp.call(parent, key)) {
					child[key] = parent[key];
				}
			}
			function Ctor() { this.constructor = child; }
			Ctor.prototype = parent.prototype;
			child.prototype = new Ctor;
			child.__super__ = parent.prototype;
			return child;
		};

		View = (function(_super) {
			__extends(View, _super);

			function View() {
				return View.__super__.constructor.apply(this, arguments);
			}

			return View;
		})(Model);

		View.setup();

		Property = (function(_super) {
			__extends(Property, _super);

			function Property() {
				return Property.__super__.constructor.apply(this, arguments);
			}

			Property.prototype.relations = [{
				type: HasOne,
				key: 'view',
				relatedModel: View,
				reverseRelation: {
					type: HasMany,
					key: 'properties'
				}
			}];

			return Property;
		})(Model);

		Property.setup();

		let view = new View({
			id: 1,
			properties: [{ id: 1, key: 'width', value: '300px' }]
		});

		assert.ok(view.get('properties') instanceof Collection);
	});

	QUnit.test('ReverseRelations are applied retroactively', function(assert) {
		// Use brand new Model types, so we can be sure we don't have any reverse relations cached from previous tests
		let NewUser = Model.extend({});
		let NewPerson = Model.extend({
			relations: [{
				type: HasOne,
				key: 'user',
				relatedModel: NewUser,
				reverseRelation: {
					type: HasOne,
					key: 'person'
				}
			}]
		});

		let user = new NewUser({ id: 'newuser-1' });
		//var user2 = new NewUser( { id: 'newuser-2', person: 'newperson-1' } );
		let person = new NewPerson({ id: 'newperson-1', user: user });

		assert.ok(person.get('user') === user);
		assert.ok(user.get('person') === person);
		//console.log( person, user );
	});

	QUnit.test('ReverseRelations are applied retroactively (2)', function(assert) {
		let models = {};
		store.addModelScope(models);

		// Use brand new Model types, so we can be sure we don't have any reverse relations cached from previous tests
		models.NewPerson = Model.extend({
			relations: [{
				type: HasOne,
				key: 'user',
				relatedModel: 'NewUser',
				reverseRelation: {
					type: HasOne,
					key: 'person'
				}
			}]
		});
		models.NewUser = Model.extend({});

		let user = new models.NewUser({ id: 'newuser-1', person: { id: 'newperson-1' } });

		assert.equal(user.getRelations().length, 1);
		assert.ok(user.get('person') instanceof models.NewPerson);
	});

	QUnit.test('Deep reverse relation starting from a collection', function(assert) {
		let nodes = new NodeList([
			{
				id: 1,
				children: [
					{
						id: 2,
						children: [
							{
								id: 3,
								children: [1]
							}
						]
					}
				]
			}
		]);

		let parent = nodes.first();
		assert.ok(parent, 'first item accessible after resetting collection');

		assert.ok(parent.collection === nodes, '`parent.collection` is set to `nodes`');

		let child = parent.get('children').first();
		assert.ok(child, '`child` can be retrieved from `parent`');
		assert.ok(child.get('parent'), 'reverse relation from `child` to `parent` works');

		let grandchild = child.get('children').first();
		assert.ok(grandchild, '`grandchild` can be retrieved from `child`');

		assert.ok(grandchild.get('parent'), 'reverse relation from `grandchild` to `child` works');

		assert.ok(grandchild.get('children').first() === parent, 'reverse relation from `grandchild` to `parent` works');
		assert.ok(parent.get('parent') === grandchild, 'circular reference from `grandchild` to `parent` works');
	});

	QUnit.test('Deep reverse relation starting from a collection, with existing model', function(assert) {
	new Node({ id: 1 });

	let nodes = new NodeList();
	nodes.set([
		{
			id: 1,
			children: [
				{
					id: 2,
					children: [
						{
							id: 3,
							children: [1]
						}
					]
				}
			]
		}
	]);

	let parent = nodes.first();
	assert.ok(parent && parent.id === 1, 'first item accessible after resetting collection');

	let child = parent.get('children').first();
	assert.ok(child, '`child` can be retrieved from `parent`');
	assert.ok(child.get('parent'), 'reverse relation from `child` to `parent` works');

	let grandchild = child.get('children').first();
	assert.ok(grandchild, '`grandchild` can be retrieved from `child`');

	assert.ok(grandchild.get('parent'), 'reverse relation from `grandchild` to `child` works');

	assert.ok(grandchild.get('children').first() === parent, 'reverse relation from `grandchild` to `parent` works');
	assert.ok(parent.get('parent') === grandchild, 'circular reference from `grandchild` to `parent` works');
});
});
