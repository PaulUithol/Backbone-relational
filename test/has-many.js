QUnit.module( "Backbone.Relational.HasMany", { setup: require('./setup/data') } );

	QUnit.test( "Listeners on 'add'/'remove'", 7, function() {
		ourHouse
			.on( 'add:occupants', function( model, coll ) {
					ok( model === person1, "model === person1" );
				})
			.on( 'remove:occupants', function( model, coll ) {
					ok( model === person1, "model === person1" );
				});

		theirHouse
			.on( 'add:occupants', function( model, coll ) {
					ok( model === person1, "model === person1" );
				})
			.on( 'remove:occupants', function( model, coll ) {
					ok( model === person1, "model === person1" );
				});

		var count = 0;
		person1.on( 'change:livesIn', function( model, attr ) {
			if ( count === 0 ) {
				ok( attr === ourHouse, "model === ourHouse" );
			}
			else if ( count === 1 ) {
				ok( attr === theirHouse, "model === theirHouse" );
			}
			else if ( count === 2 ) {
				ok( attr === null, "model === null" );
			}

			count++;
		});

		ourHouse.get( 'occupants' ).add( person1 );
		person1.set( { 'livesIn': theirHouse } );
		theirHouse.get( 'occupants' ).remove( person1 );
	});

	QUnit.test( "Listeners for 'add'/'remove', on a HasMany relation, for a Model with multiple relations", function() {
		var job1 = { company: oldCompany };
		var job2 = { company: oldCompany, person: person1 };
		var job3 = { person: person1 };
		var newJob = null;

		newCompany.on( 'add:employees', function( model, coll ) {
				ok( false, "person1 should only be added to 'oldCompany'." );
			});

		// Assert that all relations on a Model are set up, before notifying related models.
		oldCompany.on( 'add:employees', function( model, coll ) {
				newJob = model;

				ok( model instanceof Job );
				ok( model.get('company') instanceof Company && model.get('person') instanceof Person,
					"Both Person and Company are set on the Job instance" );
			});

		person1.on( 'add:jobs', function( model, coll ) {
				ok( model.get( 'company' ) === oldCompany && model.get( 'person' ) === person1,
					"Both Person and Company are set on the Job instance" );
			});

		// Add job1 and job2 to the 'Person' side of the relation
		var jobs = person1.get( 'jobs' );

		jobs.add( job1 );
		ok( jobs.length === 1, "jobs.length is 1" );

		newJob.destroy();
		ok( jobs.length === 0, "jobs.length is 0" );

		jobs.add( job2 );
		ok( jobs.length === 1, "jobs.length is 1" );

		newJob.destroy();
		ok( jobs.length === 0, "jobs.length is 0" );

		// Add job1 and job2 to the 'Company' side of the relation
		var employees = oldCompany.get('employees');

		employees.add( job3 );
		ok( employees.length === 2, "employees.length is 2" );

		newJob.destroy();
		ok( employees.length === 1, "employees.length is 1" );

		employees.add( job2 );
		ok( employees.length === 2, "employees.length is 2" );

		newJob.destroy();
		ok( employees.length === 1, "employees.length is 1" );

		// Create a stand-alone Job ;)
		new Job({
			person: person1,
			company: oldCompany
		});

		ok( jobs.length === 1 && employees.length === 2, "jobs.length is 1 and employees.length is 2" );
	});

	QUnit.test( "The Collections used for HasMany relations are re-used if possible", function() {
		var collId = ourHouse.get( 'occupants' ).id = 1;

		ourHouse.get( 'occupants' ).add( person1 );
		ok( ourHouse.get( 'occupants' ).id === collId );

		// Set a value on 'occupants' that would cause the relation to be reset.
		// The collection itself should be kept (along with it's properties)
		ourHouse.set( { 'occupants': [ 'person-1' ] } );
		ok( ourHouse.get( 'occupants' ).id === collId );
		ok( ourHouse.get( 'occupants' ).length === 1 );

		// Setting a new collection loses the original collection
		ourHouse.set( { 'occupants': new Backbone.Relational.Collection() } );
		ok( ourHouse.get( 'occupants' ).id === undefined );
	});


	QUnit.test( "On `set`, or creation, accept a collection or an array of ids/objects/models", function() {
		// Handle an array of ids
		var visitor1 = new Visitor( { id: 'visitor-1', name: 'Mr. Pink' } ),
			visitor2 = new Visitor( { id: 'visitor-2' } );

		var zoo = new Zoo( { visitors: [ 'visitor-1', 'visitor-3' ] } ),
			visitors = zoo.get( 'visitors' );

		equal( visitors.length, 1 );

		var visitor3 = new Visitor( { id: 'visitor-3' } );
		equal( visitors.length, 2 );

		zoo.set( 'visitors', [ { name: 'Incognito' } ] );
		equal( visitors.length, 1 );

		zoo.set( 'visitors', [] );
		equal( visitors.length, 0 );

		// Handle an array of objects
		zoo = new Zoo( { visitors: [ { id: 'visitor-1' }, { id: 'visitor-4' } ] } );
		visitors = zoo.get( 'visitors' );

		equal( visitors.length, 2 );
		equal( visitors.get( 'visitor-1' ).get( 'name' ), 'Mr. Pink', 'visitor-1 is Mr. Pink' );

		zoo.set( 'visitors', [ { id: 'visitor-1' }, { id: 'visitor-5' } ] );
		equal( visitors.length, 2 );

		// Handle an array of models
		zoo = new Zoo( { visitors: [ visitor1 ] } );
		visitors = zoo.get( 'visitors' );

		equal( visitors.length, 1 );
		ok( visitors.first() === visitor1 );

		zoo.set( 'visitors', [ visitor2 ] );
		equal( visitors.length, 1 );
		ok( visitors.first() === visitor2 );

		// Handle a Collection
		var visitorColl = new Backbone.Relational.Collection( [ visitor1, visitor2 ] );
		zoo = new Zoo( { visitors: visitorColl } );
		visitors = zoo.get( 'visitors' );

		equal( visitors.length, 2 );

		zoo.set( 'visitors', false );
		equal( visitors.length, 0 );

		visitorColl = new Backbone.Relational.Collection( [ visitor2 ] );
		zoo.set( 'visitors', visitorColl );
		ok( visitorColl === zoo.get( 'visitors' ) );
		equal( zoo.get( 'visitors' ).length, 1 );
	});

	QUnit.test( "On `set`, or creation, handle edge-cases where the server supplies a single object/id", function() {
		// Handle single objects
		var zoo = new Zoo({
			animals: { id: 'lion-1' }
		});
		var animals = zoo.get( 'animals' );

		equal( animals.length, 1, "There is 1 animal in the zoo" );

		zoo.set( 'animals', { id: 'lion-2' } );
		equal( animals.length, 1, "There is 1 animal in the zoo" );

		// Handle single models
		var lion3 = new Animal( { id: 'lion-3' } );
		zoo = new Zoo({
			animals: lion3
		});
		animals = zoo.get( 'animals' );

		equal( animals.length, 1, "There is 1 animal in the zoo" );

		zoo.set( 'animals', null );
		equal( animals.length, 0, "No animals in the zoo" );

		zoo.set( 'animals', lion3 );
		equal( animals.length, 1, "There is 1 animal in the zoo" );

		// Handle single ids
		zoo = new Zoo({
			animals: 'lion-4'
		});
		animals = zoo.get( 'animals' );

		equal( animals.length, 0, "No animals in the zoo" );

		var lion4 = new Animal( { id: 'lion-4' } );
		equal( animals.length, 1, "There is 1 animal in the zoo" );

		zoo.set( 'animals', 'lion-5' );
		equal( animals.length, 0, "No animals in the zoo" );

		var lion5 = new Animal( { id: 'lion-5' } );
		equal( animals.length, 1, "There is 1 animal in the zoo" );

		zoo.set( 'animals', null );
		equal( animals.length, 0, "No animals in the zoo" );


		zoo = new Zoo({
			animals: 'lion-4'
		});
		animals = zoo.get( 'animals' );

		equal( animals.length, 1, "There is 1 animal in the zoo" );

		// Bulletproof?
		zoo = new Zoo({
			animals: ''
		});
		animals = zoo.get( 'animals' );

		ok( animals instanceof AnimalCollection );
		equal( animals.length, 0, "No animals in the zoo" );
	});

	QUnit.test( "Setting a custom collection in 'collectionType' uses that collection for instantiation", function() {
		var zoo = new Zoo();

		// Set values so that the relation gets filled
		zoo.set({
			animals: [
				{ species: 'Lion' },
				{ species: 'Zebra' }
			]
		});

		// Check that the animals were created
		ok( zoo.get( 'animals' ).at( 0 ).get( 'species' ) === 'Lion' );
		ok( zoo.get( 'animals' ).at( 1 ).get( 'species' ) === 'Zebra' );

		// Check that the generated collection is of the correct kind
		ok( zoo.get( 'animals' ) instanceof AnimalCollection );
	});

	QUnit.test( "Setting a new collection maintains that collection's current 'models'", function() {
		var zoo = new Zoo();

		var animals = new AnimalCollection([
			{ id: 1, species: 'Lion' },
			{ id: 2 ,species: 'Zebra' }
		]);

		zoo.set( 'animals', animals );

		equal( zoo.get( 'animals' ).length, 2 );

		var newAnimals = new AnimalCollection([
			{ id: 2, species: 'Zebra' },
			{ id: 3, species: 'Elephant' },
			{ id: 4, species: 'Tiger' }
		]);

		zoo.set( 'animals', newAnimals );

		equal( zoo.get( 'animals' ).length, 3 );
	});

	QUnit.test( "Models found in 'findRelated' are all added in one go (so 'sort' will only be called once)", function() {
		var count = 0,
			sort = Backbone.Relational.Collection.prototype.sort;

		Backbone.Relational.Collection.prototype.sort = function() {
			count++;
		};

		AnimalCollection.prototype.comparator = $.noop;

		var zoo = new Zoo({
			animals: [
				{ id: 1, species: 'Lion' },
				{ id: 2 ,species: 'Zebra' }
			]
		});

		equal( count, 1, "Sort is called only once" );

		Backbone.Relational.Collection.prototype.sort = sort;
		delete AnimalCollection.prototype.comparator;
	});

	QUnit.test( "Raw-models set to a hasMany relation do trigger an add event in the underlying Collection with a correct index", function() {
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

		equal( indexes[0], 0, "First item has index 0" );
		equal( indexes[1], 1, "Second item has index 1" );
	});

	QUnit.test( "Models set to a hasMany relation do trigger an add event in the underlying Collection with a correct index", function() {
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

		equal( indexes[0], 0, "First item has index 0" );
		equal( indexes[1], 1, "Second item has index 1" );
	});


    QUnit.test( "Sort event should be fired after the add event that caused it, even when using 'set'", function() {
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

        equal(animals.at(0).id, 'lion-1');
        deepEqual(events, ['add', 'add', 'sort']);
    });


	QUnit.test( "The 'collectionKey' options is used to create references on generated Collections back to its RelationalModel", function() {
		var zoo = new Zoo({
			animals: [ 'lion-1', 'zebra-1' ]
		});

		equal( zoo.get( 'animals' ).livesIn, zoo );
		equal( zoo.get( 'animals' ).zoo, undefined );


		var FarmAnimal = Backbone.Relational.Model.extend();
		var Barn = Backbone.Relational.Model.extend({
			relations: [{
					type: Backbone.Relational.HasMany,
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

		equal( barn.get( 'animals' ).livesIn, undefined );
		equal( barn.get( 'animals' ).barn, barn );

		FarmAnimal = Backbone.Relational.Model.extend();
		var BarnNoKey = Backbone.Relational.Model.extend({
			relations: [{
					type: Backbone.Relational.HasMany,
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

		equal( barnNoKey.get( 'animals' ).livesIn, undefined );
		equal( barnNoKey.get( 'animals' ).barn, undefined );
	});

	QUnit.test( "Polymorhpic relations", function() {
		var Location = Backbone.Relational.Model.extend();

		var Locatable = Backbone.Relational.Model.extend({
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

		ok( firstLocatable.get( 'locations' ).at( 0 ) === firstLocation );
		ok( firstLocatable.get( 'locations' ).at( 0 ).get( 'locatable' ) === firstLocatable );

		ok( secondLocatable.get( 'locations' ).at( 0 ) === secondLocation );
		ok( secondLocatable.get( 'locations' ).at( 0 ).get( 'locatable' ) === secondLocatable );
	});

	QUnit.test( "Cloned instances of persisted models should not be added to any existing collections", function() {
		var addedModels = 0;

		var zoo = new window.Zoo({
			visitors : [ { name : "Incognito" } ]
		});

		var visitor = new window.Visitor();

		zoo.get( 'visitors' ).on( 'add', function( model, coll ) {
			addedModels++;
		});

		visitor.clone();

		equal( addedModels, 0, "A new visitor should not be forced to go to the zoo!" );
	});
