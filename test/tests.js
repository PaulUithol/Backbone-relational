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
	
	PersonCollection = Backbone.Collection.extend({
		model: Person
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
	
	Node = Backbone.RelationalModel.extend({
		relations: [{
				type: Backbone.HasOne,
				key: 'parent',
				relatedModel: 'Node',
				includeInJSON: false,
				reverseRelation: {
					key: 'children'
				}
			}
		]
	});
	
	NodeList = Backbone.Collection.extend({
		model: Node
	});
	
	function initObjects() {
		// save _reverseRelations, otherwise we'll get a lot of warnings about existing relations
		var oldReverseRelations = Backbone.store._reverseRelations;
		Backbone.store = new Backbone.Store();
		Backbone.store._reverseRelations = oldReverseRelations;
		Backbone.eventQueue = new Backbone.BlockingQueue();
		
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
	
	module("Backbone.Semaphore");
	
	
		test("Unbounded", function() {
			expect( 10 );
			
			var semaphore = _.extend( {}, Backbone.Semaphore );
			ok( !semaphore.isLocked(), 'Semaphore is not locked initially' );
			semaphore.acquire();
			ok( semaphore.isLocked(), 'Semaphore is locked after acquire' );
			semaphore.acquire();
			equal( semaphore._permitsUsed, 2 ,'_permitsUsed should be incremented 2 times' );
			
			semaphore.setAvailablePermits( 4 );
			equal( semaphore._permitsAvailable, 4 ,'_permitsAvailable should be 4' );
			
			semaphore.acquire();
			semaphore.acquire();
			equal( semaphore._permitsUsed, 4 ,'_permitsUsed should be incremented 4 times' );
			
			try {
				semaphore.acquire();
			}
			catch( ex ) {
				ok( true, 'Error thrown when attempting to acquire too often' );
			}
			
			semaphore.release();
			equal( semaphore._permitsUsed, 3 ,'_permitsUsed should be decremented to 3' );
			
			semaphore.release();
			semaphore.release();
			semaphore.release();
			equal( semaphore._permitsUsed, 0 ,'_permitsUsed should be decremented to 0' );
			ok( !semaphore.isLocked(), 'Semaphore is not locked when all permits are released' );
			
			try {
				semaphore.release();
			}
			catch( ex ) {
				ok( true, 'Error thrown when attempting to release too often' );
			}
		});
	
	
	module("Backbone.BlockingQueue");
	
	
		test("Block", function() {
			var queue = new Backbone.BlockingQueue();
			var count = 0;
			var increment = function() { count++; };
			var decrement = function() { count--; };
			
			queue.add( increment );
			ok( count === 1, 'Increment executed right away' );
			
			queue.add( decrement );
			ok( count === 0, 'Decrement executed right away' );
			
			queue.block();
			queue.add( increment );
			
			ok( queue.isLocked(), 'Queue is blocked' );
			equal( count, 0, 'Increment did not execute right away' );
			
			queue.block();
			queue.block();
			
			equal( queue._permitsUsed, 3 ,'_permitsUsed should be incremented to 3' );
			
			queue.unblock();
			queue.unblock();
			queue.unblock();
			
			equal( count, 1, 'Increment executed' );
		});
	
	
	module("Backbone.Store", { setup: initObjects } );
	
	
		test("Initialized", function() {
			equal( Backbone.store._collections.length, 5, "Store contains 5 collections" );
		});
		
		test("getObjectByName", function() {
			equal( Backbone.store.getObjectByName( 'Backbone' ), Backbone );
			equal( Backbone.store.getObjectByName( 'Backbone.RelationalModel' ), Backbone.RelationalModel );
		});
		
		test("Add and remove from store", function() {
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
		
		
		test("Model.collection is the first collection a Model is added to by an end-user (not it's Backbone.Store collection!)", function() {
			var person = new Person( { name: 'New guy' } );
			var personColl = new PersonCollection();
			personColl.add( person );
			ok( person.collection === personColl );
		});
		
		test("All models can be found after adding them to a Collection via 'Collection.reset'", function() {
			var nodes = [
				{ id: 1, parent: null },
				{ id: 2, parent: 1 },
				{ id: 3, parent: 4 },
				{ id: 4, parent: 1 }
			];
			
			var nodeList = new NodeList();
			nodeList.reset( nodes );
			
			var storeColl = Backbone.store.getCollection( Node );
			equals( storeColl.length, 4, "Every Node is in Backbone.store" );
			ok( Backbone.store.find( Node, 1 ) instanceof Node, "Node 1 can be found" );
			ok( Backbone.store.find( Node, 2 ) instanceof Node, "Node 2 can be found" );
			ok( Backbone.store.find( Node, 3 ) instanceof Node, "Node 3 can be found" );
			ok( Backbone.store.find( Node, 4 ) instanceof Node, "Node 4 can be found" );
		});
		
	
	module("Backbone.RelationalModel", { setup: initObjects } );
	
	
		test("IncludeInJSON: Person to JSON", function() {
			var json = person1.toJSON();
			console.debug( json );
			
			ok( _.isString( json.user ), "No User object (includeInJSON=false for those)" );
			equal(  json.likesALot.likesALot, 'person-1', "Person is serialized only once" );
		});
		
		test("Return values: set returns the Model", function() {
			var personId = 'person-10';
			var person = new Person({
				id: personId,
				name: 'Remi',
				resource_uri: personId
			});
			
			var result = person.set( { 'name': 'Hector Malot' } );
			ok( result === person, "Set returns the model" );
		});
		
	
	module("Backbone.Relation preconditions");
	
		
		test("'type', 'key', 'relatedModel' are required properties", function() {
			Properties = Backbone.RelationalModel.extend({});
			Window = Backbone.RelationalModel.extend({
				relations: [
					{
						key: 'listProperties',
						relatedModel: 'Properties'
					}
				]
			});
			
			var window = new Window();
			ok( window._relations.length === 0 );
			
			Window = Backbone.RelationalModel.extend({
				relations: [
					{
						type: Backbone.HasOne,
						relatedModel: 'Properties'
					}
				]
			});
			
			window = new Window();
			ok( window._relations.length === 0 );
			
			Window = Backbone.RelationalModel.extend({
				relations: [
					{
						type: Backbone.HasOne,
						key: 'listProperties'
					}
				]
			});
			
			window = new Window();
			ok( window._relations.length === 0 );
		});
		
		test("HasMany with a reverseRelation HasMany is not allowed", function() {
			Password = Backbone.RelationalModel.extend({
				relations: [{
					type: 'HasMany',
					key: 'users',
					relatedModel: 'User',
					reverseRelation: {
						type: 'HasMany',
						key: 'passwords'
					}
				}]
			});
			
			var password = new Password({
				plaintext: 'qwerty',
				users: ['person-1', 'person-2', 'person-3' ]
			});
			
			ok( password._relations.length === 0, "No _relations created on Password" );
		});
		
		test("Duplicate relations not allowed (two simple relations)", function() {
			Properties = Backbone.RelationalModel.extend({});
			Window = Backbone.RelationalModel.extend({
				relations: [
					{
						type: Backbone.HasOne,
						key: 'listProperties',
						relatedModel: 'Properties'
					},
					{
						type: Backbone.HasOne,
						key: 'listProperties',
						relatedModel: 'Properties'
					}
				]
			});
			
			var window = new Window();
			window.set({ listProperties: new Properties() } );
			ok( window._relations.length === 1 );
		});
		
		test("Duplicate relations not allowed (one relation with a reverse relation, one without)", function() {
			Properties = Backbone.RelationalModel.extend({});
			Window = Backbone.RelationalModel.extend({
				relations: [
					{
						type: Backbone.HasOne,
						key: 'listProperties',
						relatedModel: 'Properties',
						reverseRelation: {
							type: Backbone.HasOne,
							key: 'window'
						}
					},
					{
						type: Backbone.HasOne,
						key: 'listProperties',
						relatedModel: 'Properties'
					}
				]
			});
			
			var window = new Window();
			window.set({ listProperties: new Properties() } );
			ok( window._relations.length === 1 );
		});
		
		test("Duplicate relations not allowed (two relations with reverse relations)", function() {
			Properties = Backbone.RelationalModel.extend({});
			Window = Backbone.RelationalModel.extend({
				relations: [
					{
						type: Backbone.HasOne,
						key: 'listProperties',
						relatedModel: 'Properties',
						reverseRelation: {
							type: Backbone.HasOne,
							key: 'window'
						}
					},
					{
						type: Backbone.HasOne,
						key: 'listProperties',
						relatedModel: 'Properties',
						reverseRelation: {
							type: Backbone.HasOne,
							key: 'window'
						}
					}
				]
			});
			
			var window = new Window();
			window.set({ listProperties: new Properties() } );
			ok( window._relations.length === 1 );
		});
		
		test("Duplicate relations not allowed (different relations, reverse relations)", function() {
			Properties = Backbone.RelationalModel.extend({});
			Window = Backbone.RelationalModel.extend({
				relations: [
					{
						type: Backbone.HasOne,
						key: 'listProperties',
						relatedModel: 'Properties',
						reverseRelation: {
							type: Backbone.HasOne,
							key: 'window'
						}
					},
					{
						type: Backbone.HasOne,
						key: 'windowProperties',
						relatedModel: 'Properties',
						reverseRelation: {
							type: Backbone.HasOne,
							key: 'window'
						}
					}
				]
			});
			
			var window = new Window();
			var prop1 = new Properties({name:'a'});
			var prop2 = new Properties({name:'b'});
			
			window.set( { listProperties: prop1, windowProperties: prop2 } );
			
			ok( window._relations.length === 2 );
			ok( prop1._relations.length === 2 );
			ok( window.get('listProperties').get('name') === 'a' );
			ok( window.get('windowProperties').get('name') === 'b' );
		});
		
	
	module("Backbone.HasOne", { setup: initObjects } );
		
		
		test("HasOne relations on Person are set up properly", function() {
			ok( person1.get('likesALot') === person2 );
			equal( person1.get('user').id, 'user-1', "The id of 'person1's user is 'user-1'" );
			ok( person2.get('likesALot') === person1 );
		});
		
		test("Reverse HasOne relations on Person are set up properly", function() {
			ok( person1.get('likedALotBy') === person2 );
			ok( person1.get('user').get('person') === person1, "The person belonging to 'person1's user 'person1'" );
			ok( person2.get('likedALotBy') === person1 );
		});
		
		test("Listeners for 'update', on a HasOne relation, for a Model with multiple relations", function() {
			expect( 4 );
			
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
			// triggers initialization of the relation to Password on User
			password = new Password({ plaintext: 'asdf'});
			
			person1.bind('update:user', function( model, attr, options ) {
				ok( attr.get('person') === person1, "The user's 'person' is 'person1'" );
				ok( attr.get('password') instanceof Password, "The user's password attribute is a model of type Password");
				equal( attr.get('password').get('plaintext'), 'qwerty', "The user's password is ''qwerty'" );
			});
			
			var user = { login: 'me@hotmail.com', password: { plaintext: 'qwerty' } };
			// Triggers first three assertions
			person1.set( { user: user } );
			
			user = person1.get('user').bind('update:password', function( model, attr, options ) {
				equal( attr.get('plaintext'), 'asdf', "The user's password is ''qwerty'" );
			});
			
			// Triggers fourth assertion
			user.set( { password: password } );
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
		
		test("Listeners for 'add'/'remove', on a HasMany relation, for a Model with multiple relations", function() {
			var job1 = { company: oldCompany };
			var job2 = { company: oldCompany, person: person1 };
			var job3 = { person: person1 };
			var newJob = null;
			
			newCompany.bind( 'add:employees', function( model, coll ) {
					ok( false, "person1 should only be added to 'oldCompany'." );
				});
			
			// Assert that all relations on a Model are set up, before notifying related models.
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
		
		
	module("Reverse relationships", { setup: initObjects } );
	
		
		test("Add and remove", function() {
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
		
		test("HasOne relations to self (tree stucture)", function() {
			var child1 = new Node({ id: '2', parent: '1', name: 'First child' });
			var parent = new Node({ id: '1', name: 'Parent' });
			var child2 = new Node({ id: '3', parent: '1', name: 'Second child' });
			
			equal( parent.get('children').length, 2 );
			ok( parent.get('children').include( child1 ) );
			ok( parent.get('children').include( child2 ) );
			
			ok( child1.get('parent') === parent );
			equal( child1.get('children').length, 0 );
			
			ok( child2.get('parent') === parent );
			equal( child2.get('children').length, 0 );
		});
		
		test("HasMany relations to self (tree structure)", function() {
			var child1 = new Node({ id: '2', name: 'First child' });
			var parent = new Node({ id: '1', children: ['2', '3'], name: 'Parent' });
			var child2 = new Node({ id: '3', name: 'Second child' });
			
			equal( parent.get('children').length, 2 );
			ok( parent.get('children').include( child1 ) );
			ok( parent.get('children').include( child2 ) );
			
			ok( child1.get('parent') === parent );
			equal( child1.get('children').length, 0 );
			
			ok( child2.get('parent') === parent );
			equal( child2.get('children').length, 0 );
		});
		
		test("HasOne relations to self (cycle, directed graph structure)", function() {
			var node1 = new Node({ id: '1', parent: '3', name: 'First node' });
			var node2 = new Node({ id: '2', parent: '1', name: 'Second node' });
			var node3 = new Node({ id: '3', parent: '2', name: 'Third node' });
			
			ok( node1.get('parent') === node3 );
			equal( node1.get('children').length, 1 );
			ok( node1.get('children').at(0) === node2 );
			
			ok( node2.get('parent') === node1 );
			equal( node2.get('children').length, 1 );
			ok( node2.get('children').at(0) === node3 );
			
			ok( node3.get('parent') === node2 );
			equal( node3.get('children').length, 1 );
			ok( node3.get('children').at(0) === node1 );
		});
		
		test("New objects (no 'id' yet) have working relations", function() {
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
		
		test("'Save' objects (performing 'set' multiple times without and with id)", function() {
			person3
				.bind( 'add:jobs', function( model, coll ) {
						var company = model.get('company');
						ok( company instanceof Company && company.get('ceo').get('name') === 'Lunar boy' && model.get('person') === person3,
							"Both Person and Company are set on the Tenure instance" );
					})
				.bind( 'remove:jobs', function( model, coll ) {
						ok( false, "'person3' should not lose his job" );
					});
			
			// Create Models from an object
			company = new Company({
				name: 'Luna Corp.',
				ceo: {
					name: 'Lunar boy'
				},
				employees: [ { person: 'person-3' } ],
			});
			
			// Backbone.save executes "model.set(model.parse(resp), options)". Set a full map over object, but now with ids.
			company.set({
				id: 'company-3',
				name: 'Big Corp.',
				ceo: {
					id: 'person-4',
					name: 'Lunar boy',
					resource_uri: 'person-4'
				},
				employees: [ { id: 'tenure-1', person: 'person-3', resource_uri: 'tenure-1' } ],
				resource_uri: 'company-3'
			});
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
	
	
	module("Model loading", { setup: initObjects } );
	
	
		test("Loading (fetching) the same model multiple times updates the model", function() {
			var collA = new Backbone.Collection();
			collA.model = User;
			var collB = new Backbone.Collection();
			collB.model = User;
			
			// Similar to what happens when calling 'fetch' on collA, then on collB
			var user = collA._add( { id: '/user/1/', name: 'User 1' } );
			equal( user.get('name'), 'User 1' );
			
			var updatedUser = collB._add( { id: '/user/1/', name: 'New name for User 1', title: 'Superuser' } );
			equal( user.get('name'), 'New name for User 1' );
			equal( updatedUser.get('name'), 'New name for User 1' );
		});
});