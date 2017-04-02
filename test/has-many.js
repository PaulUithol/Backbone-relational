import { reset } from './setup/setup';
import { store, Model, HasMany, HasOne, Collection, eventQueue } from 'backbone-relational';
import { Person, Job, Company, Zoo, Visitor, Animal, AnimalCollection } from './setup/objects';
import initObjects from './setup/data';
import $ from 'jquery';

let objects;

QUnit.module( "HasMany", { beforeEach() {
  reset();
  store.addModelScope({
    Person, Job, Company, Zoo, Visitor, Animal
  });
  objects = initObjects();
} });

	QUnit.test( "Listeners on 'add'/'remove'", function( assert ) {
		objects.ourHouse
			.on( 'add:occupants', function( model, coll ) {
					assert.ok( model === objects.person1, "model === objects.person1" );
				})
			.on( 'remove:occupants', function( model, coll ) {
					assert.ok( model === objects.person1, "model === objects.person1" );
				});

		objects.theirHouse
			.on( 'add:occupants', function( model, coll ) {
					assert.ok( model === objects.person1, "model === objects.person1" );
				})
			.on( 'remove:occupants', function( model, coll ) {
					assert.ok( model === objects.person1, "model === objects.person1" );
				});

		var count = 0;
		objects.person1.on( 'change:livesIn', function( model, attr ) {
			if ( count === 0 ) {
				assert.ok( attr === objects.ourHouse, "model === objects.ourHouse" );
			}
			else if ( count === 1 ) {
				assert.ok( attr === objects.theirHouse, "model === objects.theirHouse" );
			}
			else if ( count === 2 ) {
				assert.ok( attr === null, "model === null" );
			}

			count++;
		});

		objects.ourHouse.get( 'occupants' ).add( objects.person1 );
		objects.person1.set( { 'livesIn': objects.theirHouse } );
		objects.theirHouse.get( 'occupants' ).remove( objects.person1 );
	});

	QUnit.test( "Listeners for 'add'/'remove', on a HasMany relation, for a Model with multiple relations", function( assert ) {
		var job1 = { company: objects.oldCompany };
		var job2 = { company: objects.oldCompany, person: objects.person1 };
		var job3 = { person: objects.person1 };
		var newJob = null;

		objects.newCompany.on( 'add:employees', function( model, coll ) {
				assert.ok( false, "objects.person1 should only be added to 'objects.oldCompany'." );
			});

		// Assert that all relations on a Model are set up, before notifying related models.
		objects.oldCompany.on( 'add:employees', function( model, coll ) {
				newJob = model;

				assert.ok( model instanceof Job );
				assert.ok( model.get('company') instanceof Company && model.get('person') instanceof Person,
					"Both Person and Company are set on the Job instance" );
			});

		objects.person1.on( 'add:jobs', function( model, coll ) {
				assert.ok( model.get( 'company' ) === objects.oldCompany && model.get( 'person' ) === objects.person1,
					"Both Person and Company are set on the Job instance" );
			});

		// Add job1 and job2 to the 'Person' side of the relation
		var jobs = objects.person1.get( 'jobs' );

		jobs.add( job1 );
		assert.ok( jobs.length === 1, "jobs.length is 1" );

		newJob.destroy();
		assert.ok( jobs.length === 0, "jobs.length is 0" );

		jobs.add( job2 );
		assert.ok( jobs.length === 1, "jobs.length is 1" );

		newJob.destroy();
		assert.ok( jobs.length === 0, "jobs.length is 0" );

		// Add job1 and job2 to the 'Company' side of the relation
		var employees = objects.oldCompany.get('employees');

		employees.add( job3 );
		assert.ok( employees.length === 2, "employees.length is 2" );

		newJob.destroy();
		assert.ok( employees.length === 1, "employees.length is 1" );

		employees.add( job2 );
		assert.ok( employees.length === 2, "employees.length is 2" );

		newJob.destroy();
		assert.ok( employees.length === 1, "employees.length is 1" );

		// Create a stand-alone Job ;)
		new Job({
			person: objects.person1,
			company: objects.oldCompany
		});

		assert.ok( jobs.length === 1 && employees.length === 2, "jobs.length is 1 and employees.length is 2" );
	});

	QUnit.test( "The Collections used for HasMany relations are re-used if possible", function( assert ) {
		var collId = objects.ourHouse.get( 'occupants' ).id = 1;

		objects.ourHouse.get( 'occupants' ).add( objects.person1 );
		assert.ok( objects.ourHouse.get( 'occupants' ).id === collId );

		// Set a value on 'occupants' that would cause the relation to be reset.
		// The collection itself should be kept (along with it's properties)
		objects.ourHouse.set( { 'occupants': [ 'person-1' ] } );
		assert.ok( objects.ourHouse.get( 'occupants' ).id === collId );
		assert.ok( objects.ourHouse.get( 'occupants' ).length === 1 );

		// Setting a new collection loses the original collection
		objects.ourHouse.set( { 'occupants': new Collection() } );
		assert.ok( objects.ourHouse.get( 'occupants' ).id === undefined );
	});

	QUnit.test( "On `set`, or creation, accept a collection or an array of ids/objects/models", function( assert ) {
		// Handle an array of ids
		var visitor1 = new Visitor( { id: 'visitor-1', name: 'Mr. Pink' } ),
			visitor2 = new Visitor( { id: 'visitor-2' } );

		var zoo = new Zoo( { visitors: [ 'visitor-1', 'visitor-3' ] } ),
			visitors = zoo.get( 'visitors' );

		assert.equal( visitors.length, 1 );

		var visitor3 = new Visitor( { id: 'visitor-3' } );
		assert.equal( visitors.length, 2 );

		zoo.set( 'visitors', [ { name: 'Incognito' } ] );
		assert.equal( visitors.length, 1 );

		zoo.set( 'visitors', [] );
		assert.equal( visitors.length, 0 );

		// Handle an array of objects
		zoo = new Zoo( { visitors: [ { id: 'visitor-1' }, { id: 'visitor-4' } ] } );
		visitors = zoo.get( 'visitors' );

		assert.equal( visitors.length, 2 );
		assert.equal( visitors.get( 'visitor-1' ).get( 'name' ), 'Mr. Pink', 'visitor-1 is Mr. Pink' );

		zoo.set( 'visitors', [ { id: 'visitor-1' }, { id: 'visitor-5' } ] );
		assert.equal( visitors.length, 2 );

		// Handle an array of models
		zoo = new Zoo( { visitors: [ visitor1 ] } );
		visitors = zoo.get( 'visitors' );

		assert.equal( visitors.length, 1 );
		assert.ok( visitors.first() === visitor1 );

		zoo.set( 'visitors', [ visitor2 ] );
		assert.equal( visitors.length, 1 );
		assert.ok( visitors.first() === visitor2 );

		// Handle a Collection
		var visitorColl = new Collection( [ visitor1, visitor2 ] );
		zoo = new Zoo( { visitors: visitorColl } );
		visitors = zoo.get( 'visitors' );

		assert.equal( visitors.length, 2 );

		zoo.set( 'visitors', false );
		assert.equal( visitors.length, 0 );

		visitorColl = new Collection( [ visitor2 ] );
		zoo.set( 'visitors', visitorColl );
		assert.ok( visitorColl === zoo.get( 'visitors' ) );
		assert.equal( zoo.get( 'visitors' ).length, 1 );
	});

	QUnit.test( "On `set`, or creation, handle edge-cases where the server supplies a single object/id", function( assert ) {
		// Handle single objects
		var zoo = new Zoo({
			animals: { id: 'lion-1' }
		});
		var animals = zoo.get( 'animals' );

		assert.equal( animals.length, 1, "There is 1 animal in the zoo" );

		zoo.set( 'animals', { id: 'lion-2' } );
		assert.equal( animals.length, 1, "There is 1 animal in the zoo" );

		// Handle single models
		var lion3 = new Animal( { id: 'lion-3' } );
		zoo = new Zoo({
			animals: lion3
		});
		animals = zoo.get( 'animals' );

		assert.equal( animals.length, 1, "There is 1 animal in the zoo" );

		zoo.set( 'animals', null );
		assert.equal( animals.length, 0, "No animals in the zoo" );

		zoo.set( 'animals', lion3 );
		assert.equal( animals.length, 1, "There is 1 animal in the zoo" );

		// Handle single ids
		zoo = new Zoo({
			animals: 'lion-4'
		});
		animals = zoo.get( 'animals' );

		assert.equal( animals.length, 0, "No animals in the zoo" );

		var lion4 = new Animal( { id: 'lion-4' } );
		assert.equal( animals.length, 1, "There is 1 animal in the zoo" );

		zoo.set( 'animals', 'lion-5' );
		assert.equal( animals.length, 0, "No animals in the zoo" );

		var lion5 = new Animal( { id: 'lion-5' } );
		assert.equal( animals.length, 1, "There is 1 animal in the zoo" );

		zoo.set( 'animals', null );
		assert.equal( animals.length, 0, "No animals in the zoo" );


		zoo = new Zoo({
			animals: 'lion-4'
		});
		animals = zoo.get( 'animals' );

		assert.equal( animals.length, 1, "There is 1 animal in the zoo" );

		// Bulletproof?
		zoo = new Zoo({
			animals: ''
		});
		animals = zoo.get( 'animals' );

		assert.ok( animals instanceof AnimalCollection );
		assert.equal( animals.length, 0, "No animals in the zoo" );
	});

	QUnit.test( "Setting a custom collection in 'collectionType' uses that collection for instantiation", function( assert ) {
		var zoo = new Zoo();

		// Set values so that the relation gets filled
		zoo.set({
			animals: [
				{ species: 'Lion' },
				{ species: 'Zebra' }
			]
		});

		// Check that the animals were created
		assert.ok( zoo.get( 'animals' ).at( 0 ).get( 'species' ) === 'Lion' );
		assert.ok( zoo.get( 'animals' ).at( 1 ).get( 'species' ) === 'Zebra' );

		// Check that the generated collection is of the correct kind
		assert.ok( zoo.get( 'animals' ) instanceof AnimalCollection );
	});

	QUnit.test( "Setting a new collection maintains that collection's current 'models'", function( assert ) {
		var zoo = new Zoo();

		var animals = new AnimalCollection([
			{ id: 1, species: 'Lion' },
			{ id: 2 ,species: 'Zebra' }
		]);

		zoo.set( 'animals', animals );

		assert.equal( zoo.get( 'animals' ).length, 2 );

		var newAnimals = new AnimalCollection([
			{ id: 2, species: 'Zebra' },
			{ id: 3, species: 'Elephant' },
			{ id: 4, species: 'Tiger' }
		]);

		zoo.set( 'animals', newAnimals );

		assert.equal( zoo.get( 'animals' ).length, 3 );
	});

	QUnit.test( "Models found in 'findRelated' are all added in one go (so 'sort' will only be called once)", function( assert ) {
		var count = 0,
			sort = Collection.prototype.sort;

		Collection.prototype.sort = function() {
			count++;
		};

		AnimalCollection.prototype.comparator = $.noop;

		var zoo = new Zoo({
			animals: [
				{ id: 1, species: 'Lion' },
				{ id: 2 ,species: 'Zebra' }
			]
		});

		assert.equal( count, 1, "Sort is called only once" );

		Collection.prototype.sort = sort;
		delete AnimalCollection.prototype.comparator;
	});

	QUnit.test( "Raw-models set to a hasMany relation do trigger an add event in the underlying Collection with a correct index", function( assert ) {
		var zoo = new Zoo();

		var indexes = [];

		zoo.get( 'animals' ).on( 'add', function( model, collection, options ) {
			var index = collection.indexOf( model );
			indexes.push(index);
		});

		zoo.set( 'animals', [
				{ id : 1, species : 'Lion' },
				{ id : 2, species : 'Zebra' }
		]);

		assert.equal( indexes[0], 0, "First item has index 0" );
		assert.equal( indexes[1], 1, "Second item has index 1" );
	});

	QUnit.test( "Models set to a hasMany relation do trigger an add event in the underlying Collection with a correct index", function( assert ) {
		var zoo = new Zoo();

		var indexes = [];

		zoo.get("animals").on("add", function(model, collection, options) {
			var index = collection.indexOf(model);
			indexes.push(index);
		});

		zoo.set("animals", [
				new Animal({ id : 1, species : 'Lion' }),
				new Animal({ id : 2, species : 'Zebra'})
		]);

		assert.equal( indexes[0], 0, "First item has index 0" );
		assert.equal( indexes[1], 1, "Second item has index 1" );
	});

  QUnit.test( "Sort event should be fired after the add event that caused it, even when using 'set'", function( assert) {
    var zoo = new Zoo();
    var animals = zoo.get('animals');
    var events = [];

    animals.comparator = 'id';

    animals.on('add', function() { events.push('add'); });
    animals.on('sort', function() { events.push('sort'); });

    zoo.set('animals' , [
      {id : 'lion-2'},
      {id : 'lion-1'}
    ]);

    assert.equal(animals.at(0).id, 'lion-1');
    assert.deepEqual(events, ['add', 'add', 'sort']);
  });

	QUnit.test( "The 'collectionKey' options is used to create references on generated Collections back to its RelationalModel", function( assert ) {
		var zoo = new Zoo({
			animals: [ 'lion-1', 'zebra-1' ]
		});

		assert.equal( zoo.get( 'animals' ).livesIn, zoo );
		assert.equal( zoo.get( 'animals' ).zoo, undefined );


		var FarmAnimal = Model.extend();
		var Barn = Model.extend({
			relations: [{
					type: HasMany,
					key: 'animals',
					relatedModel: FarmAnimal,
					collectionKey: 'barn',
					reverseRelation: {
						key: 'livesIn',
						includeInJSON: 'id'
					}
				}]
		});
		var barn = new Barn({
			animals: [ 'chicken-1', 'cow-1' ]
		});

		assert.equal( barn.get( 'animals' ).livesIn, undefined );
		assert.equal( barn.get( 'animals' ).barn, barn );

		FarmAnimal = Model.extend();
		var BarnNoKey = Model.extend({
			relations: [{
					type: HasMany,
					key: 'animals',
					relatedModel: FarmAnimal,
					collectionKey: false,
					reverseRelation: {
						key: 'livesIn',
						includeInJSON: 'id'
					}
				}]
		});
		var barnNoKey = new BarnNoKey({
			animals: [ 'chicken-1', 'cow-1' ]
		});

		assert.equal( barnNoKey.get( 'animals' ).livesIn, undefined );
		assert.equal( barnNoKey.get( 'animals' ).barn, undefined );
	});

	QUnit.test( "Polymorhpic relations", function( assert ) {
		var Location = Model.extend();

		var Locatable = Model.extend({
			relations: [
				{
					key: 'locations',
					type: 'HasMany',
					relatedModel: Location,
					reverseRelation: {
						key: 'locatable'
					}
				}
			]
		});

		var FirstLocatable = Locatable.extend();
		var SecondLocatable = Locatable.extend();

		var firstLocatable = new FirstLocatable();
		var secondLocatable = new SecondLocatable();

		var firstLocation = new Location( { id: 1, locatable: firstLocatable } );
		var secondLocation = new Location( { id: 2, locatable: secondLocatable } );

		assert.ok( firstLocatable.get( 'locations' ).at( 0 ) === firstLocation );
		assert.ok( firstLocatable.get( 'locations' ).at( 0 ).get( 'locatable' ) === firstLocatable );

		assert.ok( secondLocatable.get( 'locations' ).at( 0 ) === secondLocation );
		assert.ok( secondLocatable.get( 'locations' ).at( 0 ).get( 'locatable' ) === secondLocatable );
	});

	QUnit.test( "Cloned instances of persisted models should not be added to any existing collections", function( assert ) {
		var addedModels = 0;

		var zoo = new Zoo({
			visitors : [ { name : "Incognito" } ]
		});

		var visitor = new Visitor();

		zoo.get( 'visitors' ).on( 'add', function( model, coll ) {
			addedModels++;
		});

		visitor.clone();

		assert.equal( addedModels, 0, "A new visitor should not be forced to go to the zoo!" );
	});
