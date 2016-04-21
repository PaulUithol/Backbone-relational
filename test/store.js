QUnit.module( "Backbone.Store", { setup: require('./setup/data') } );

	QUnit.test( "Initialized", function() {
		// `initObjects` instantiates models of the following types: `Person`, `Job`, `Company`, `User`, `House` and `Password`.
		equal( Backbone.Relational.store._collections.length, 6, "Store contains 6 collections" );
	});

	QUnit.test( "getObjectByName", function() {
		equal( Backbone.Relational.store.getObjectByName( 'Backbone.RelationalModel' ), Backbone.RelationalModel );
	});

	QUnit.test( "Add and remove from store", function() {
		var coll = Backbone.Relational.store.getCollection( person1 );
		var length = coll.length;

		var person = new Person({
			id: 'person-10',
			name: 'Remi',
			resource_uri: 'person-10'
		});

		ok( coll.length === length + 1, "Collection size increased by 1" );

		var request = person.destroy();
		// Trigger the 'success' callback to fire the 'destroy' event
		request.success();

		ok( coll.length === length, "Collection size decreased by 1" );
	});

	QUnit.test( "addModelScope", function() {
		var models = {};
		Backbone.Relational.store.addModelScope( models );

		models.Book = Backbone.RelationalModel.extend({
			relations: [{
				type: Backbone.HasMany,
				key: 'pages',
				relatedModel: 'Page',
				createModels: false,
				reverseRelation: {
					key: 'book'
				}
			}]
		});
		models.Page = Backbone.RelationalModel.extend();

		var book = new models.Book();
		var page = new models.Page({ book: book });

		ok( book.relations.length === 1 );
		ok( book.get( 'pages' ).length === 1 );
	});

	QUnit.test( "addModelScope with submodels and namespaces", function() {
		var ns = {};
		ns.People = {};
		Backbone.Relational.store.addModelScope( ns );

		ns.People.Person = Backbone.RelationalModel.extend({
			subModelTypes: {
				'Student': 'People.Student'
			},
			iam: function() { return "I am an abstract person"; }
		});

		ns.People.Student = ns.People.Person.extend({
			iam: function() { return "I am a student"; }
		});

		ns.People.PersonCollection = Backbone.Collection.extend({
			model: ns.People.Person
		});

		var people = new ns.People.PersonCollection([{name: "Bob", type: "Student"}]);

		ok( people.at(0).iam() === "I am a student" );
	});

	QUnit.test( "removeModelScope", function() {
		var models = {};
		Backbone.Relational.store.addModelScope( models );

		models.Page = Backbone.RelationalModel.extend();

		ok( Backbone.Relational.store.getObjectByName( 'Page' ) === models.Page );
		ok( Backbone.Relational.store.getObjectByName( 'Person' ) === window.Person );

		Backbone.Relational.store.removeModelScope( models );

		ok( !Backbone.Relational.store.getObjectByName( 'Page' ) );
		ok( Backbone.Relational.store.getObjectByName( 'Person' ) === window.Person );

		Backbone.Relational.store.removeModelScope( window );

		ok( !Backbone.Relational.store.getObjectByName( 'Person' ) );
	});

	QUnit.test( "unregister", function() {
		var animalStoreColl = Backbone.Relational.store.getCollection( Animal ),
			animals = null,
			animal = null;

		// Single model
		animal = new Animal( { id: 'a1' } );
		ok( Backbone.Relational.store.find( Animal, 'a1' ) === animal );

		Backbone.Relational.store.unregister( animal );
		ok( Backbone.Relational.store.find( Animal, 'a1' ) === null );

		animal = new Animal( { id: 'a2' } );
		ok( Backbone.Relational.store.find( Animal, 'a2' ) === animal );

		animal.trigger( 'relational:unregister', animal );
		ok( Backbone.Relational.store.find( Animal, 'a2' ) === null );

		ok( animalStoreColl.size() === 0 );

		// Collection
		animals = new AnimalCollection( [ { id: 'a3' }, { id: 'a4' } ] );
		animal = animals.first();

		ok( Backbone.Relational.store.find( Animal, 'a3' ) === animal );
		ok( animalStoreColl.size() === 2 );

		Backbone.Relational.store.unregister( animals );
		ok( Backbone.Relational.store.find( Animal, 'a3' ) === null );

		ok( animalStoreColl.size() === 0 );

		// Store collection
		animals = new AnimalCollection( [ { id: 'a5' }, { id: 'a6' } ] );
		ok( animalStoreColl.size() === 2 );

		Backbone.Relational.store.unregister( animalStoreColl );
		ok( animalStoreColl.size() === 0 );

		// Model type
		animals = new AnimalCollection( [ { id: 'a7' }, { id: 'a8' } ] );
		ok( animalStoreColl.size() === 2 );

		Backbone.Relational.store.unregister( Animal );
		ok( animalStoreColl.size() === 0 );
	});

	QUnit.test( "`eventQueue` is unblocked again after a duplicate id error", 3, function() {
		var node = new Node( { id: 1 } );

		ok( Backbone.Relational.eventQueue.isBlocked() === false );

		try {
			duplicateNode = new Node( { id: 1 } );
		}
		catch( error ) {
			ok( true, "Duplicate id error thrown" );
		}

		ok( Backbone.Relational.eventQueue.isBlocked() === false );
	});

	QUnit.test( "Don't allow setting a duplicate `id`", 4, function() {
		var a = new Zoo(); // This object starts with no id.
		var b = new Zoo( { 'id': 42 } );  // This object starts with an id of 42.

		equal( b.id, 42 );

		try {
			a.set( 'id', 42 );
		}
		catch( error ) {
			ok( true, "Duplicate id error thrown" );
		}

		ok( !a.id, "a.id=" + a.id );
		equal( b.id, 42 );
	});

	QUnit.test( "Models are created from objects, can then be found, destroyed, cannot be found anymore", function() {
		var houseId = 'house-10';
		var personId = 'person-10';

		var anotherHouse = new House({
			id: houseId,
			location: 'no country for old men',
			resource_uri: houseId,
			occupants: [{
				id: personId,
				name: 'Remi',
				resource_uri: personId
			}]
		});

		ok( anotherHouse.get('occupants') instanceof Backbone.Collection, "Occupants is a Collection" );
		ok( anotherHouse.get('occupants').get( personId ) instanceof Person, "Occupants contains the Person with id='" + personId + "'" );

		var person = Backbone.Relational.store.find( Person, personId );

		ok( person, "Person with id=" + personId + " is found in the store" );

		var request = person.destroy();
		// Trigger the 'success' callback to fire the 'destroy' event
		request.success();

		person = Backbone.Relational.store.find( Person, personId );

		ok( !person, personId + " is not found in the store anymore" );
		ok( !anotherHouse.get('occupants').get( personId ), "Occupants no longer contains the Person with id='" + personId + "'" );

		request = anotherHouse.destroy();
		// Trigger the 'success' callback to fire the 'destroy' event
		request.success();

		var house = Backbone.Relational.store.find( House, houseId );

		ok( !house, houseId + " is not found in the store anymore" );
	});

	QUnit.test( "Model.collection is the first collection a Model is added to by an end-user (not its Backbone.Store collection!)", function() {
		var person = new Person( { id: 5, name: 'New guy' } );
		var personColl = new PersonCollection();
		personColl.add( person );
		ok( person.collection === personColl );
	});

	QUnit.test( "Models don't get added to the store until the get an id", function() {
		var storeColl = Backbone.Relational.store.getCollection( Node ),
			node1 = new Node( { id: 1 } ),
			node2 = new Node();

		ok( storeColl.contains( node1 ) );
		ok( !storeColl.contains( node2 ) );

		node2.set( { id: 2 } );

		ok( storeColl.contains( node1 ) );
	});

	QUnit.test( "All models can be found after adding them to a Collection via 'Collection.reset'", function() {
		var nodes = [
			{ id: 1, parent: null },
			{ id: 2, parent: 1 },
			{ id: 3, parent: 4 },
			{ id: 4, parent: 1 }
		];

		var nodeList = new NodeList();
		nodeList.reset( nodes );

		var storeColl = Backbone.Relational.store.getCollection( Node );
		equal( storeColl.length, 4, "Every Node is in Backbone.Relational.store" );
		ok( Backbone.Relational.store.find( Node, 1 ) instanceof Node, "Node 1 can be found" );
		ok( Backbone.Relational.store.find( Node, 2 ) instanceof Node, "Node 2 can be found" );
		ok( Backbone.Relational.store.find( Node, 3 ) instanceof Node, "Node 3 can be found" );
		ok( Backbone.Relational.store.find( Node, 4 ) instanceof Node, "Node 4 can be found" );
	});

	QUnit.test( "Inheritance creates and uses a separate collection", function() {
		var whale = new Animal( { id: 1, species: 'whale' } );
		ok( Backbone.Relational.store.find( Animal, 1 ) === whale );

		var numCollections = Backbone.Relational.store._collections.length;

		var Mammal = Animal.extend({
			urlRoot: '/mammal/'
		});

		var lion = new Mammal( { id: 1, species: 'lion' } );
		var donkey = new Mammal( { id: 2, species: 'donkey' } );

		equal( Backbone.Relational.store._collections.length, numCollections + 1 );
		ok( Backbone.Relational.store.find( Animal, 1 ) === whale );
		ok( Backbone.Relational.store.find( Mammal, 1 ) === lion );
		ok( Backbone.Relational.store.find( Mammal, 2 ) === donkey );

		var Primate = Mammal.extend({
			urlRoot: '/primate/'
		});

		var gorilla = new Primate( { id: 1, species: 'gorilla' } );

		equal( Backbone.Relational.store._collections.length, numCollections + 2 );
		ok( Backbone.Relational.store.find( Primate, 1 ) === gorilla );
	});

	QUnit.test( "Inheritance with `subModelTypes` uses the same collection as the model's super", function() {
		var Mammal = Animal.extend({
			subModelTypes: {
				'primate': 'Primate',
				'carnivore': 'Carnivore'
			}
		});

		window.Primate = Mammal.extend();
		window.Carnivore = Mammal.extend();

		var lion = new Carnivore( { id: 1, species: 'lion' } );
		var wolf = new Carnivore( { id: 2, species: 'wolf' } );

		var numCollections = Backbone.Relational.store._collections.length;

		var whale = new Mammal( { id: 3, species: 'whale' } );

		equal( Backbone.Relational.store._collections.length, numCollections, "`_collections` should have remained the same" );

		ok( Backbone.Relational.store.find( Mammal, 1 ) === lion );
		ok( Backbone.Relational.store.find( Mammal, 2 ) === wolf );
		ok( Backbone.Relational.store.find( Mammal, 3 ) === whale );
		ok( Backbone.Relational.store.find( Carnivore, 1 ) === lion );
		ok( Backbone.Relational.store.find( Carnivore, 2 ) === wolf );
		ok( Backbone.Relational.store.find( Carnivore, 3 ) !== whale );

		var gorilla = new Primate( { id: 4, species: 'gorilla' } );

		equal( Backbone.Relational.store._collections.length, numCollections, "`_collections` should have remained the same" );

		ok( Backbone.Relational.store.find( Animal, 4 ) !== gorilla );
		ok( Backbone.Relational.store.find( Mammal, 4 ) === gorilla );
		ok( Backbone.Relational.store.find( Primate, 4 ) === gorilla );

		delete window.Primate;
		delete window.Carnivore;
	});

	QUnit.test( "findOrCreate does not modify attributes hash if parse is used, prior to creating new model", function () {
		var model = Backbone.RelationalModel.extend({
			parse: function( response ) {
				response.id = response.id + 'something';
				return response;
			}
		});
		var attributes = {id: 42, foo: "bar"};
		var testAttributes = {id: 42, foo: "bar"};

		model.findOrCreate( attributes, { parse: true, merge: false, create: false } );

		ok( _.isEqual( attributes, testAttributes ), "attributes hash should not be modified" );
	});
