// documentation on writing tests here: http://docs.jquery.com/QUnit
// example tests: https://github.com/jquery/qunit/blob/master/test/same.js
// more examples: https://github.com/jquery/jquery/tree/master/test/unit
// jQueryUI examples: https://github.com/jquery/jquery-ui/tree/master/tests/unit

//sessionStorage.clear();
if ( !window.console ) {
	var names = [ 'log', 'debug', 'info', 'warn', 'error', 'assert', 'dir', 'dirxml',
	'group', 'groupEnd', 'time', 'timeEnd', 'count', 'trace', 'profile', 'profileEnd' ];
	window.console = {};
	for ( var i = 0; i < names.length; ++i )
		window.console[ names[i] ] = function() {};
}

$(document).ready(function() {
	$.ajax = function( obj ) {
		window.requests.push( obj );
		return obj;
	};
	
	Backbone.Model.prototype.url = function() {
		// Use the 'resource_uri' if possible
		var url = this.get( 'resource_uri' );
		
		// Try to have the collection construct a url
		if ( !url && this.collection ) {
			url = this.collection.url && _.isFunction( this.collection.url ) ? this.collection.url() : this.collection.url;
		}
		
		// Fallback to 'urlRoot'
		if ( !url && this.urlRoot ) {
			url = this.urlRoot + this.id;
		}
		
		if ( !url ) {
			throw new Error( 'Url could not be determined!' );
		}
		
		return url;
	};
	
	
	Zoo = Backbone.RelationalModel.extend({
		relations: [{
				type: Backbone.HasMany,
				key: 'animals',
				relatedModel: 'Animal',
				collectionType: 'AnimalCollection',
				reverseRelation: {
					key: 'livesIn',
					includeInJSON: 'id'
				}
			}]
	});
	
	Animal = Backbone.RelationalModel.extend({
		urlRoot: '/animal/',
		
		// For validation testing. Wikipedia says elephants are reported up to 12.000 kg. Any more, we must've weighted wrong ;).
		validate: function( attrs ) {
			if ( attrs.species === 'elephant' && attrs.weight && attrs.weight > 12000 ) {
				return "Too heavy.";
			}
		}
	});
	
	AnimalCollection = Backbone.Collection.extend({
		model: Animal
	});
	
	
	House = Backbone.RelationalModel.extend({
		relations: [{
				type: Backbone.HasMany,
				key: 'occupants',
				relatedModel: 'Person',
				reverseRelation: {
					key: 'livesIn',
					includeInJSON: false
				}
			}]
	});
	
	User = Backbone.RelationalModel.extend({
		urlRoot: '/user/'
	});
	
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
				includeInJSON: Backbone.Model.prototype.idAttribute,
				reverseRelation: {
					type: Backbone.HasOne,
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
		]
	});
	
	PersonCollection = Backbone.Collection.extend({
		model: Person
	});
	
	// A link table between 'Person' and 'Company', to achieve many-to-many relations
	Job = Backbone.RelationalModel.extend({
		defaults: {
			'startDate': null,
			'endDate': null
		}
	});
	
	Company = Backbone.RelationalModel.extend({
		relations: [{
				type: 'HasMany',
				key: 'employees',
				relatedModel: 'Job',
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
		// Reset last ajax requests
		window.requests = [];
		
		// save _reverseRelations, otherwise we'll get a lot of warnings about existing relations
		var oldReverseRelations = Backbone.Relational.store._reverseRelations;
		Backbone.Relational.store = new Backbone.Store();
		Backbone.Relational.store._reverseRelations = oldReverseRelations;
		Backbone.Relational.eventQueue = new Backbone.BlockingQueue();
		
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
			employees: [ { person: 'person-3' } ], // uses the 'Job' link table to achieve many-to-many. No 'id' specified!
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
	
	
	module( "Backbone.BlockingQueue" );
	
	
		test( "Block", function() {
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
	
	
	module( "Backbone.Store", { setup: initObjects } );
	
	
		test( "Initialized", function() {
			equal( Backbone.Relational.store._collections.length, 5, "Store contains 5 collections" );
		});
		
		test( "getObjectByName", function() {
			equal( Backbone.Relational.store.getObjectByName( 'Backbone' ), Backbone );
			equal( Backbone.Relational.store.getObjectByName( 'Backbone.RelationalModel' ), Backbone.RelationalModel );
		});
		
		test( "Add and remove from store", function() {
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
		
		test( "Models are created from objects, can then be found, destroyed, cannot be found anymore", function() {
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
			
			var request = anotherHouse.destroy();
			// Trigger the 'success' callback to fire the 'destroy' event
			request.success();
			
			var house = Backbone.Relational.store.find( House, houseId );
			
			ok( !house, houseId + " is not found in the store anymore" );
		});
		
		
		test( "Model.collection is the first collection a Model is added to by an end-user (not it's Backbone.Store collection!)", function() {
			var person = new Person( { name: 'New guy' } );
			var personColl = new PersonCollection();
			personColl.add( person );
			ok( person.collection === personColl );
		});
		
		test( "All models can be found after adding them to a Collection via 'Collection.reset'", function() {
			var nodes = [
				{ id: 1, parent: null },
				{ id: 2, parent: 1 },
				{ id: 3, parent: 4 },
				{ id: 4, parent: 1 }
			];
			
			var nodeList = new NodeList();
			nodeList.reset( nodes );
			
			var storeColl = Backbone.Relational.store.getCollection( Node );
			equals( storeColl.length, 4, "Every Node is in Backbone.Relational.store" );
			ok( Backbone.Relational.store.find( Node, 1 ) instanceof Node, "Node 1 can be found" );
			ok( Backbone.Relational.store.find( Node, 2 ) instanceof Node, "Node 2 can be found" );
			ok( Backbone.Relational.store.find( Node, 3 ) instanceof Node, "Node 3 can be found" );
			ok( Backbone.Relational.store.find( Node, 4 ) instanceof Node, "Node 4 can be found" );
		});
		
		test( "Inheritance creates and uses a separate relation", function() {
			var whale = new Animal( { id: 1, species: 'whale' } );
			ok( Backbone.Relational.store.find( Animal, 1 ) === whale );
			
			var numCollections = Backbone.Relational.store._collections.length;
			
			Mammal = Animal.extend({
				urlRoot: '/mammal/'
			});
			
			var lion = new Mammal( { id: 1, species: 'lion' } );
			var donkey = new Mammal( { id: 2, species: 'donkey' } );
			
			equals( Backbone.Relational.store._collections.length, numCollections + 1 );
			ok( Backbone.Relational.store.find( Animal, 1 ) === whale );
			ok( Backbone.Relational.store.find( Mammal, 1 ) === lion );
			ok( Backbone.Relational.store.find( Mammal, 2 ) === donkey );
			
			Primate = Mammal.extend({
				urlRoot: '/primate/'
			})
			
			var gorilla = new Primate( { id: 1, species: 'gorilla' } );
			
			equals( Backbone.Relational.store._collections.length, numCollections + 2 );
			ok( Backbone.Relational.store.find( Primate, 1 ) === gorilla );
		});
		
	
	module( "Backbone.RelationalModel", { setup: initObjects } );
		
		
		test( "Return values: set returns the Model", function() {
			var personId = 'person-10';
			var person = new Person({
				id: personId,
				name: 'Remi',
				resource_uri: personId
			});
			
			var result = person.set( { 'name': 'Hector' } );
			ok( result === person, "Set returns the model" );
		});
		
		test( "getRelations", function() {
			equal( person1.getRelations().length, 6 );
		});
		
		test( "getRelation", function() {
			var rel = person1.getRelation( 'user' );
			equal( rel.key, 'user' );
		});
		
		test( "fetchRelated on a HasOne relation", function() {
			var errorCount = 0;
			var person = new Person({
				id: 'person-10',
				resource_uri: 'person-10',
				user: 'user-10'
			});
			
			var requests = person.fetchRelated( 'user', { error: function() {
					errorCount++;
				}
			});
			
			ok( _.isArray( requests ) );
			equal( requests.length, 1, "A request has been made" );
			ok( person.get( 'user' ) instanceof User );
			
			// Triggering the 'error' callback should destroy the model
			requests[ 0 ].error();
			// Trigger the 'success' callback to fire the 'destroy' event
			window.requests[ window.requests.length - 1 ].success();
			
			equal( person.get( 'user' ), null );
			ok( errorCount, 1, "The error callback executed successfully" );
			
			var person2 = new Person({
				id: 'person-10',
				resource_uri: 'person-10'
			});
			
			requests = person2.fetchRelated( 'user' );
			equal( requests.length, 0, "No request was made" );
		});
		
		test( "fetchRelated on a HasMany relation", function() {
			var errorCount = 0;
			var zoo = new Zoo({
				animals: [ 'lion-1', 'zebra-1' ]
			});
			
			//
			// Case 1: separate requests for each model
			//
			var requests = zoo.fetchRelated( 'animals', { error: function() { errorCount++; } } );
			ok( _.isArray( requests ) );
			equal( requests.length, 2, "Two requests have been made (a separate one for each animal)" );
			equal( zoo.get( 'animals' ).length, 2, "Two animals in the zoo" );
			
			// Triggering the 'error' callback for either request should destroy the model
			requests[ 0 ].error();
			// Trigger the 'success' callback to fire the 'destroy' event
			window.requests[ window.requests.length - 1 ].success();
			
			equal( zoo.get( 'animals' ).length, 1, "One animal left in the zoo" );
			ok( errorCount, 1, "The error callback executed successfully" );
			
			//
			// Case 2: one request per fetch (generated by the collection)
			//
			// Give 'zoo' a custom url function that builds a url to fetch a set of models from their ids
			errorCount = 0;
			zoo.get( 'animals' ).url = function( models ) {
				return '/animal/' + ( models ? 'set/' + _.pluck( models, 'id' ).join(';') + '/' : '' );
			};
			
			// Set two new animals to be fetched; both should be fetched in a single request
			zoo.set( { animals: [ 'lion-2', 'zebra-2' ] } );
			
			equal( zoo.get( 'animals' ).length, 0 );
			
			requests = zoo.fetchRelated( 'animals', { error: function() { errorCount++; } } );
			
			ok( _.isArray( requests ) );
			equal( requests.length, 1 );
			ok( requests[ 0 ].url === '/animal/set/lion-2;zebra-2/' );
			equal( zoo.get('animals').length, 2 );
			
			// Triggering the 'error' callback should destroy both of the fetched models
			requests[ 0 ].error();
			// Trigger the 'success' callback for both 'delete' calls to fire the 'destroy' event
			window.requests[ window.requests.length - 1 ].success();
			window.requests[ window.requests.length - 2 ].success();
			
			equal( zoo.get( 'animals' ).length, 0, "Both animals are destroyed" );
			ok( errorCount, 2, "The error callback executed successfully for both models" );
			
			// Re-fetch them
			requests = zoo.fetchRelated( 'animals' );
			
			equal( requests.length, 1 );
			equal( zoo.get( 'animals' ).length, 2 );
			
			// No more animals to fetch!
			requests = zoo.fetchRelated( 'animals' );
			
			ok( _.isArray( requests ) );
			equal( requests.length, 0 );
			equal( zoo.get( 'animals' ).length, 2 );
		});
		
		test( "toJSON", function() {
			var node1 = new Node({ id: '1', parent: '3', name: 'First node' });
			var node2 = new Node({ id: '2', parent: '1', name: 'Second node' });
			var node3 = new Node({ id: '3', parent: '2', name: 'Third node' });
			
			var json = node1.toJSON();
			//console.debug( json );
			ok( json.children.length === 1 );
		});
		
	
	module( "Backbone.Relation options", { setup: initObjects } );
		
		
		test( "includeInJSON (Person to JSON)", function() {
			var json = person1.toJSON();
			equal( json.user, 'user-1', "The value 'user' is the user's id (not an object, since 'includeInJSON' is set to the idAttribute)" );
			ok ( json.likesALot instanceof Object, "The value of 'likesALot' is an object ('includeInJSON' is 'true')" );
			equal(  json.likesALot.likesALot, 'person-1', "Person is serialized only once" );
			
			json = person1.get( 'user' ).toJSON();
			equal( json.person, 'boy', "The value of 'person' is the person's name ('includeInJSON is set to 'name')" );
			
			json = person2.toJSON();
			ok( person2.get('livesIn') instanceof House, "'person2' has a 'livesIn' relation" );
			equal( json.livesIn, undefined , "The value of 'livesIn' is not serialized ('includeInJSON is 'false')" );
		});
		
		test( "createModels is false", function() {
			var NewUser = Backbone.RelationalModel.extend({});
			var NewPerson = Backbone.RelationalModel.extend({
				relations: [{
					type: Backbone.HasOne,
					key: 'user',
					relatedModel: NewUser,
					createModels: false
				}]
			});
			
			var person = new NewPerson({
				id: 'newperson-1',
				resource_uri: 'newperson-1',
				user: { id: 'newuser-1', resource_uri: 'newuser-1' }
			});
			
			ok( person.get( 'user' ) == null );
			
			var user = new NewUser( { id: 'newuser-1', name: 'SuperUser' } );
			
			ok( person.get( 'user' ) === user );
			// Old data gets overwritten by the explicitly created user, since a model was never created from the old data
			ok( person.get( 'user' ).get( 'resource_uri' ) == null );
		});
		
		
	module( "Backbone.Relation preconditions" );
		
		
		test( "'type', 'key', 'relatedModel' are required properties", function() {
			var Properties = Backbone.RelationalModel.extend({});
			var View = Backbone.RelationalModel.extend({
				relations: [
					{
						key: 'listProperties',
						relatedModel: Properties
					}
				]
			});
			
			var view = new View();
			ok( view._relations.length === 0 );
			
			View = Backbone.RelationalModel.extend({
				relations: [
					{
						type: Backbone.HasOne,
						relatedModel: Properties
					}
				]
			});
			
			view = new View();
			ok( view._relations.length === 0 );
			
			View = Backbone.RelationalModel.extend({
				relations: [
					{
						type: Backbone.HasOne,
						key: 'listProperties'
					}
				]
			});
			
			view = new View();
			ok( view._relations.length === 0 );
		});
		
		test( "'type' can be a string or an object reference", function() {
			var Properties = Backbone.RelationalModel.extend({});
			var View = Backbone.RelationalModel.extend({
				relations: [
					{
						type: 'Backbone.HasOne',
						key: 'listProperties',
						relatedModel: Properties
					}
				]
			});
			
			var view = new View();
			ok( view._relations.length === 1 );
			
			View = Backbone.RelationalModel.extend({
				relations: [
					{
						type: 'HasOne',
						key: 'listProperties',
						relatedModel: Properties
					}
				]
			});
			
			view = new View();
			ok( view._relations.length === 1 );
			
			View = Backbone.RelationalModel.extend({
				relations: [
					{
						type: Backbone.HasOne,
						key: 'listProperties',
						relatedModel: Properties
					}
				]
			});
			
			view = new View();
			ok( view._relations.length === 1 );
		});
		
		test( "'key' can be a string or an object reference", function() {
			Properties = Backbone.RelationalModel.extend({});
			var View = Backbone.RelationalModel.extend({
				relations: [
					{
						type: Backbone.HasOne,
						key: 'listProperties',
						relatedModel: 'Properties'
					}
				]
			});
			
			var view = new View();
			ok( view._relations.length === 1 );
			
			View = Backbone.RelationalModel.extend({
				relations: [
					{
						type: Backbone.HasOne,
						key: 'listProperties',
						relatedModel: Properties
					}
				]
			});
			
			view = new View();
			ok( view._relations.length === 1 );
			
			delete Properties;
		});
		
		test( "HasMany with a reverseRelation HasMany is not allowed", function() {
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
				users: [ 'person-1', 'person-2', 'person-3' ]
			});
			
			ok( password._relations.length === 0, "No _relations created on Password" );
		});
		
		test( "Duplicate relations not allowed (two simple relations)", function() {
			var Properties = Backbone.RelationalModel.extend({});
			var View = Backbone.RelationalModel.extend({
				relations: [
					{
						type: Backbone.HasOne,
						key: 'properties',
						relatedModel: Properties
					},
					{
						type: Backbone.HasOne,
						key: 'properties',
						relatedModel: Properties
					}
				]
			});
			
			var view = new View();
			view.set( { properties: new Properties() } );
			ok( view._relations.length === 1 );
		});
		
		test( "Duplicate relations not allowed (one relation with a reverse relation, one without)", function() {
			var Properties = Backbone.RelationalModel.extend({});
			var View = Backbone.RelationalModel.extend({
				relations: [
					{
						type: Backbone.HasOne,
						key: 'properties',
						relatedModel: Properties,
						reverseRelation: {
							type: Backbone.HasOne,
							key: 'view'
						}
					},
					{
						type: Backbone.HasOne,
						key: 'properties',
						relatedModel: Properties
					}
				]
			});
			
			var view = new View();
			view.set( { properties: new Properties() } );
			ok( view._relations.length === 1 );
		});
		
		test( "Duplicate relations not allowed (two relations with reverse relations)", function() {
			var Properties = Backbone.RelationalModel.extend({});
			var View = Backbone.RelationalModel.extend({
				relations: [
					{
						type: Backbone.HasOne,
						key: 'properties',
						relatedModel: Properties,
						reverseRelation: {
							type: Backbone.HasOne,
							key: 'view'
						}
					},
					{
						type: Backbone.HasOne,
						key: 'properties',
						relatedModel: Properties,
						reverseRelation: {
							type: Backbone.HasOne,
							key: 'view'
						}
					}
				]
			});
			
			var view = new View();
			view.set( { properties: new Properties() } );
			ok( view._relations.length === 1 );
		});
		
		test( "Duplicate relations not allowed (different relations, reverse relations)", function() {
			var Properties = Backbone.RelationalModel.extend({});
			var View = Backbone.RelationalModel.extend({
				relations: [
					{
						type: Backbone.HasOne,
						key: 'listProperties',
						relatedModel: Properties,
						reverseRelation: {
							type: Backbone.HasOne,
							key: 'view'
						}
					},
					{
						type: Backbone.HasOne,
						key: 'windowProperties',
						relatedModel: Properties,
						reverseRelation: {
							type: Backbone.HasOne,
							key: 'view'
						}
					}
				]
			});
			
			var view = new View();
			var prop1 = new Properties( { name: 'a' } );
			var prop2 = new Properties( { name: 'b' } );
			
			view.set( { listProperties: prop1, windowProperties: prop2 } );
			
			ok( view._relations.length === 2 );
			ok( prop1._relations.length === 2 );
			ok( view.get( 'listProperties' ).get( 'name' ) === 'a' );
			ok( view.get( 'windowProperties' ).get( 'name' ) === 'b' );
		});
		
	
	module( "Backbone.Relation general", { setup: initObjects } );
		
		
		test( "Only valid models (no validation failure) should be added to a relation", function() {
			var zoo = new Zoo();
			
			zoo.bind( 'add:animals', function( animal ) {
					ok( animal instanceof Animal );
				});
			
			var smallElephant = new Animal( { name: 'Jumbo', species: 'elephant', weight: 2000, livesIn: zoo } );
			equals( zoo.get( 'animals' ).length, 1, "Just 1 elephant in the zoo" );
			
			zoo.get( 'animals' ).add( { name: 'Big guy', species: 'elephant', weight: 13000 } );
			equals( zoo.get( 'animals' ).length, 1, "Still just 1 elephant in the zoo" );
		});
	
	module( "Backbone.HasOne", { setup: initObjects } );
		
		
		test( "HasOne relations on Person are set up properly", function() {
			ok( person1.get('likesALot') === person2 );
			equal( person1.get('user').id, 'user-1', "The id of 'person1's user is 'user-1'" );
			ok( person2.get('likesALot') === person1 );
		});
		
		test( "Reverse HasOne relations on Person are set up properly", function() {
			ok( person1.get( 'likedALotBy' ) === person2 );
			ok( person1.get( 'user' ).get( 'person' ) === person1, "The person belonging to 'person1's user is 'person1'" );
			ok( person2.get( 'likedALotBy' ) === person1 );
		});
		
		test( "'set' triggers 'change' and 'update', on a HasOne relation, for a Model with multiple relations", function() {
			expect( 9 );
			
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
			// triggers initialization of the reverse relation from User to Password
			password = new Password( { plaintext: 'asdf' } );
			
			person1.bind( 'change', function( model, options ) {
					ok( model.get( 'user' ) instanceof User, "model.user is an instance of User" );
					equals( model.previous( 'user' ).get( 'login' ), oldLogin, "previousAttributes is available on 'change'" );
				});
			
			person1.bind( 'change:user', function( model, options ) {
					ok( model.get( 'user' ) instanceof User, "model.user is an instance of User" );
					equals( model.previous( 'user' ).get( 'login' ), oldLogin, "previousAttributes is available on 'change'" );
				});
			
			person1.bind( 'update:user', function( model, attr, options ) {
					ok( model.get( 'user' ) instanceof User, "model.user is an instance of User" );
					ok( attr.get( 'person' ) === person1, "The user's 'person' is 'person1'" );
					ok( attr.get( 'password' ) instanceof Password, "The user's password attribute is a model of type Password");
					equal( attr.get( 'password' ).get( 'plaintext' ), 'qwerty', "The user's password is ''qwerty'" );
				});
			
			var user = { login: 'me@hotmail.com', password: { plaintext: 'qwerty' } };
			var oldLogin = person1.get('user').get( 'login' );
			// Triggers first # assertions
			person1.set( { user: user } );
			
			user = person1.get( 'user' ).bind( 'update:password', function( model, attr, options ) {
					equal( attr.get( 'plaintext' ), 'asdf', "The user's password is ''qwerty'" );
				});
			
			// Triggers last assertion
			user.set( { password: password } );
		});
		
		test( "'unset' triggers 'change' and 'update:'", function() {
			expect( 4 );
			
			person1.bind( 'change', function( model, options ) {
					equals( model.get('user'), null, "model.user is unset" );
				});
			
			person1.bind( 'update:user', function( model, attr, options ) {
					equals( attr, null, "new value of attr (user) is null" );
				});
			
			ok( person1.get( 'user' ) instanceof User, "person1 has a 'user'" );
			
			var user = person1.get( 'user' );
			person1.unset( 'user' );
			
			equals( user.get( 'person' ), null, "person1 is not set on 'user' anymore" );
		});
		
		test( "'clear' triggers 'change' and 'update:'", function() {
			expect( 4 );
			
			person1.bind( 'change', function( model, options ) {
					equals( model.get('user'), null, "model.user is unset" );
				});
			
			person1.bind( 'update:user', function( model, attr, options ) {
					equals( attr, null, "new value of attr (user) is null" );
				});
			
			ok( person1.get( 'user' ) instanceof User, "person1 has a 'user'" );
			
			var user = person1.get( 'user' );
			person1.clear();
			
			equals( user.get( 'person' ), null, "person1 is not set on 'user' anymore" );
		});
		
		
	module( "Backbone.HasMany", { setup: initObjects } );
		
		
		test( "Listeners on 'add'/'remove'", function() {
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
			
			ourHouse.get( 'occupants' ).add( person1 );
			person1.set( { 'livesIn': theirHouse } );
			theirHouse.get( 'occupants' ).remove( person1 );
		});
		
		test( "Listeners for 'add'/'remove', on a HasMany relation, for a Model with multiple relations", function() {
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
					
					ok( model instanceof Job );
					ok( model.get('company') instanceof Company && model.get('person') instanceof Person,
						"Both Person and Company are set on the Job instance" );
				});
			
			person1.bind( 'add:jobs', function( model, coll ) {
					ok( model.get( 'company' ) === oldCompany && model.get( 'person' ) === person1,
						"Both Person and Company are set on the Job instance" );
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
			
			// Create a stand-alone Job ;)
			new Job({
				person: person1,
				company: oldCompany
			});
			
			ok( jobs.length === 1 && employees.length === 2, "jobs.length is 1 and employees.length is 2" );
		});
		
		test( "The Collections used for HasMany relations are re-used if possible", function() {
			var collId = ourHouse.get( 'occupants' ).id = 1;
			
			ourHouse.get( 'occupants' ).add( person1 );
			ok( ourHouse.get( 'occupants' ).id === collId );
			
			// Set a value on 'occupants' that would cause the relation to be reset.
			// The collection itself should be kept (along with it's properties)
			ourHouse.set( { 'occupants': [ 'person-1' ] } );
			ok( ourHouse.get( 'occupants' ).id === collId );
			ok( ourHouse.get( 'occupants' ).length === 1 );
			
			// Setting a new collection loses the original collection
			ourHouse.set( { 'occupants': new Backbone.Collection() } );
			ok( ourHouse.get( 'occupants' ).id === undefined );
		});

		test( "Setting a custom collection in relatedCollection uses that collection for instantiation", function() {
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
		
		
	module( "Reverse relationships", { setup: initObjects } );
	
	
		test( "Add and remove", function() {
			equal( ourHouse.get( 'occupants' ).length, 1, "ourHouse has 1 occupant" );
			equal( person1.get( 'livesIn' ), null, "Person 1 doesn't live anywhere" );
			
			ourHouse.get( 'occupants' ).add( person1 );
			
			equal( ourHouse.get( 'occupants' ).length, 2, "Our House has 2 occupants" );
			equal( person1.get( 'livesIn' ) && person1.get('livesIn').id, ourHouse.id, "Person 1 lives in ourHouse" );
			
			person1.set( { 'livesIn': theirHouse } );
			
			equal( theirHouse.get( 'occupants' ).length, 1, "theirHouse has 1 occupant" );
			equal( ourHouse.get( 'occupants' ).length, 1, "ourHouse has 1 occupant" );
			equal( person1.get( 'livesIn' ) && person1.get('livesIn').id, theirHouse.id, "Person 1 lives in theirHouse" );
		});
		
		test( "HasOne relations to self (tree stucture)", function() {
			var child1 = new Node({ id: '2', parent: '1', name: 'First child' });
			var parent = new Node({ id: '1', name: 'Parent' });
			var child2 = new Node({ id: '3', parent: '1', name: 'Second child' });
			
			equal( parent.get( 'children' ).length, 2 );
			ok( parent.get( 'children' ).include( child1 ) );
			ok( parent.get( 'children' ).include( child2 ) );
			
			ok( child1.get( 'parent' ) === parent );
			equal( child1.get( 'children' ).length, 0 );
			
			ok( child2.get( 'parent' ) === parent );
			equal( child2.get( 'children' ).length, 0 );
		});
		
		test( "HasMany relations to self (tree structure)", function() {
			var child1 = new Node({ id: '2', name: 'First child' });
			var parent = new Node({ id: '1', children: [ '2', '3' ], name: 'Parent' });
			var child2 = new Node({ id: '3', name: 'Second child' });
			
			equal( parent.get( 'children' ).length, 2 );
			ok( parent.get( 'children' ).include( child1 ) );
			ok( parent.get( 'children' ).include( child2 ) );
			
			ok( child1.get( 'parent' ) === parent );
			equal( child1.get( 'children' ).length, 0 );
			
			ok( child2.get( 'parent' ) === parent );
			equal( child2.get( 'children' ).length, 0 );
		});
		
		test( "HasOne relations to self (cycle, directed graph structure)", function() {
			var node1 = new Node({ id: '1', parent: '3', name: 'First node' });
			var node2 = new Node({ id: '2', parent: '1', name: 'Second node' });
			var node3 = new Node({ id: '3', parent: '2', name: 'Third node' });
			
			ok( node1.get( 'parent' ) === node3 );
			equal( node1.get( 'children' ).length, 1 );
			ok( node1.get( 'children' ).at(0) === node2 );
			
			ok( node2.get( 'parent' ) === node1 );
			equal( node2.get( 'children' ).length, 1 );
			ok( node2.get( 'children' ).at(0) === node3 );
			
			ok( node3.get( 'parent' ) === node2 );
			equal( node3.get( 'children' ).length, 1 );
			ok( node3.get( 'children' ).at(0) === node1 );
		});
		
		test("New objects (no 'id' yet) have working relations", function() {
			var person = new Person({
				name: 'Remi'
			});
			
			person.set( { user: { login: '1', email: '1' } } );
			var user1 = person.get( 'user' );
			
			ok( user1 instanceof User, "User created on Person" );
			equal( user1.get('login'), '1', "person.user is the correct User" );
			
			var user2 = new User({
				login: '2',
				email: '2'
			});
			
			ok( user2.get( 'person' ) === null, "'user' doesn't belong to a 'person' yet" );
			
			person.set( { user: user2 } );
			
			ok( user1.get( 'person' ) === null );
			ok( person.get( 'user' ) === user2 );
			ok( user2.get( 'person' ) === person );
			
			person2.set( { user: user2 } );
			
			ok( person.get( 'user' ) === null );
			ok( person2.get( 'user' ) === user2 );
			ok( user2.get( 'person' ) === person2 );
		});
		
		test("'Save' objects (performing 'set' multiple times without and with id)", function() {
			expect( 2 );
			
			person3
				.bind( 'add:jobs', function( model, coll ) {
						var company = model.get('company');
						ok( company instanceof Company && company.get('ceo').get('name') === 'Lunar boy' && model.get('person') === person3,
							"Both Person and Company are set on the Job instance" );
					})
				.bind( 'remove:jobs', function( model, coll ) {
						ok( false, "'person3' should not lose his job" );
					});
			
			// Create Models from an object
			var company = new Company({
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
				employees: [ { id: 'job-1', person: 'person-3', resource_uri: 'job-1' } ],
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
		
		test("Numerical keys", function() {
			var child1 = new Node({ id: 2, name: 'First child' });
			var parent = new Node({ id: 1, children: [2, 3], name: 'Parent' });
			var child2 = new Node({ id: 3, name: 'Second child' });
			
			equal( parent.get('children').length, 2 );
			ok( parent.get('children').include( child1 ) );
			ok( parent.get('children').include( child2 ) );
			
			ok( child1.get('parent') === parent );
			equal( child1.get('children').length, 0 );
			
			ok( child2.get('parent') === parent );
			equal( child2.get('children').length, 0 );
		});
		
		test("Relations that use refs to other models (instead of keys)", function() {
			var child1 = new Node({ id: 2, name: 'First child' });
			var parent = new Node({ id: 1, children: [child1, 3], name: 'Parent' });
			var child2 = new Node({ id: 3, name: 'Second child' });
			
			ok( child1.get('parent') === parent );
			equal( child1.get('children').length, 0 );
			
			equal( parent.get('children').length, 2 );
			ok( parent.get('children').include( child1 ) );
			ok( parent.get('children').include( child2 ) );
			
			var child3 = new Node({ id: 4, parent: parent, name: 'Second child' });
			
			equal( parent.get('children').length, 3 );
			ok( parent.get('children').include( child3 ) );
			
			ok( child3.get('parent') === parent );
			equal( child3.get('children').length, 0 );
		});
		
		test("Add an already existing model (reverseRelation shouldn't exist yet) to a relation as a hash", function() {
			// This test caused a race condition to surface:
			// The 'relation's constructor initializes the 'reverseRelation', which called 'relation.addRelated' in it's 'initialize'.
			// However, 'relation's 'initialize' has not been executed yet, so it doesn't have a 'related' collection yet.
			var Properties = Backbone.RelationalModel.extend({});
			var View = Backbone.RelationalModel.extend({
				relations: [
					{
						type: Backbone.HasMany,
						key: 'properties',
						relatedModel: Properties,
						reverseRelation: {
							type: Backbone.HasOne,
							key: 'view'
						}
					}
				]
			});
			
			var props = new Properties( { id: 1, key: 'width', value: '300px', view: 1 } );
			var view = new View({
				id: 1,
				properties: [ { id: 1, key: 'width', value: '300px', view: 1 } ]
			});
			
			ok( props.get( 'view' ) === view );
			ok( view.get( 'properties' ).include( props ) );
		});
		
		test("ReverseRelations are applied retroactively", function() {
			// Use brand new Model types, so we can be sure we don't have any reverse relations cached from previous tests
			var NewUser = Backbone.RelationalModel.extend({});
			var NewPerson = Backbone.RelationalModel.extend({
				relations: [{
					type: Backbone.HasOne,
					key: 'user',
					relatedModel: NewUser,
					reverseRelation: {
						type: Backbone.HasOne,
						key: 'person'
					}
				}]
			});
			
			var user = new NewUser( { id: 'newuser-1' } );
			//var user2 = new NewUser( { id: 'newuser-2', person: 'newperson-1' } );
			var person = new NewPerson( { id: 'newperson-1', user: user } );
			
			ok( person.get('user') === user );
			ok( user.get('person') === person );
			//console.debug( person, user );
		});
	
	
	module("Model loading", { setup: initObjects } );
	
	
		test("Loading (fetching) multiple times updates the model", function() {
			var collA = new Backbone.Collection();
			collA.model = User;
			var collB = new Backbone.Collection();
			collB.model = User;
			
			// Similar to what happens when calling 'fetch' on collA, updating it, calling 'fetch' on collB
			var name = 'User 1';
			var user = collA._add( { id: '/user/1/', name: name } );
			equal( user.get( 'name' ), name );
			
			// The 'name' of 'user' is updated when adding a new hash to the collection
			name = 'New name';
			var updatedUser = collA._add( { id: '/user/1/', name: name } );
			equal( user.get( 'name' ), name );
			equal( updatedUser.get( 'name' ), name );
			
			// The 'name' of 'user' is also updated when adding a new hash to another collection
			name = 'Another new name';
			var updatedUser2 = collB._add( { id: '/user/1/', name: name, title: 'Superuser' } );
			equal( user.get( 'name' ), name );
			equal( updatedUser2.get('name'), name );
			
			ok( collA.get('/user/1/') === updatedUser );
			ok( collA.get('/user/1/') === updatedUser2 );
			ok( collB.get('/user/1/') === user );
			ok( collB.get('/user/1/') === updatedUser );
		});
		
		test("Loading (fetching) multiple times updates related models as well (HasOne)", function() {
				var coll = new PersonCollection();
				coll.add( { id: 'person-10', name: 'Person', user: { id: 'user-10', login: 'User' } } );
				
				var person = coll.at( 0 );
				var user = person.get( 'user' );
				
				equals( user.get( 'login' ), 'User' );
				
				coll.add( { id: 'person-10', name: 'New person', user: { id: 'user-10', login: 'New user' } } );
				
				equals( person.get( 'name' ), 'New person' );
				equals( user.get( 'login' ), 'New user' );
			});
		
		test("Loading (fetching) multiple times updates related models as well (HasMany)", function() {
				var coll = new Backbone.Collection();
				coll.model = Zoo;
				
				// Create a 'zoo' with 1 animal in it
				coll.add( { id: 'zoo-1', name: 'Zoo', animals: [ { id: 'lion-1', name: 'Mufasa' } ] } );
				var zoo = coll.at( 0 );
				var lion = zoo.get( 'animals' ) .at( 0 );
				
				equals( lion.get( 'name' ), 'Mufasa' );
				
				// Update the name of 'zoo' and 'lion'
				coll.add( { id: 'zoo-1', name: 'Zoo Station', animals: [ { id: 'lion-1', name: 'Simba' } ] } );
				
				equals( zoo.get( 'name' ), 'Zoo Station' );
				equals( lion.get( 'name' ), 'Simba' );
			});

		test("collectionKey attribute is used to create references on generated Collections back to its RelationalModel", function() {
				var zoo = new Zoo({
					animals: [ 'lion-1', 'zebra-1' ]
				});

				equals( zoo.get( 'animals' ).livesIn, zoo );
				equals( zoo.get( 'animals' ).zoo, undefined );

				Barn = Backbone.RelationalModel.extend({
					relations: [{
							type: Backbone.HasMany,
							key: 'animals',
							relatedModel: 'Animal',
							collectionType: 'AnimalCollection',
							collectionKey: 'barn',
							reverseRelation: {
								key: 'livesIn',
								includeInJSON: 'id'
							}
						}]
				})
				var barn = new Barn({
					animals: [ 'chicken-1', 'cow-1' ]
				});

				equals( barn.get( 'animals' ).livesIn, undefined );
				equals( barn.get( 'animals' ).barn, barn );

				BarnNoKey = Backbone.RelationalModel.extend({
					relations: [{
							type: Backbone.HasMany,
							key: 'animals',
							relatedModel: 'Animal',
							collectionType: 'AnimalCollection',
							collectionKey: false,
							reverseRelation: {
								key: 'livesIn',
								includeInJSON: 'id'
							}
						}]
				})
				var barnNoKey = new BarnNoKey({
					animals: [ 'chicken-1', 'cow-1' ]
				});

				equals( barnNoKey.get( 'animals' ).livesIn, undefined );
				equals( barnNoKey.get( 'animals' ).barn, undefined );
			});
	
});
