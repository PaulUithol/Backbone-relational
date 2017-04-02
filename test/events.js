import { reset } from './setup/setup';
import { store } from 'backbone-relational';
import { Zoo, Animal, AnimalCollection, House, Person } from './setup/objects';
import initObjects from './setup/data';

let objects;

QUnit.module( "Events", { beforeEach() {
  reset();
  store.addModelScope({
    Zoo, Animal, House, Person
  });
  objects = initObjects();
} });

	QUnit.test( "`add:`, `remove:` and `change:` events", function( assert ) {
		var zoo = new Zoo(),
			animal = new Animal();

		var addAnimalEventsTriggered = 0,
			removeAnimalEventsTriggered = 0,
			changeEventsTriggered = 0,
			changeLiveInEventsTriggered = 0;

		zoo.on( 'add:animals', function( model, coll ) {
				//console.log( 'add:animals; args=%o', arguments );
				addAnimalEventsTriggered++;
			})
			.on( 'remove:animals', function( model, coll ) {
				//console.log( 'remove:animals; args=%o', arguments );
				removeAnimalEventsTriggered++;
			});

		animal
			.on( 'change', function( model, coll ) {
				// console.log( 'change; args=%o', arguments );
				changeEventsTriggered++;
			})
			.on( 'change:livesIn', function( model, coll ) {
				//console.log( 'change:livesIn; args=%o', arguments );
				changeLiveInEventsTriggered++;
			});

		// Directly triggering an event on a model should always fire
		addAnimalEventsTriggered = removeAnimalEventsTriggered = changeEventsTriggered = changeLiveInEventsTriggered = 0;

		animal.trigger( 'change', this.model );
		assert.ok( changeEventsTriggered === 1 );
		assert.ok( changeLiveInEventsTriggered === 0 );

		addAnimalEventsTriggered = removeAnimalEventsTriggered = changeEventsTriggered = changeLiveInEventsTriggered = 0;

		// Should trigger `change:livesIn` and `add:animals`
		animal.set( 'livesIn', zoo );

		zoo.set( 'id', 'z1' );
		animal.set( 'id', 'a1' );

		assert.ok( addAnimalEventsTriggered === 1 );
		assert.ok( removeAnimalEventsTriggered === 0 );
		assert.ok( changeEventsTriggered === 2 );
		assert.ok( changeLiveInEventsTriggered === 1 );
		// console.log( changeEventsTriggered );

		// Doing this shouldn't trigger any `add`/`remove`/`update` events
		zoo.set( 'animals', [ 'a1' ] );

		assert.ok( addAnimalEventsTriggered === 1 );
		assert.ok( removeAnimalEventsTriggered === 0 );
		assert.ok( changeEventsTriggered === 2 );
		assert.ok( changeLiveInEventsTriggered === 1 );

		// Doesn't cause an actual state change
		animal.set( 'livesIn', 'z1' );

		assert.ok( addAnimalEventsTriggered === 1 );
		assert.ok( removeAnimalEventsTriggered === 0 );
		assert.ok( changeEventsTriggered === 2 );
		assert.ok( changeLiveInEventsTriggered === 1 );

		// Should trigger a `remove` on zoo and an `update` on animal
		animal.set( 'livesIn', { id: 'z2' } );

		assert.ok( addAnimalEventsTriggered === 1 );
		assert.ok( removeAnimalEventsTriggered === 1 );
		assert.ok( changeEventsTriggered === 3 );
		assert.ok( changeLiveInEventsTriggered === 2 );
	});

	QUnit.test( "`reset` events", function( assert ) {
		var initialize = AnimalCollection.prototype.initialize;
		var resetEvents = 0,
			addEvents = 0,
			removeEvents = 0;

		AnimalCollection.prototype.initialize = function() {
			this
				.on( 'add', function() {
					addEvents++;
				})
				.on( 'reset', function() {
					resetEvents++;
				})
				.on( 'remove', function() {
					removeEvents++;
				});
		};

		var zoo = new Zoo();

		// No events triggered when initializing a HasMany
		assert.ok( zoo.get( 'animals' ) instanceof AnimalCollection );
		assert.ok( resetEvents === 0, "No `reset` event fired" );
		assert.ok( addEvents === 0 );
		assert.ok( removeEvents === 0 );

		zoo.set( 'animals', { id: 1 } );

		assert.ok( addEvents === 1 );
		assert.ok( zoo.get( 'animals' ).length === 1, "animals.length === 1" );

		zoo.get( 'animals' ).reset();

		assert.ok( resetEvents === 1, "`reset` event fired" );
		assert.ok( zoo.get( 'animals' ).length === 0, "animals.length === 0" );

		AnimalCollection.prototype.initialize = initialize;
	});

	QUnit.test( "Firing of `change` and `change:<key>` events", function( assert ) {
		var data = {
			id: 1,
			animals: []
		};

		var zoo = new Zoo( data );

		var change = 0;
		zoo.on( 'change', function() {
			change++;
		});

		var changeAnimals = 0;
		zoo.on( 'change:animals', function() {
			changeAnimals++;
		});

		var animalChange = 0;
		zoo.get( 'animals' ).on( 'change', function() {
			animalChange++;
		});

		// Set the same data
		zoo.set( data );

		assert.ok( change === 0, 'no change event should fire' );
		assert.ok( changeAnimals === 0, 'no change:animals event should fire' );
		assert.ok( animalChange === 0, 'no animals:change event should fire' );

		// Add an `animal`
		change = changeAnimals = animalChange = 0;
		zoo.set( { animals: [ { id: 'a1' } ] } );

		assert.ok( change === 1, 'change event should fire' );
		assert.ok( changeAnimals === 1, 'change:animals event should fire' );
		assert.ok( animalChange === 1, 'animals:change event should fire' );

		// Change an animal
		change = changeAnimals = animalChange = 0;
		zoo.set( { animals: [ { id: 'a1', name: 'a1' } ] } );

		assert.ok( change === 0, 'no change event should fire' );
		assert.ok( changeAnimals === 0, 'no change:animals event should fire' );
		assert.ok( animalChange === 1, 'animals:change event should fire' );

		// Only change the `zoo` itself
		change = changeAnimals = animalChange = 0;
		zoo.set( { name: 'Artis' } );

		assert.ok( change === 1, 'change event should fire' );
		assert.ok( changeAnimals === 0, 'no change:animals event should fire' );
		assert.ok( animalChange === 0, 'no animals:change event should fire' );

		// Replace an `animal`
		change = changeAnimals = animalChange = 0;
		zoo.set( { animals: [ { id: 'a2' } ] } );

		assert.ok( change === 1, 'change event should fire' );
		assert.ok( changeAnimals === 1, 'change:animals event should fire' );
		assert.ok( animalChange === 1, 'animals:change event should fire' );

		// Remove an `animal`
		change = changeAnimals = animalChange = 0;
		zoo.set( { animals: [] } );

		assert.ok( change === 1, 'change event should fire' );
		assert.ok( changeAnimals === 1, 'change:animals event should fire' );
		assert.ok( animalChange === 0, 'no animals:change event should fire' );

		// Operate directly on the HasMany collection
		var animals = zoo.get( 'animals' ),
			a1 = Animal.findOrCreate( 'a1', { create: false } ),
			a2 = Animal.findOrCreate( 'a2', { create: false } );

		assert.ok( a1 instanceof Animal );
		assert.ok( a2 instanceof Animal );

		// Add an animal
		change = changeAnimals = animalChange = 0;
		animals.add( 'a2' );

		assert.ok( change === 0, 'change event not should fire' );
		assert.ok( changeAnimals === 0, 'no change:animals event should fire' );
		assert.ok( animalChange === 0, 'no animals:change event should fire' );

		// Update an animal directly
		change = changeAnimals = animalChange = 0;
		a2.set( 'name', 'a2' );

		assert.ok( change === 0, 'no change event should fire' );
		assert.ok( changeAnimals === 0, 'no change:animals event should fire' );
		assert.ok( animalChange === 1, 'animals:change event should fire' );

		// Remove an animal directly
		change = changeAnimals = animalChange = 0;
		animals.remove( 'a2' );

		assert.ok( change === 0, 'no change event should fire' );
		assert.ok( changeAnimals === 0, 'no change:animals event should fire' );
		assert.ok( animalChange === 0, 'no animals:change event should fire' );
	});

	QUnit.test( "Does not trigger add / remove events for existing models on bulk assignment", function( assert ) {
		var house = new House({
			id: 'house-100',
			location: 'in the middle of the street',
			occupants: [ { id : 'person-5', jobs: [ { id : 'job-22' } ] }, { id : 'person-6' } ]
		});

		var eventsTriggered = 0;

		house
			.on( 'add:occupants', function(model) {
				assert.ok( false, model.id + " should not be added" );
				eventsTriggered++;
			})
			.on( 'remove:occupants', function(model) {
				assert.ok( false, model.id + " should not be removed" );
				eventsTriggered++;
			});

		house.get( 'occupants' ).at( 0 ).on( 'add:jobs', function( model ) {
			assert.ok( false, model.id + " should not be added" );
			eventsTriggered++;
		});

		house.set( house.toJSON() );

		assert.ok( eventsTriggered === 0, "No add / remove events were triggered" );
	});

	QUnit.test( "triggers appropriate add / remove / change events on bulk assignment", function( assert ) {
		var house = new House({
			id: 'house-100',
			location: 'in the middle of the street',
			occupants: [ { id : 'person-5', nickname : 'Jane' }, { id : 'person-6' }, { id : 'person-8', nickname : 'Jon' } ]
		});

		var addEventsTriggered = 0,
			removeEventsTriggered = 0,
			changeEventsTriggered = 0;

		house.on( 'add:occupants', function( model ) {
				assert.ok( model.id === 'person-7', "Only person-7 should be added: " + model.id + " being added" );
				addEventsTriggered++;
			})
			.on( 'remove:occupants', function( model ) {
				assert.ok( model.id === 'person-6', "Only person-6 should be removed: " + model.id + " being removed" );
				removeEventsTriggered++;
			});

		house.get( 'occupants' ).on( 'change:nickname', function( model ) {
			assert.ok( model.id === 'person-8', "Only person-8 should have it's nickname updated: " + model.id + " nickname updated" );
			changeEventsTriggered++;
		});

		house.set( { occupants : [ { id : 'person-5', nickname : 'Jane'}, { id : 'person-7' }, { id : 'person-8', nickname : 'Phil' } ] } );

		assert.ok( addEventsTriggered === 1, "Exactly one add event was triggered (triggered " + addEventsTriggered + " events)" );
		assert.ok( removeEventsTriggered === 1, "Exactly one remove event was triggered (triggered " + removeEventsTriggered + " events)" );
		assert.ok( changeEventsTriggered === 1, "Exactly one change event was triggered (triggered " + changeEventsTriggered + " events)" );
	});

	QUnit.test( "triggers appropriate change events even when callbacks have triggered set with an unchanging value", function( assert ) {
		var house = new House({
			id: 'house-100',
			location: 'in the middle of the street'
		});

		var changeEventsTriggered = 0;

		house
			.on('change:location', function() {
				house.set({location: 'somewhere else'});
			})
			.on( 'change', function () {
				changeEventsTriggered++;
			});

		house.set( { location: 'somewhere else' } );

		assert.ok( changeEventsTriggered === 1, 'one change triggered for `house`' );

		var person = new Person({
			id: 1
		});

		changeEventsTriggered = 0;

		person
			.on('change:livesIn', function() {
				//console.log( arguments );
				house.set({livesIn: house});
			})
			.on( 'change', function () {
				//console.log( arguments );
				changeEventsTriggered++;
			});

		person.set({livesIn: house});

		assert.ok( changeEventsTriggered === 2, 'one change each triggered for `house` and `person`' );
	});
