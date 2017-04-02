import { reset } from './setup/setup';
import { store, Model, HasMany, Collection, eventQueue } from 'backbone-relational';
import { Person, Animal, AnimalCollection, Node, House, NodeList, PersonCollection, Zoo, Company, Job, User, Password } from './setup/objects';
import initObjects from './setup/data';
import _ from 'underscore';

let objects;
let modelScope;

QUnit.module('store', {
	beforeEach() {
		reset();
		modelScope = {
			Person,
			Animal,
			Node,
			House,
			Zoo,
			Company,
			Job,
			User,
			Password
		};

		store.addModelScope(modelScope);
		objects = initObjects();
	}
}, () => {
	QUnit.test('Initialized', function(assert) {
		// setup instantiates models of the following types: `Person`, `Job`, `Company`, `User`, `House` and `Password`.
		assert.equal(store._collections.length, 6, 'Store contains 6 collections');
	});

	QUnit.test('getObjectByName', function(assert) {
		assert.equal(store.getObjectByName('Person'), Person);
	});

	QUnit.test('Add and remove from store', function(assert) {
		let coll = store.getCollection(objects.person1);
		let length = coll.length;

		let person = new Person({
			id: 'person-10',
			name: 'Remi',
			resource_uri: 'person-10'
		});

		assert.ok(coll.length === length + 1, 'Collection size increased by 1');

		let request = person.destroy();
		// Trigger the 'success' callback to fire the 'destroy' event
		request.success();

		assert.ok(coll.length === length, 'Collection size decreased by 1');
	});

	QUnit.test('addModelScope', function(assert) {
		let models = {};
		store.addModelScope(models);

		models.Book = Model.extend({
			relations: [{
				type: HasMany,
				key: 'pages',
				relatedModel: 'Page',
				createModels: false,
				reverseRelation: {
					key: 'book'
				}
			}]
		});
		models.Page = Model.extend();

		let book = new models.Book();
		let page = new models.Page({ book: book });

		assert.ok(book.relations.length === 1);
		assert.ok(book.get('pages').length === 1);
	});

	QUnit.test('addModelScope with submodels and namespaces', function(assert) {
		let ns = {};
		ns.People = {};
		store.addModelScope(ns);

		ns.People.Person = Model.extend({
			subModelTypes: {
				'Student': 'People.Student'
			},
			iam() { return 'I am an abstract person'; }
		});

		ns.People.Student = ns.People.Person.extend({
			iam() { return 'I am a student'; }
		});

		ns.People.PersonCollection = Collection.extend({
			model: ns.People.Person
		});

		let people = new ns.People.PersonCollection([{name: 'Bob', type: 'Student'}]);

		assert.ok(people.at(0).iam() === 'I am a student');
	});

	QUnit.test('removeModelScope', function(assert) {
		let models = {};
		store.addModelScope(models);

		models.Page = Model.extend();

		assert.ok(store.getObjectByName('Page') === models.Page);
		assert.ok(store.getObjectByName('Person') === modelScope.Person);

		store.removeModelScope(models);

		assert.ok(!store.getObjectByName('Page'));
		assert.ok(store.getObjectByName('Person') === modelScope.Person);

		store.removeModelScope(modelScope);

		assert.ok(!store.getObjectByName('Person'));
	});

	QUnit.test('unregister', function(assert) {
		let animalStoreColl = store.getCollection(Animal),
		animals = null,
		animal = null;

		// Single model
		animal = new Animal({ id: 'a1' });
		assert.ok(store.find(Animal, 'a1') === animal);

		store.unregister(animal);
		assert.ok(store.find(Animal, 'a1') === null);

		animal = new Animal({ id: 'a2' });
		assert.ok(store.find(Animal, 'a2') === animal);

		animal.trigger('relational:unregister', animal);
		assert.ok(store.find(Animal, 'a2') === null);

		assert.ok(animalStoreColl.size() === 0);

		// Collection
		animals = new AnimalCollection([{ id: 'a3' }, { id: 'a4' }]);
		animal = animals.first();

		assert.ok(store.find(Animal, 'a3') === animal);
		assert.ok(animalStoreColl.size() === 2);

		store.unregister(animals);
		assert.ok(store.find(Animal, 'a3') === null);

		assert.ok(animalStoreColl.size() === 0);

		// Store collection
		animals = new AnimalCollection([{ id: 'a5' }, { id: 'a6' }]);
		assert.ok(animalStoreColl.size() === 2);

		store.unregister(animalStoreColl);
		assert.ok(animalStoreColl.size() === 0);

		// Model type
		animals = new AnimalCollection([{ id: 'a7' }, { id: 'a8' }]);
		assert.ok(animalStoreColl.size() === 2);

		store.unregister(Animal);
		assert.ok(animalStoreColl.size() === 0);
	});

	QUnit.test('`eventQueue` is unblocked again after a duplicate id error', function(assert) {
		let node = new Node({ id: 1 });

		assert.ok(eventQueue.isBlocked() === false);

		try {
			duplicateNode = new Node({ id: 1 });
		}		catch (error) {
			assert.ok(true, 'Duplicate id error thrown');
		}

		assert.ok(eventQueue.isBlocked() === false);
	});

	QUnit.test('Don\'t allow setting a duplicate `id`', function(assert) {
		let a = new Zoo(); // This object starts with no id.
		let b = new Zoo({ id: 42 });  // This object starts with an id of 42.

		assert.equal(b.id, 42);
		assert.throws(() => { a.set('id', 42); });
		assert.ok(!a.id, 'a.id=' + a.id);
		assert.equal(b.id, 42);
	});

	QUnit.test('Models are created from objects, can then be found, destroyed, cannot be found anymore', function(assert) {
		let houseId = 'house-10';
		let personId = 'person-10';

		let anotherHouse = new House({
			id: houseId,
			location: 'no country for old men',
			resource_uri: houseId,
			occupants: [{
				id: personId,
				name: 'Remi',
				resource_uri: personId
			}]
		});

		assert.ok(anotherHouse.get('occupants') instanceof Collection, 'Occupants is a Collection');
		assert.ok(anotherHouse.get('occupants').get(personId) instanceof Person, 'Occupants contains the Person with id=\'' + personId + '\'');

		let person = store.find(Person, personId);

		assert.ok(person, 'Person with id=' + personId + ' is found in the store');

		let request = person.destroy();
		// Trigger the 'success' callback to fire the 'destroy' event
		request.success();

		person = store.find(Person, personId);

		assert.ok(!person, personId + ' is not found in the store anymore');
		assert.ok(!anotherHouse.get('occupants').get(personId), 'Occupants no longer contains the Person with id=\'' + personId + '\'');

		request = anotherHouse.destroy();
		// Trigger the 'success' callback to fire the 'destroy' event
		request.success();

		let house = store.find(House, houseId);

		assert.ok(!house, houseId + ' is not found in the store anymore');
	});

	QUnit.test('Model.collection is the first collection a Model is added to by an end-user (not its store collection!)', function(assert) {
		let person = new Person({ id: 5, name: 'New guy' });
		let personColl = new PersonCollection();
		personColl.add(person);
		assert.ok(person.collection === personColl);
	});

	QUnit.test('Models don\'t get added to the store until the get an id', function(assert) {
		let storeColl = store.getCollection(Node),
		node1 = new Node({ id: 1 }),
		node2 = new Node();

		assert.ok(storeColl.contains(node1));
		assert.ok(!storeColl.contains(node2));

		node2.set({ id: 2 });

		assert.ok(storeColl.contains(node1));
	});

	QUnit.test('All models can be found after adding them to a Collection via \'Collection.reset\'', function(assert) {
		let nodes = [
			{ id: 1, parent: null },
			{ id: 2, parent: 1 },
			{ id: 3, parent: 4 },
			{ id: 4, parent: 1 }
		];

		let nodeList = new NodeList();
		nodeList.reset(nodes);

		let storeColl = store.getCollection(Node);
		assert.equal(storeColl.length, 4, 'Every Node is in store');
		assert.ok(store.find(Node, 1) instanceof Node, 'Node 1 can be found');
		assert.ok(store.find(Node, 2) instanceof Node, 'Node 2 can be found');
		assert.ok(store.find(Node, 3) instanceof Node, 'Node 3 can be found');
		assert.ok(store.find(Node, 4) instanceof Node, 'Node 4 can be found');
	});

	QUnit.test('Inheritance creates and uses a separate collection', function(assert) {
		let whale = new Animal({ id: 1, species: 'whale' });
		assert.ok(store.find(Animal, 1) === whale);

		let numCollections = store._collections.length;

		let Mammal = Animal.extend({
			urlRoot: '/mammal/'
		});

		let lion = new Mammal({ id: 1, species: 'lion' });
		let donkey = new Mammal({ id: 2, species: 'donkey' });

		assert.equal(store._collections.length, numCollections + 1);
		assert.ok(store.find(Animal, 1) === whale);
		assert.ok(store.find(Mammal, 1) === lion);
		assert.ok(store.find(Mammal, 2) === donkey);

		let Primate = Mammal.extend({
			urlRoot: '/primate/'
		});

		let gorilla = new Primate({ id: 1, species: 'gorilla' });

		assert.equal(store._collections.length, numCollections + 2);
		assert.ok(store.find(Primate, 1) === gorilla);
	});

	QUnit.test('Inheritance with `subModelTypes` uses the same collection as the model\'s super', function(assert) {
		let Mammal = Animal.extend({
			subModelTypes: {
				'primate': 'Primate',
				'carnivore': 'Carnivore'
			}
		});

		window.Primate = Mammal.extend();
		window.Carnivore = Mammal.extend();

		let lion = new Carnivore({ id: 1, species: 'lion' });
		let wolf = new Carnivore({ id: 2, species: 'wolf' });

		let numCollections = store._collections.length;

		let whale = new Mammal({ id: 3, species: 'whale' });

		assert.equal(store._collections.length, numCollections, '`_collections` should have remained the same');

		assert.ok(store.find(Mammal, 1) === lion);
		assert.ok(store.find(Mammal, 2) === wolf);
		assert.ok(store.find(Mammal, 3) === whale);
		assert.ok(store.find(Carnivore, 1) === lion);
		assert.ok(store.find(Carnivore, 2) === wolf);
		assert.ok(store.find(Carnivore, 3) !== whale);

		let gorilla = new Primate({ id: 4, species: 'gorilla' });

		assert.equal(store._collections.length, numCollections, '`_collections` should have remained the same');

		assert.ok(store.find(Animal, 4) !== gorilla);
		assert.ok(store.find(Mammal, 4) === gorilla);
		assert.ok(store.find(Primate, 4) === gorilla);

		delete window.Primate;
		delete window.Carnivore;
	});

	QUnit.test('findOrCreate does not modify attributes hash if parse is used, prior to creating new model', function(assert) {
	let model = Model.extend({
		parse(response) {
			response.id = response.id + 'something';
			return response;
		}
	});
	let attributes = {id: 42, foo: 'bar'};
	let testAttributes = {id: 42, foo: 'bar'};

	model.findOrCreate(attributes, { parse: true, merge: false, create: false });

	assert.ok(_.isEqual(attributes, testAttributes), 'attributes hash should not be modified');
});
});
