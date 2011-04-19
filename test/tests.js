// documentation on writing tests here: http://docs.jquery.com/QUnit
// example tests: https://github.com/jquery/qunit/blob/master/test/same.js
// more examples: https://github.com/jquery/jquery/tree/master/test/unit
// jQueryUI examples: https://github.com/jquery/jquery-ui/tree/master/tests/unit

//sessionStorage.clear();
if ( !window.console ) {
	var names = ['log', 'debug', 'info', 'warn', 'error', 'assert', 'dir', 'dirxml',
	'group', 'groupEnd', 'time', 'timeEnd', 'count', 'trace', 'profile', 'profileEnd'];
	window.console = {};
	for ( var i = 0; i < names.length; ++i )
		window.console[ names[i] ] = function() {};
}

$(document).ready(function() {
	// Stub out Backbone.request...
	Backbone.sync = function() {
		// Variable to catch the last request.
		window.lastRequest = _.toArray(arguments);
	};
	
	
	House = Backbone.RelationalModel.extend({
		relations: [{
				type: Backbone.HasMany,
				key: 'occupants',
				relatedModel: 'Person',
				reverseRelation: {
					key: 'livesIn'
				}
			}]
	});
	
	User = Backbone.RelationalModel.extend({});
	
	Person = Backbone.RelationalModel.extend({
		relations: [{
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
				relatedModel: 'User',
				includeInJSON: false,
				reverseRelation: {
					type: Backbone.HasOne,
					key: 'person'
				}
			},
			{
				type: 'HasMany',
				key: 'jobs',
				relatedModel: 'Tenure',
				reverseRelation: {
					key: 'person'
				}
			}
		]
	});
	
	// A link table between 'Person' and 'Company', to achieve many-to-many relations
	Tenure = Backbone.RelationalModel.extend({
		defaults: {
			'startDate': null,
			'endDate': null
		}
	})
	
	Company = Backbone.RelationalModel.extend({
		relations: [{
				type: 'HasMany',
				key: 'employees',
				relatedModel: 'Tenure',
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
		]
	});
	
	function initObjects() {
		// save _reverseRelations, otherwise we'll get a lot of warnings about existing relations
		var oldReverseRelations = Backbone.store._reverseRelations;
		Backbone.store = new Backbone.Store();
		Backbone.store._reverseRelations = oldReverseRelations;
		
		person1 = new Person({
			id: 'person-1',
			name: 'boy',
			likesALot: 'person-2',
			resource_uri: 'person-1',
			user: { id: 'user-1', login: 'dude', email: 'me@gmail.com', resource_uri: 'user-1' }
		});
		
		person2 = new Person({
			id: 'person-2',
			name: 'girl',
			likesALot: 'person-1',
			resource_uri: 'person-2'
		});
		
		person3 = new Person({
			id: 'person-3',
			resource_uri: 'person-3'
		});
		
		oldCompany = new Company({
			id: 'company-1',
			name: 'Big Corp.',
			ceo: {
				name: 'Big Boy'
			},
			employees: [ { person: 'person-3' } ], // uses the 'Tenure' link table to achieve many-to-many. No 'id' specified!
			resource_uri: 'company-1'
		});
		
		newCompany = new Company({
			id: 'company-2',
			name: 'New Corp.',
			employees: [ { person: 'person-2' } ],
			resource_uri: 'company-2'
		});
		
		ourHouse = new House({
			id: 'house-1',
			location: 'in the middle of the street',
			occupants: ['person-2'],
			resource_uri: 'house-1'
		});
		
		theirHouse = new House({
			id: 'house-2',
			location: 'outside of town',
			occupants: [],
			resource_uri: 'house-2'
		});
	}
	
	//console.debug( 'ourHouse=%o, person1=%o, person2=%o, cat1=%o, cat2=%o', ourHouse, person1, person2, cat1, cat2 );

	
	module("Backbone.Store", { setup: initObjects } );
	
	
		test("Initialized", function() {
			equal( Backbone.store._collections.length, 5, "Store contains 5 collections" );
		});
		
		test("getObjectByName", function() {
			equal( Backbone.store.getObjectByName( 'Backbone' ), Backbone );
			equal( Backbone.store.getObjectByName( 'Backbone.RelationalModel' ), Backbone.RelationalModel );
		});
		
		test("Add and removes from store", function() {
			var coll = Backbone.store.getCollection( person1 );
			var length = coll.length;
			
			var person = new Person({
				id: 'person-10',
				name: 'Remi',
				resource_uri: 'person-10'
			});
			
			ok( coll.length === length + 1, "Collection size increased by 1" );
			
			person.destroy();
			
			ok( coll.length === length, "Collection size decreased by 1" );
		});
		
		test("Models are created from objects, can then be found, destroyed, cannot be found anymore", function() {
			var houseId = 'house-10'
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
			
			var person = Backbone.store.find( Person, personId );
			
			ok( person, "Person with id=" + personId + " is found in the store" );
			
			person.destroy();
			person = Backbone.store.find( Person, personId );
			
			ok( !person, personId + " is not found in the store anymore" );
			ok( !anotherHouse.get('occupants').get( personId ), "Occupants no longer contains the Person with id='" + personId + "'" );
			
			anotherHouse.destroy();
			
			var house = Backbone.store.find( House, houseId );
			
			ok( !house, houseId + " is not found in the store anymore" );
		});
		
		
	module("Backbone.RelationalModel", { setup: initObjects } );
	
	
		test("IncludeInJSON: Person to JSON", function() {
			var json = person1.toJSON();
			console.debug( json );
			
			ok( _.isString( json.user ), "No User object (includeInJSON=false for those)" );
			equal(  json.likesALot.likesALot, 'person-1', "Person is serialized only once" );
		});
		
		test("Return values: set and destroy return the Model", function() {
			var personId = 'person-10';
			var person = new Person({
				id: personId,
				name: 'Remi',
				resource_uri: personId
			});
			
			var result = person.set( { 'name': 'Hector Malot' } );
			
			ok( result === person, "Set returns the model" );
			
			result = person.destroy();
			
			ok( result === person, "Destroy returns the model" );
		});
		
		
	module("Backbone.HasOne", { setup: initObjects } );
		
		
		test("Persons are set up properly", function() {
			ok( person1.get('likesALot') === person2 );
			ok( person2.get('likesALot') === person1 );
		});
		
		test("Listeners for 'update', on a HasOne relation, for a Model with multiple relations", function() {
			expect( 1 );
			Password = Backbone.RelationalModel.extend({
				relations: [{
					type: Backbone.HasOne,
					key: 'user',
					relatedModel: 'User',
					reverseRelation: {
						type: Backbone.HasOne,
						key: 'password',
					}
				}]
			});
			password = new Password(); // trigger initialization of relations for Password
			
			person1.bind('update:user', function( model, attr, options ) {
				ok( attr.get('person') === person1 && attr.get('password') instanceof Password, "" );
			});
			
			var user = { login: 'me@hotmail.com', password: { plaintext: 'qwerty' } };
			person1.set( { user: user } );
		});
		
		
	module("Backbone.HasMany", { setup: initObjects } );
		
		
		test("Listeners on 'add'/'remove'", function() {
			expect( 7 );
			
			ourHouse
				.bind( 'add:occupants', function( model, coll ) {
						ok( model === person1, "model === person1" );
					})
				.bind( 'remove:occupants', function( model, coll ) {
						ok( model === person1, "model === person1" );
					});
			
			theirHouse
				.bind( 'add:occupants', function( model, coll ) {
						ok( model === person1, "model === person1" );
					})
				.bind( 'remove:occupants', function( model, coll ) {
						ok( model === person1, "model === person1" );
					});
			
			var count = 0;
			person1.bind( 'update:livesIn', function( model, attr ) {
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
			
			ourHouse.get('occupants').add( person1 );
			person1.set( { 'livesIn': theirHouse } );
			theirHouse.get('occupants').remove( person1 );
		});
		
		// All relations should be set up on a Model, before notifying related models.
		test("Listeners for 'add'/'remove', on a HasMany relation, for a Model with multiple relations", function() {
			expect( 24 );
			var job1 = { company: oldCompany };
			var job2 = { company: oldCompany, person: person1 };
			var job3 = { person: person1 };
			var newJob = null;
			
			newCompany.bind( 'add:employees', function( model, coll ) {
					ok( false, "person1 should only be added to 'oldCompany'." );
				});
			
			oldCompany.bind( 'add:employees', function( model, coll ) {
					newJob = model;
					
					ok( model instanceof Tenure );
					ok( model.get('company') instanceof Company && model.get('person') instanceof Person,
						"Both Person and Company are set on the Tenure instance" );
				});
			
			person1.bind( 'add:jobs', function( model, coll ) {
					ok( model.get('company') === oldCompany && model.get('person') === person1,
						"Both Person and Company are set on the Tenure instance" );
				});
			
			// Add job1 and job2 to the 'Person' side of the relation
			var jobs = person1.get('jobs');
			
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
			
			// Create a stand-alone Tenure ;)
			new Tenure({
				person: person1,
				company: oldCompany
			});
			
			ok( jobs.length === 1 && employees.length === 2, "jobs.length is 1 and employees.length is 2" );
		});
		
		test("Precondition: HasMany with a reverseRelation HasMany is not allowed", function() {
			Password = Backbone.RelationalModel.extend({
				relations: [{
					type: 'HasMany',
					key: 'users',
					relatedModel: 'User',
					reverseRelation: {
						type: 'HasMany',
						key: 'passwords',
						relatedModel: 'User'
					}
				}]
			});
			
			var password = new Password({
				plaintext: 'qwerty',
				users: ['person-1', 'person-2', 'person-3' ]
			});
			
			ok( password._relations.length === 0, "No _relations created on Password" );
		});
		
		
	module("Reverse relationships", { setup: initObjects } );
	
		
		test("Add", function() {
			equal( ourHouse.get('occupants').length, 1, "ourHouse has 1 occupant" );
			equal( person1.get('livesIn'), null, "Person 1 doesn't live anywhere" );
			
			ourHouse.get('occupants').add( person1 );
			
			equal( ourHouse.get('occupants').length, 2, "Our House has 2 occupants" );
			equal( person1.get('livesIn') && person1.get('livesIn').id, ourHouse.id, "Person 1 lives in ourHouse" );
			
			person1.set( { 'livesIn': theirHouse } );
			
			equal( theirHouse.get('occupants').length, 1, "theirHouse has 1 occupant" );
			equal( ourHouse.get('occupants').length, 1, "ourHouse has 1 occupant" );
			equal( person1.get('livesIn') && person1.get('livesIn').id, theirHouse.id, "Person 1 lives in theirHouse" );
		});
		
		test("New objects (no 'id' yet)", function() {
			var person = new Person({
				name: 'Remi'
			});
			
			person.set( { user: { login: '1', email: '1' } } );
			var user1 = person.get('user');
			
			ok( user1 instanceof User, "User created on Person" );
			equal( user1.get('login'), '1', "person.user is the correct User" );
			
			var user2 = new User({
				login: '2',
				email: '2'
			});
			
			ok( user2.get('person') === null, "'user' doesn't belong to a 'person' yet" );
			
			person.set( { user: user2 } );
			
			ok( user1.get('person') === null );
			ok( person.get('user') === user2 );
			ok( user2.get('person') === person );
			
			person2.set( { user: user2 } );
			
			ok( person.get('user') === null );
			ok( person2.get('user') === user2 );
			ok( user2.get('person') === person2 );
		});
		
		test("Set the same value a couple of time, by 'id' and object", function() {
			person1.set( { likesALot: 'person-2' } );
			person1.set( { likesALot: person2 } );
			
			ok( person1.get('likesALot') === person2 );
			ok( person2.get('likedALotBy' ) === person1 );
			
			person1.set( { likesALot: 'person-2' } );
			
			ok( person1.get('likesALot') === person2 );
			ok( person2.get('likedALotBy' ) === person1 );
		});
});