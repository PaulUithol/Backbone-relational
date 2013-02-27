/* vim: set tabstop=4 softtabstop=4 shiftwidth=4 noexpandtab: */
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


	/**
	 * 'Zoo'
	 */

	window.Zoo = Backbone.RelationalModel.extend({
		urlRoot: '/zoo/',

		relations: [
			{
				type: Backbone.HasMany,
				key: 'animals',
				relatedModel: 'Animal',
				includeInJSON: [ 'id', 'species' ],
				collectionType: 'AnimalCollection',
				collectionOptions: function( instance ) { return { 'url': 'zoo/' + instance.cid + '/animal/' } },
				reverseRelation: {
					key: 'livesIn',
					includeInJSON: 'id'
				}
			},
			{ // A simple HasMany without recursive relation
				type: Backbone.HasMany,
				key: 'visitors',
				relatedModel: 'Visitor'
			}
		],

		toString: function() {
			return 'Zoo (' + this.id + ')';
		}
	});

	window.Animal = Backbone.RelationalModel.extend({
		urlRoot: '/animal/',
		
		// For validation testing. Wikipedia says elephants are reported up to 12.000 kg. Any more, we must've weighted wrong ;).
		validate: function( attrs ) {
			if ( attrs.species === 'elephant' && attrs.weight && attrs.weight > 12000 ) {
				return "Too heavy.";
			}
		},

		toString: function() {
			return 'Animal (' + this.id + ')';
		}
	});

	window.AnimalCollection = Backbone.Collection.extend({
		model: Animal,
		
		initialize: function( models, options ) {
			options || (options = {});
			this.url = options.url;
		}
	});

	window.Visitor = Backbone.RelationalModel.extend();


	/**
	 * House/Person/Job/Company
	 */

	window.House = Backbone.RelationalModel.extend({
		relations: [{
			type: Backbone.HasMany,
			key: 'occupants',
			relatedModel: 'Person',
			reverseRelation: {
				key: 'livesIn',
				includeInJSON: false
			}
		}],

		toString: function() {
			return 'House (' + this.id + ')';
		}
	});

	window.User = Backbone.RelationalModel.extend({
		urlRoot: '/user/',

		toString: function() {
			return 'User (' + this.id + ')';
		}
	});

	window.Person = Backbone.RelationalModel.extend({
		relations: [
			{
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
				keyDestination: 'user_id',
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
		],

		toString: function() {
			return 'Person (' + this.id + ')';
		}
	});

	window.PersonCollection = Backbone.Collection.extend({
		model: Person
	});

	window.Password = Backbone.RelationalModel.extend({
		relations: [{
			type: Backbone.HasOne,
			key: 'user',
			relatedModel: 'User',
			reverseRelation: {
				type: Backbone.HasOne,
				key: 'password'
			}
		}],

		toString: function() {
			return 'Password (' + this.id + ')';
		}
	});
	
	// A link table between 'Person' and 'Company', to achieve many-to-many relations
	window.Job = Backbone.RelationalModel.extend({
		defaults: {
			'startDate': null,
			'endDate': null
		},

		toString: function() {
			return 'Job (' + this.id + ')';
		}
	});

	window.Company = Backbone.RelationalModel.extend({
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
		],

		toString: function() {
			return 'Company (' + this.id + ')';
		}
	});

	window.CompanyCollection = Backbone.Collection.extend({
		model: Company
	});


	window.Node = Backbone.RelationalModel.extend({
		urlRoot: '/node/',

		relations: [{
				type: Backbone.HasOne,
				key: 'parent',
				relatedModel: 'Node',
				reverseRelation: {
					key: 'children'
				}
			}
		],

		toString: function() {
			return 'Node (' + this.id + ')';
		}
	});

	window.NodeList = Backbone.Collection.extend({
		model: Node
	});

	window.Customer = Backbone.RelationalModel.extend({
		urlRoot: '/customer/',

		toString: function() {
			return 'Customer (' + this.id + ')';
		}
	});

	window.Address = Backbone.RelationalModel.extend({
		urlRoot: '/address/',

		toString: function() {
			return 'Address (' + this.id + ')';
		}
	});

	window.Shop = Backbone.RelationalModel.extend({
		relations: [
			{
				type: Backbone.HasMany,
				key: 'customers',
				relatedModel: 'Customer',
				autoFetch: true
			},
			{
				type: Backbone.HasOne,
				key: 'address',
				relatedModel: 'Address',
				autoFetch: {
					success: function(model, response){
						response.successOK = true;
					},
					error: function(model, response){
						response.errorOK = true;
					}
				}
			}
		],

		toString: function() {
			return 'Shop (' + this.id + ')';
		}
	});

	window.Agent = Backbone.RelationalModel.extend({
		urlRoot: '/agent/',

		relations: [
			{
				type: Backbone.HasMany,
				key: 'customers',
				relatedModel: 'Customer'
			},
			{
				type: Backbone.HasOne,
				key: 'address',
				relatedModel: 'Address',
				autoFetch: false
			}
		],

		toString: function() {
			return 'Agent (' + this.id + ')';
		}
	});

	/**
	 * Reset variables that are persistent across tests, specifically `window.requests` and the state of
	 * `Backbone.Relational.store`.
	 */
	function reset() {
		// Reset last ajax requests
		window.requests = [];

		Backbone.Relational.store.reset();
		Backbone.Relational.eventQueue = new Backbone.BlockingQueue();
	}

	/**
	 * Initialize a few models that are used in a large number of tests
	 */
	function initObjects() {
		reset();

		window.person1 = new Person({
			id: 'person-1',
			name: 'boy',
			likesALot: 'person-2',
			resource_uri: 'person-1',
			user: { id: 'user-1', login: 'dude', email: 'me@gmail.com', resource_uri: 'user-1' }
		});

		window.person2 = new Person({
			id: 'person-2',
			name: 'girl',
			likesALot: 'person-1',
			resource_uri: 'person-2'
		});

		window.person3 = new Person({
			id: 'person-3',
			resource_uri: 'person-3'
		});

		window.oldCompany = new Company({
			id: 'company-1',
			name: 'Big Corp.',
			ceo: {
				name: 'Big Boy'
			},
			employees: [ { person: 'person-3' } ], // uses the 'Job' link table to achieve many-to-many. No 'id' specified!
			resource_uri: 'company-1'
		});

		window.newCompany = new Company({
			id: 'company-2',
			name: 'New Corp.',
			employees: [ { person: 'person-2' } ],
			resource_uri: 'company-2'
		});

		window.ourHouse = new House({
			id: 'house-1',
			location: 'in the middle of the street',
			occupants: ['person-2'],
			resource_uri: 'house-1'
		});

		window.theirHouse = new House({
			id: 'house-2',
			location: 'outside of town',
			occupants: [],
			resource_uri: 'house-2'
		});
	}

	module ( "General / Backbone", { setup: reset } );

		test( "Prototypes, constructors and inheritance", function() {
			// This stuff makes my brain hurt a bit. So, for reference:
			var Model = Backbone.Model.extend(),
				i = new Backbone.Model(),
				iModel = new Model();

			var RelModel= Backbone.RelationalModel.extend(),
				iRel = new Backbone.RelationalModel(),
				iRelModel = new RelModel();

			// Both are functions, so their `constructor` is `Function`
			ok( Backbone.Model.constructor == Backbone.RelationalModel.constructor );

			ok( Backbone.Model != Backbone.RelationalModel );
			ok( Backbone.Model == Backbone.Model.prototype.constructor );
			ok( Backbone.RelationalModel == Backbone.RelationalModel.prototype.constructor );
			ok( Backbone.Model.prototype.constructor != Backbone.RelationalModel.prototype.constructor );

			ok( Model.prototype instanceof Backbone.Model );
			ok( !( Model.prototype instanceof Backbone.RelationalModel ) );
			ok( RelModel.prototype instanceof Backbone.Model );
			ok( Backbone.RelationalModel.prototype instanceof Backbone.Model );
			ok( RelModel.prototype instanceof Backbone.RelationalModel );

			ok( i instanceof Backbone.Model );
			ok( !( i instanceof Backbone.RelationalModel ) );
			ok( iRel instanceof Backbone.Model );
			ok( iRel instanceof Backbone.RelationalModel );

			ok( iModel instanceof Backbone.Model );
			ok( !( iModel instanceof Backbone.RelationalModel ) );
			ok( iRelModel instanceof Backbone.Model );
			ok( iRelModel instanceof Backbone.RelationalModel );
		});

		test('update', 1, function() {
			var a = new Backbone.Model({id: 3, label: 'a'} ),
				b = new Backbone.Model({id: 2, label: 'b'} ),
				col = new Backbone.Collection([a]);

			col.update([a,b], {add: true, merge: false, remove: true});
			ok( col.length == 2 );
		});


	module( "Backbone.Semaphore", { setup: reset } );

	
		test( "Unbounded", 10, function() {
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
	
	
	module( "Backbone.BlockingQueue", { setup: reset } );
	
	
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
			// `initObjects` instantiates models of the following types: `Person`, `Job`, `Company`, `User`, `House` and `Password`.
			equal( Backbone.Relational.store._collections.length, 6, "Store contains 6 collections" );
		});
		
		test( "getObjectByName", function() {
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

		test( "addModelScope", function() {
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

		test( "addModelScope with submodels and namespaces", function() {
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

			ok( people.at(0).iam() == "I am a student" );
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
			
			request = anotherHouse.destroy();
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
			equal( storeColl.length, 4, "Every Node is in Backbone.Relational.store" );
			ok( Backbone.Relational.store.find( Node, 1 ) instanceof Node, "Node 1 can be found" );
			ok( Backbone.Relational.store.find( Node, 2 ) instanceof Node, "Node 2 can be found" );
			ok( Backbone.Relational.store.find( Node, 3 ) instanceof Node, "Node 3 can be found" );
			ok( Backbone.Relational.store.find( Node, 4 ) instanceof Node, "Node 4 can be found" );
		});
		
		test( "Inheritance creates and uses a separate collection", function() {
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
		
		test( "Inheritance with `subModelTypes` uses the same collection as the model's super", function() {
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
			var relations = person1.getRelations();

			equal( relations.length, 6 );

			ok( _.every( relations, function( rel ) {
					return rel instanceof Backbone.Relation;
				})
			);
		});
		
		test( "getRelation", function() {
			var userRel = person1.getRelation( 'user' );

			ok( userRel instanceof Backbone.HasOne );
			equal( userRel.key, 'user' );

			var jobsRel = person1.getRelation( 'jobs' );

			ok( jobsRel instanceof Backbone.HasMany );
			equal( jobsRel.key, 'jobs' );

			ok( person1.getRelation( 'nope' ) == null );
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

			ok( !person.get( 'user' ), "User has been destroyed & removed" );
			equal( errorCount, 1, "The error callback executed successfully" );
			
			var person2 = new Person({
				id: 'person-11',
				resource_uri: 'person-11'
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
			equal( errorCount, 1, "The error callback executed successfully" );
			
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
			
			// Triggering the 'error' callback (some error occured during fetching) should trigger the 'destroy' event
			// on both fetched models, but should NOT actually make 'delete' requests to the server!
			var numRequests = window.requests.length;
			requests[ 0 ].error();
			ok( window.requests.length === numRequests, "An error occured when fetching, but no DELETE requests are made to the server while handling local cleanup." );
			
			equal( zoo.get( 'animals' ).length, 0, "Both animals are destroyed" );
			equal( errorCount, 2, "The error callback executed successfully for both models" );
			
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

		test( "autoFetch a HasMany relation", function() {
			var shopOne = new Shop({
				id: 'shop-1',
				customers: ['customer-1', 'customer-2']
			});

			equal( requests.length, 2, "Two requests to fetch the users has been made" );
			requests.length = 0;

			var shopTwo = new Shop({
				id: 'shop-2',
				customers: ['customer-1', 'customer-3']
			});

			equal( requests.length, 1, "A request to fetch a user has been made" ); //as customer-1 has already been fetched
		});

		test( "autoFetch on a HasOne relation (with callbacks)", function() {
			var shopThree = new Shop({
				id: 'shop-3',
				address: 'address-3'
			});

			equal( requests.length, 1, "A request to fetch the address has been made" );
			
			var res = { successOK: false, errorOK: false };
			
			requests[0].success( res );
			equal( res.successOK, true, "The success() callback has been called" );
			requests.length = 0;

			var shopFour = new Shop({
				id: 'shop-4',
				address: 'address-4'
			});

			equal( requests.length, 1, "A request to fetch the address has been made" );
			requests[0].error( res );
			equal( res.errorOK, true, "The error() callback has been called" );
		});

		test( "autoFetch false by default", function() {
			var agentOne = new Agent({
				id: 'agent-1',
				customers: ['customer-4', 'customer-5']
			});

			equal( requests.length, 0, "No requests to fetch the customers has been made as autoFetch was not defined" );

			agentOne = new Agent({
				id: 'agent-2',
				address: 'address-5'
			});

			equal( requests.length, 0, "No requests to fetch the customers has been made as autoFetch was set to false" );
		});

		test( "clone", function() {
			var user = person1.get( 'user' );

			// HasOne relations should stay with the original model
			var newPerson = person1.clone();

			ok( newPerson.get( 'user' ) === null );
			ok( person1.get( 'user' ) === user );
		});
		
		test( "toJSON", function() {
			var node = new Node({ id: '1', parent: '3', name: 'First node' });
			new Node({ id: '2', parent: '1', name: 'Second node' });
			new Node({ id: '3', parent: '2', name: 'Third node' });
			
			var json = node.toJSON();

			ok( json.children.length === 1 );
		});

		test( "`parse` gets called through `findOrCreate`", function() {
			var parseCalled = 0;
			Zoo.prototype.parse = function( resp, options ) {
				parseCalled++;
				return resp;
			};

			var animal = new Animal({ id: '123' });
			animal.set({
				id: '123',
				livesIn: {
					id: '456',
					name: 'San Diego Zoo',
					animals: [ '123' ]
				}
			}, { parse: true });

			ok( animal.get( 'livesIn' ) instanceof Zoo );
			ok( animal.get( 'livesIn' ).get( 'animals' ).get( animal ) === animal );

			// `parse` should get called once by `findOrCreate` directly when trying to lookup `456`,
			// and once when it `build` (called from `findOrCreate`) calls the Zoo constructor with `{ parse: true}`.
			ok( parseCalled === 2 );
		});

		test( "constructor.findOrCreate", function() {
			var personColl = Backbone.Relational.store.getCollection( person1 ),
				origPersonCollSize = personColl.length;

			// Just find an existing model
			var person = Person.findOrCreate( person1.id );

			ok( person === person1 );
			ok( origPersonCollSize === personColl.length, "Existing person was found (none created)" );

			// Update an existing model
			person = Person.findOrCreate( { id: person1.id, name: 'dude' } );

			equal( person.get( 'name' ), 'dude' );
			equal( person1.get( 'name' ), 'dude' );

			ok( origPersonCollSize === personColl.length, "Existing person was updated (none created)" );

			// Look for a non-existent person; 'options.create' is false
			person = Person.findOrCreate( { id: 5001 }, { create: false } );

			ok( !person );
			ok( origPersonCollSize === personColl.length, "No person was found (none created)" );

			// Create a new model
			person = Person.findOrCreate( { id: 5001 } );

			ok( person instanceof Person );
			ok( origPersonCollSize + 1 === personColl.length, "No person was found (1 created)" );

			// Find when options.merge is false
			person = Person.findOrCreate( { id: person1.id, name: 'phil' }, { merge: false } );

			equal( person.get( 'name' ), 'dude' );
			equal( person1.get( 'name' ), 'dude' );

		});

		test( "change events in relation can use changedAttributes properly", function() {
			var scope = {};
			Backbone.Relational.store.addModelScope( scope );

			scope.PetAnimal = Backbone.RelationalModel.extend({
				subModelTypes: {
					'cat': 'Cat',
					'dog': 'Dog'
				}
			});
			scope.Dog = scope.PetAnimal.extend();
			scope.Cat = scope.PetAnimal.extend();

			scope.PetOwner = Backbone.RelationalModel.extend({
				relations: [{
					type: Backbone.HasMany,
					key: 'pets',
					relatedModel: scope.PetAnimal,
					reverseRelation: {
						key: 'owner'
					}
				}]
			});

			var owner = new scope.PetOwner( { id: 'owner-2354' } );
			var animal = new scope.Dog( { type: 'dog', id: '238902', color: 'blue' } );
			equal( animal.get('color'), 'blue', 'animal starts out blue' );

			var changes = 0, changedAttrs;
			animal.on('change', function(model, options) {
				changes++;
				changedAttrs = model.changedAttributes();
			});

			animal.set( { color: 'green' } );
			equal( changes, 1, 'change event gets called after animal.set' );
			equal( changedAttrs.color, 'green', '... with correct properties in "changedAttributes"' );

			owner.set(owner.parse({
				id: 'owner-2354',
				pets: [ { id: '238902', type: 'dog', color: 'red' } ]
			}));

			equal( animal.get('color'), 'red', 'color gets updated properly' );
			equal( changes, 2, 'change event gets called after owner.set' );
			equal( changedAttrs.color, 'red', '... with correct properties in "changedAttributes"' );
		});

	
	module( "Backbone.RelationalModel inheritance (`subModelTypes`)", { setup: reset } );

		test( "Object building based on type, when using explicit collections" , function() {
			var scope = {};
			Backbone.Relational.store.addModelScope( scope );

			scope.Mammal = Animal.extend({
				subModelTypes: {
					'primate': 'Primate',
					'carnivore': 'Carnivore'
				}
			});
			scope.Primate = scope.Mammal.extend();
			scope.Carnivore = scope.Mammal.extend();

			var MammalCollection = AnimalCollection.extend({
				model: scope.Mammal
			});

			var mammals = new MammalCollection( [
				{ id: 5, species: 'chimp', type: 'primate' },
				{ id: 6, species: 'panther', type: 'carnivore' }
			]);

			ok( mammals.at( 0 ) instanceof scope.Primate );
			ok( mammals.at( 1 ) instanceof scope.Carnivore );
		});

		test( "Object building based on type, when used in relations" , function() {
			var scope = {};
			Backbone.Relational.store.addModelScope( scope );

			var PetAnimal = scope.PetAnimal = Backbone.RelationalModel.extend({
				subModelTypes: {
					'cat': 'Cat',
					'dog': 'Dog'
				}
			});
			var Dog = scope.Dog = PetAnimal.extend();
			var Cat = scope.Cat = PetAnimal.extend();

			var PetPerson = scope.PetPerson = Backbone.RelationalModel.extend({
				relations: [{
					type: Backbone.HasMany,
					key: 'pets',
					relatedModel: PetAnimal,
					reverseRelation: {
						key: 'owner'
					}
				}]
			});

			var petPerson = new scope.PetPerson({
				pets: [
					{
						type: 'dog',
						name: 'Spot'
					},
					{
						type: 'cat',
						name: 'Whiskers'
					}
				]
			});

			ok( petPerson.get( 'pets' ).at( 0 ) instanceof Dog );
			ok( petPerson.get( 'pets' ).at( 1 ) instanceof Cat );

			petPerson.get( 'pets' ).add({
				type: 'dog',
				name: 'Spot II'
			});
			
			ok( petPerson.get( 'pets' ).at( 2 ) instanceof Dog );
		});
		
		test( "Automatic sharing of 'superModel' relations" , function() {
			var scope = {};
			Backbone.Relational.store.addModelScope( scope );

			scope.PetPerson = Backbone.RelationalModel.extend({});
			scope.PetAnimal = Backbone.RelationalModel.extend({
				subModelTypes: {
					'dog': 'Dog'
				},

				relations: [{
					type: Backbone.HasOne,
					key:  'owner',
					relatedModel: scope.PetPerson,
					reverseRelation: {
						type: Backbone.HasMany,
						key: 'pets'
					}
				}]
			});

			scope.Flea = Backbone.RelationalModel.extend({});

			scope.Dog = scope.PetAnimal.extend({
				relations: [{
					type: Backbone.HasMany,
					key:	'fleas',
					relatedModel: scope.Flea,
					reverseRelation: {
						key: 'host'
					}
				}]
			});
			
			var dog = new scope.Dog({
				name: 'Spot'
			});
			
			var person = new scope.PetPerson({
				pets: [ dog ]
			});

			ok( dog.get( 'owner' ) === person, "Dog has a working owner relation." );

			var flea = new scope.Flea({
				host: dog
			});
			
			ok( dog.get( 'fleas' ).at( 0 ) === flea, "Dog has a working fleas relation." );
		});
	
		test( "toJSON includes the type", function() {
			var scope = {};
			Backbone.Relational.store.addModelScope( scope );

			scope.PetAnimal = Backbone.RelationalModel.extend({
				subModelTypes: {
					'dog': 'Dog'
				}
			});

			scope.Dog = scope.PetAnimal.extend();
			
			var dog = new scope.Dog({
				name: 'Spot'
			});
			
			var json = dog.toJSON();
			
			equal( json.type, 'dog', "The value of 'type' is the pet animal's type." );
		});
		
	
	module( "Backbone.Relation options", { setup: initObjects } );
		
		
		test( "'includeInJSON' (Person to JSON)", function() {
			var json = person1.toJSON();
			equal( json.user_id, 'user-1', "The value of 'user_id' is the user's id (not an object, since 'includeInJSON' is set to the idAttribute)" );
			ok ( json.likesALot instanceof Object, "The value of 'likesALot' is an object ('includeInJSON' is 'true')" );
			equal( json.likesALot.likesALot, 'person-1', "Person is serialized only once" );
			
			json = person1.get( 'user' ).toJSON();
			equal( json.person, 'boy', "The value of 'person' is the person's name ('includeInJSON is set to 'name')" );
			
			json = person2.toJSON();
			ok( person2.get('livesIn') instanceof House, "'person2' has a 'livesIn' relation" );
			equal( json.livesIn, undefined , "The value of 'livesIn' is not serialized ('includeInJSON is 'false')" );
			
			json = person3.toJSON();
			ok( json.user_id === null, "The value of 'user_id' is null");
			ok( json.likesALot === null, "The value of 'likesALot' is null");
		});

		test( "'includeInJSON' (Zoo to JSON)", function() {
			var zoo = new Zoo({
				name: 'Artis',
				animals: [
					new Animal( { id: 1, species: 'bear', name: 'Baloo' } ),
					new Animal( { id: 2, species: 'tiger', name: 'Shere Khan' } )
				]
			});

			var json = zoo.toJSON();

			equal( json.animals.length, 2 );

			var bear = json.animals[ 0 ];

			equal( bear.species, 'bear', "animal's species has been included in the JSON" );
			equal( bear.name, undefined, "animal's name has not been included in the JSON" );
		});
		
		test( "'createModels' is false", function() {
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

		test("'dotNotation' is true", function(){
			var NewUser = Backbone.RelationalModel.extend({});
			var NewPerson = Backbone.RelationalModel.extend({
				dotNotation: true,
				relations: [{
					type: Backbone.HasOne,
					key: 'user',
					relatedModel: NewUser
				}]
			});
			
			var person = new NewPerson({
				"normal": true,
				"user.over": 2,
				user: {name: "John", "over" : 1}
			});
			
			ok( person.get( 'normal' ) === true, "getting normal attributes works as usual" );
			ok( person.get( 'user.name' ) === "John", "attributes of nested models can be get via dot notation: nested.attribute");
			ok(oldCompany.get( 'ceo.name' ) === undefined, "no dotNotation when not enabled");
			raises( function() {
				person.get( 'user.over' );
			}, "getting ambiguous nested attributes raises an exception");
		});

		test( "Relations load from both `keySource` and `key`", function() {
			var Property = Backbone.RelationalModel.extend({
				idAttribute: 'property_id'
			});
			var View = Backbone.RelationalModel.extend({
				idAttribute: 'id',

				relations: [{
					type: Backbone.HasMany,
					key: 'properties',
					keySource: 'property_ids',
					relatedModel: Property,
					reverseRelation: {
						key: 'view',
						keySource: 'view_id'
					}
				}]
			});

			var property1 = new Property({
				property_id: 1,
				key: 'width',
				value: 500,
				view_id: 5
			});

			var view = new View({
				id: 5,
				property_ids: [ 2 ]
			});

			var property2 = new Property({
				property_id: 2,
				key: 'height',
				value: 400
			});

			// The values from view.property_ids should be loaded into view.properties
			ok( view.get( 'properties' ) && view.get( 'properties' ).length === 2, "'view' has two 'properties'" );
			ok( typeof view.get( 'property_ids' ) === 'undefined', "'view' does not have 'property_ids'" );

			view.set( 'properties', [ property1, property2 ] );
			ok( view.get( 'properties' ) && view.get( 'properties' ).length === 2, "'view' has two 'properties'" );

			view.set( 'property_ids', [ 1, 2 ] );
			ok( view.get( 'properties' ) && view.get( 'properties' ).length === 2, "'view' has two 'properties'" );
		});

		test( "'keyDestination' saves to 'key'", function() {
			var Property = Backbone.RelationalModel.extend({
				idAttribute: 'property_id'
			});
			var View = Backbone.RelationalModel.extend({
				idAttribute: 'id',

				relations: [{
					type: Backbone.HasMany,
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

			var property1 = new Property({
				property_id: 1,
				key: 'width',
				value: 500,
				view: 5
			});

			var view = new View({
				id: 5,
				properties: [ 2 ]
			});

			var property2 = new Property({
				property_id: 2,
				key: 'height',
				value: 400
			});

			var viewJSON = view.toJSON();
			ok( viewJSON.properties_attributes && viewJSON.properties_attributes.length === 2, "'viewJSON' has two 'properties_attributes'" );
			ok( typeof viewJSON.properties === 'undefined', "'viewJSON' does not have 'properties'" );
		});
		
		test( "'collectionOptions' sets the options on the created HasMany Collections", function() {
			var zoo = new Zoo();
			ok( zoo.get("animals").url === "zoo/" + zoo.cid + "/animal/");
		});
		
		
	module( "Backbone.Relation preconditions", { setup: reset } );
		
		
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
			var Properties = Backbone.RelationalModel.extend({});
			var View = Backbone.RelationalModel.extend({
				relations: [
					{
						type: Backbone.HasOne,
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
						type: Backbone.HasOne,
						key: 'listProperties',
						relatedModel: Properties
					}
				]
			});
			
			view = new View();
			ok( view._relations.length === 1 );
		});
		
		test( "HasMany with a reverseRelation HasMany is not allowed", function() {
			var User = Backbone.RelationalModel.extend({});
			var Password = Backbone.RelationalModel.extend({
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
		
	
	module( "Backbone.Relation general", { setup: reset } );
		
		
		test( "Only valid models (no validation failure) should be added to a relation", function() {
			var zoo = new Zoo();
			
			zoo.bind( 'add:animals', function( animal ) {
				ok( animal instanceof Animal );
			});
			
			var smallElephant = new Animal( { name: 'Jumbo', species: 'elephant', weight: 2000, livesIn: zoo } );
			equal( zoo.get( 'animals' ).length, 1, "Just 1 elephant in the zoo" );
			
			// should fail validation, so it shouldn't be added
			zoo.get( 'animals' ).add( { name: 'Big guy', species: 'elephant', weight: 13000 }, { validate: true } );

			equal( zoo.get( 'animals' ).length, 1, "Still just 1 elephant in the zoo" );
		});

		test( "Updating (retrieving) a model keeps relation consistency intact", function() {
			var zoo = new Zoo();

			var lion = new Animal({
				species: 'Lion',
				livesIn: zoo
			});

			equal( zoo.get( 'animals' ).length, 1 );

			lion.set({
				id: 5,
				species: 'Lion',
				livesIn: zoo
			});

			equal( zoo.get( 'animals' ).length, 1 );

			zoo.set({
				name: 'Dierenpark Amersfoort',
				animals: [ 5 ]
			});

			equal( zoo.get( 'animals' ).length, 1 );
			ok( zoo.get( 'animals' ).at( 0 ) === lion, "lion is in zoo" );
			ok( lion.get( 'livesIn' ) === zoo );

			var elephant = new Animal({
				species: 'Elephant',
				livesIn: zoo
			});

			equal( zoo.get( 'animals' ).length, 2 );
			ok( elephant.get( 'livesIn' ) === zoo );

			zoo.set({
				id: 2
			});

			equal( zoo.get( 'animals' ).length, 2 );
			ok( lion.get( 'livesIn' ) === zoo );
			ok( elephant.get( 'livesIn' ) === zoo );
		});

		test( "Setting id on objects with reverse relations updates related collection correctly", function() {
			var zoo1 = new Zoo({ id: 2 });

			ok( zoo1.get( 'animals' ).size() === 0, "zoo has no animals" );

			var lion = new Animal({ livesIn: 2 });

			ok( lion.get( 'livesIn' ) === zoo1, "zoo1 connected to lion" );
			ok( zoo1.get( 'animals' ).length === 1, "zoo1 has one Animal" );
			ok( zoo1.get( 'animals' ).at( 0 ) === lion, "lion added to zoo1" );
			ok( zoo1.get( 'animals' ).get( lion ) === lion, "lion can be retrieved from zoo1" );

			lion.set( { id: 5, livesIn: 2 } );

			ok( lion.get( 'livesIn' ) === zoo1, "zoo1 connected to lion" );
			ok( zoo1.get( 'animals' ).length === 1, "zoo1 has one Animal" );
			ok( zoo1.get( 'animals' ).at( 0 ) === lion, "lion added to zoo1" );
			ok( zoo1.get( 'animals' ).get( lion ) === lion, "lion can be retrieved from zoo1" );

			// Other way around
			var elephant = new Animal( { id: 6 } ),
				tiger = new Animal( { id: 7 } ),
				zoo2 = new Zoo( { animals: [ 6 ] } );

			ok( elephant.get( 'livesIn' ) === zoo2, "zoo2 connected to elephant" );
			ok( zoo2.get( 'animals' ).length === 1, "zoo2 has one Animal" );
			ok( zoo2.get( 'animals' ).at( 0 ) === elephant, "elephant added to zoo2" );
			ok( zoo2.get( 'animals' ).get( elephant ) === elephant, "elephant can be retrieved from zoo2" );

			zoo2.set( { id: 5, animals: [ 6, 7 ] } );

			ok( elephant.get( 'livesIn' ) === zoo2, "zoo2 connected to elephant" );
			ok( tiger.get( 'livesIn' ) === zoo2, "zoo2 connected to tiger" );
			ok( zoo2.get( 'animals' ).length === 2, "zoo2 has one Animal" );
			ok( zoo2.get( 'animals' ).at( 0 ) === elephant, "elephant added to zoo2" );
			ok( zoo2.get( 'animals' ).at( 1 ) === tiger, "tiger added to zoo2" );
			ok( zoo2.get( 'animals' ).get( elephant ) === elephant, "elephant can be retrieved from zoo2" );
			ok( zoo2.get( 'animals' ).get( tiger ) === tiger, "tiger can be retrieved from zoo2" );
		});

		test( "Collections can be passed as attributes on creation", function() {
			var animals = new AnimalCollection([
				{ id: 1, species: 'Lion' },
				{ id: 2 ,species: 'Zebra' }
			]);

			var zoo = new Zoo( { animals: animals } );

			equal( zoo.get( 'animals' ), animals, "The 'animals' collection has been set as the zoo's animals" );
			equal( zoo.get( 'animals' ).length, 2, "Two animals in 'zoo'" );

			zoo.destroy();

			var newZoo = new Zoo( { animals: animals.models } );

			ok( newZoo.get( 'animals' ).length === 2, "Two animals in the 'newZoo'" );
		});

		test( "Models can be passed as attributes on creation", function() {
			var artis = new Zoo( { name: 'Artis' } );

			var animal = new Animal( { species: 'Hippo', livesIn: artis });

			equal( artis.get( 'animals' ).at( 0 ), animal, "Artis has a Hippo" );
			equal( animal.get( 'livesIn' ), artis, "The Hippo is in Artis" );
		});

		test( "id checking handles `undefined`, `null`, `0` ids properly", function() {
			var parent = new Node();
			var child = new Node( { parent: parent } );

			ok( child.get( 'parent' ) === parent );
			parent.destroy();
			ok( child.get( 'parent' ) === null, child.get( 'parent' ) + ' === null' );

			// It used to be the case that `randomOtherNode` became `child`s parent here, since both the `parent.id`
			// (which is stored as the relation's `keyContents`) and `randomOtherNode.id` were undefined.
			var randomOtherNode = new Node();
			ok( child.get( 'parent' ) === null, child.get( 'parent' ) + ' === null' );

			// Create a child with parent id=0, then create the parent
			child = new Node( { parent: 0 } );
			ok( child.get( 'parent' ) === null, child.get( 'parent' ) + ' === null' );

			parent = new Node( { id: 0 } );
			ok( child.get( 'parent' ) === parent );

			child.destroy();
			parent.destroy();

			// The other way around; create the parent with id=0, then the child
			parent = new Node( { id: 0 } );
			equal( parent.get( 'children' ).length, 0 );

			child = new Node( { parent: 0 } );
			ok( child.get( 'parent' ) === parent );
		});

		test( "Repeated model initialization and a collection should not break existing models", function () {
			var dataCompanyA = {
				id: 'company-a',
				name: 'Big Corp.',
				employees: [ { id: 'job-a' }, { id: 'job-b' } ]
			};
			var dataCompanyB = {
				id: 'company-b',
				name: 'Small Corp.',
				employees: []
			};

			var companyA = new Company( dataCompanyA );

			// Attempting to instantiate another model with the same data will throw an error
			raises( function() { new Company( dataCompanyA ); }, "Can only instantiate one model for a given `id` (per model type)" );

			// init-ed a lead and its nested contacts are a collection
			ok( companyA.get('employees') instanceof Backbone.Collection, "Company's employees should be a collection" );
			equal(companyA.get('employees').length, 2, 'with elements');

			var companyCollection = new CompanyCollection( [ dataCompanyA, dataCompanyB ] );

			// After loading a collection with models of the same type
			// the existing company should still have correct collections
			ok( companyCollection.get( dataCompanyA.id ) === companyA );
			ok( companyA.get('employees') instanceof Backbone.Collection, "Company's employees should still be a collection" );
			equal( companyA.get('employees').length, 2, 'with elements' );
		});

		test( "Destroy removes models from (non-reverse) relations", function() {
			var agent = new Agent( { id: 1, customers: [ 2, 3, 4 ], address: { city: 'Utrecht' } } );

			var c2 = new Customer( { id: 2 } );
			var c3 = new Customer( { id: 3 } );
			var c4 = new Customer( { id: 4 } );

			ok( agent.get( 'customers' ).length === 3 );

			c2.destroy();

			ok( agent.get( 'customers' ).length === 2 );
			ok( agent.get( 'customers' ).get( c3 ) === c3 );
			ok( agent.get( 'customers' ).get( c4 ) === c4 );

			agent.get( 'customers' ).remove( c3 );

			ok( agent.get( 'customers' ).length === 1 );

			ok( agent.get( 'address' ) instanceof Address );

			agent.get( 'address' ).destroy();

			ok( !agent.get( 'address' ) );

			agent.destroy();

			equal( agent.get( 'customers' ).length, 0 );
		});

		test( "If keySource is used don't remove a model that is present in the key attribute", function() {
			var ForumPost = Backbone.RelationalModel.extend({
				// Normally would set something here, not needed for test
			});
			var ForumPostCollection = Backbone.Collection.extend({
			    model: ForumPost
			});
			var Forum = Backbone.RelationalModel.extend({
				relations: [{
					type: Backbone.HasMany,
					key: 'posts',
					relatedModel: ForumPost,
					collectionType: ForumPostCollection,
					reverseRelation: {
						key: 'forum',
						keySource: 'forum_id'
					}
				}]
			});
			var TestPost = new ForumPost({
				id: 1, 
				title: "Hello World",
				forum: {id: 1, title: "Cupcakes"}
			});

			var TestForum = Forum.findOrCreate(1);

			notEqual( TestPost.get('forum'), null, "The post's forum is not null" );
			equal( TestPost.get('forum').get('title'), "Cupcakes", "The post's forum title is Cupcakes" );
			equal( TestForum.get('title'), "Cupcakes", "A forum of id 1 has the title cupcakes" );
		});

		// GH-187
		test( "Can pass related model in constructor", function() {
			var A = Backbone.RelationalModel.extend();
			var B = Backbone.RelationalModel.extend({
				relations: [{
					type: Backbone.HasOne,
					key: 'a',
					keySource: 'a_id',
					relatedModel: A
				}]
			});

			var a1 = new A({ id: 'a1' });
			var b1 = new B();
			b1.set( 'a', a1 );
			ok( b1.get( 'a' ) instanceof A );
			ok( b1.get( 'a' ).id == 'a1' );

			var a2 = new A({ id: 'a2' });
			var b2 = new B({ a: a2 });
			ok( b2.get( 'a' ) instanceof A );
			ok( b2.get( 'a' ).id == 'a2' );
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

		test( "'set' triggers 'change' and 'update', on a HasOne relation, for a Model with multiple relations", 9, function() {
			// triggers initialization of the reverse relation from User to Password
			var password = new Password( { plaintext: 'asdf' } );
			
			person1.bind( 'change', function( model, options ) {
					ok( model.get( 'user' ) instanceof User, "In 'change', model.user is an instance of User" );
					equal( model.previous( 'user' ).get( 'login' ), oldLogin, "previousAttributes is available on 'change'" );
				});
			
			person1.bind( 'change:user', function( model, options ) {
					ok( model.get( 'user' ) instanceof User, "In 'change:user', model.user is an instance of User" );
					equal( model.previous( 'user' ).get( 'login' ), oldLogin, "previousAttributes is available on 'change'" );
				});
			
			person1.bind( 'change:user', function( model, attr, options ) {
					ok( model.get( 'user' ) instanceof User, "In 'change:user', model.user is an instance of User" );
					ok( attr.get( 'person' ) === person1, "The user's 'person' is 'person1'" );
					ok( attr.get( 'password' ) instanceof Password, "The user's password attribute is a model of type Password");
					equal( attr.get( 'password' ).get( 'plaintext' ), 'qwerty', "The user's password is ''qwerty'" );
				});
			
			var user = { login: 'me@hotmail.com', password: { plaintext: 'qwerty' } };
			var oldLogin = person1.get( 'user' ).get( 'login' );

			// Triggers assertions for 'change' and 'change:user'
			person1.set( { user: user } );
			
			user = person1.get( 'user' ).bind( 'change:password', function( model, attr, options ) {
				equal( attr.get( 'plaintext' ), 'asdf', "The user's password is ''qwerty'" );
			});
			
			// Triggers assertions for 'change:user'
			user.set( { password: password } );
		});

		test( "'set' doesn't triggers 'change' and 'change:' when passed `silent: true`", 2, function() {
			person1.bind( 'change', function( model, options ) {
				ok( false, "'change' should not get triggered" );
			});

			person1.bind( 'change:user', function( model, attr, options ) {
				ok( false, "'change:user' should not get triggered" );
			});

			person1.bind( 'change:user', function( model, attr, options ) {
				ok( false, "'change:user' should not get triggered" );
			});

			ok( person1.get( 'user' ) instanceof User, "person1 has a 'user'" );

			var user = new User({ login: 'me@hotmail.com', password: { plaintext: 'qwerty' } });
			person1.set( 'user', user, { silent: true } );

			equal( person1.get( 'user' ), user );
		});
		
		test( "'unset' triggers 'change' and 'change:<key>'", 4, function() {
			person1.bind( 'change', function( model, options ) {
					equal( model.get('user'), null, "model.user is unset" );
				});
			
			person1.bind( 'change:user', function( model, attr, options ) {
					equal( attr, null, "new value of attr (user) is null" );
				});
			
			ok( person1.get( 'user' ) instanceof User, "person1 has a 'user'" );
			
			var user = person1.get( 'user' );
			person1.unset( 'user' );
			
			equal( user.get( 'person' ), null, "person1 is not set on 'user' anymore" );
		});
		
		test( "'clear' triggers 'change' and 'change:<key>'", 4, function() {
			person1.bind( 'change', function( model, options ) {
				equal( model.get('user'), null, "model.user is unset" );
			});
			
			person1.bind( 'change:user', function( model, attr, options ) {
				equal( attr, null, "new value of attr (user) is null" );
			});
			
			ok( person1.get( 'user' ) instanceof User, "person1 has a 'user'" );
			
			var user = person1.get( 'user' );
			person1.clear();
			
			equal( user.get( 'person' ), null, "person1 is not set on 'user' anymore" );
		});


	module( "Backbone.HasMany", { setup: initObjects } );
	

		test( "Listeners on 'add'/'remove'", 7, function() {
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
			person1.bind( 'change:livesIn', function( model, attr ) {
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


		test( "Setting a new collection or array of ids updates the relation", function() {
			var zoo = new Zoo();

			var visitors = [
				{ name: 'Paul' }
			];

			zoo.set( 'visitors', visitors );

			equal( zoo.get( 'visitors' ).length, 1 );

			zoo.set( 'visitors', [] );

			equal( zoo.get( 'visitors' ).length, 0 );
		});

		test( "Setting a custom collection in 'collectionType' uses that collection for instantiation", function() {
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

		test( "Setting a new collection maintains that collection's current 'models'", function() {
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

		test( "Models found in 'findRelated' are all added in one go (so 'sort' will only be called once)", function() {
			var count = 0,
				sort = Backbone.Collection.prototype.sort;

			Backbone.Collection.prototype.sort = function() {
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

			Backbone.Collection.prototype.sort = sort;
			delete AnimalCollection.prototype.comparator;
		});

		test( "Raw-models set to a hasMany relation do trigger an add event in the underlying Collection with a correct index", function() {
			var zoo = new Zoo();

			var indexes = [];

			zoo.get("animals").on("add", function(model, collection, options) {
				var index = collection.indexOf(model);
				indexes.push(index);
			});

			zoo.set("animals", [
					{ id : 1, species : 'Lion' },
					{ id : 2, species : 'Zebra'}
			]);

			equal( indexes[0], 0, "First item has index 0" );
			equal( indexes[1], 1, "Second item has index 1" );
		});

		test( "Models set to a hasMany relation do trigger an add event in the underlying Collection with a correct index", function() {
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

		test( "The 'collectionKey' options is used to create references on generated Collections back to its RelationalModel", function() {
			var zoo = new Zoo({
				animals: [ 'lion-1', 'zebra-1' ]
			});

			equal( zoo.get( 'animals' ).livesIn, zoo );
			equal( zoo.get( 'animals' ).zoo, undefined );


			var FarmAnimal = Backbone.RelationalModel.extend();
			var Barn = Backbone.RelationalModel.extend({
				relations: [{
						type: Backbone.HasMany,
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

			FarmAnimal = Backbone.RelationalModel.extend();
			var BarnNoKey = Backbone.RelationalModel.extend({
				relations: [{
						type: Backbone.HasMany,
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

		test( "Handle edge-cases where the server supplies a single Object/id instead of an Array", function() {
			var zoo = new Zoo({
				animals: { id: 'lion-1' }
			});

			equal( zoo.get( 'animals' ).length, 1, "There is 1 animal in the zoo" );

			zoo.set( 'animals', { id: 'lion-2' } );

			equal( zoo.get( 'animals' ).length, 1, "There is 1 animal in the zoo" );
		});

		test( "Polymorhpic relations", function() {
			var Location = Backbone.RelationalModel.extend();

			var Locatable = Backbone.RelationalModel.extend({
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
		
		test( "Cloned instances of persisted models should not be added to any existing collections", function() {
			var addedModels = 0;
			
			var zoo = new window.Zoo({
				visitors : [ { name : "Incognito" } ]
			});
			
			var visitor = new window.Visitor({
				id : 0
			}); 
			
			zoo.get('visitors').bind( 'add', function( model, coll ) {
				addedModels++;
			});
			
			visitor.clone();
			
			equal( addedModels, 0, "A new visitor should not be forced to go to the zoo!" );
		});
		
		
	module( "Reverse relations", { setup: initObjects } );
	
	
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

		test( "Destroy removes models from reverse relations", function() {
			var zoo = new Zoo( { id:1, animals: [ 2, 3, 4 ] } );

			var rhino = new Animal( { id: 2, species: 'rhino' } );
			var baboon = new Animal( { id: 3, species: 'baboon' } );
			var hippo = new Animal( { id: 4, species: 'hippo' } );

			ok( zoo.get( 'animals' ).length === 3 );

			rhino.destroy();

			ok( zoo.get( 'animals' ).length === 2 );
			ok( zoo.get( 'animals' ).get( baboon ) === baboon );
			ok( !rhino.get( 'zoo' ) );

			zoo.get( 'animals' ).remove( hippo );

			ok( zoo.get( 'animals' ).length === 1 );
			ok( !hippo.get( 'zoo' ) );

			zoo.destroy();

			ok( zoo.get( 'animals' ).length === 0 );
			ok( !baboon.get( 'zoo' ) );
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

		test( "Models referencing each other in the same relation", function() {
			var parent = new Node({ id: 1 });
			var child = new Node({ id: 2 });

			child.set( 'parent', parent );
			parent.save( { 'parent': child } );

			ok( parent.get( 'parent' ) === child );
			ok( child.get( 'parent' ) === parent );
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
		
		test( "New objects (no 'id' yet) have working relations", function() {
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
		
		test( "'Save' objects (performing 'set' multiple times without and with id)", 4, function() {
			person3
				.bind( 'add:jobs', function( model, coll ) {
					var company = model.get('company');
					ok( company instanceof Company && company.get('ceo').get('name') === 'Lunar boy' && model.get('person') === person3,
						"add:jobs: Both Person and Company are set on the Job instance once the event gets fired" );
				})
				.bind( 'remove:jobs', function( model, coll ) {
					ok( false, "remove:jobs: 'person3' should not lose his job" );
				});
			
			// Create Models from an object. Should trigger `add:jobs`
			var company = new Company({
				name: 'Luna Corp.',
				ceo: {
					name: 'Lunar boy'
				},
				employees: [ { person: 'person-3' } ]
			});

			company
				.bind( 'add:employees', function( model, coll ) {
					var company = model.get('company');
					ok( company instanceof Company && company.get('ceo').get('name') === 'Lunar boy' && model.get('person') === person3,
						"add:employees: Both Person and Company are set on the Company instance once the event gets fired" );
				})
				.bind( 'remove:employees', function( model, coll ) {
					ok( true, "'remove:employees: person3' should lose a job once" );
				});
			
			// Backbone.save executes "model.set(model.parse(resp), options)". Set a full map over object, but now with ids.
			// Should trigger `remove:employees`, `add:employees`, and `add:jobs`
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

			// This should not trigger additional `add`/`remove` events
			company.set({
				employees: [ 'job-1' ]
			});
		});
		
		test( "Set the same value a couple of time, by 'id' and object", function() {
			person1.set( { likesALot: 'person-2' } );
			person1.set( { likesALot: person2 } );
			
			ok( person1.get('likesALot') === person2 );
			ok( person2.get('likedALotBy' ) === person1 );
			
			person1.set( { likesALot: 'person-2' } );
			
			ok( person1.get('likesALot') === person2 );
			ok( person2.get('likedALotBy' ) === person1 );
		});
		
		test( "Numerical keys", function() {
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
		
		test( "Relations that use refs to other models (instead of keys)", function() {
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
		
		test( "Add an already existing model (reverseRelation shouldn't exist yet) to a relation as a hash", function() {
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
		
		test( "Reverse relations are found for models that have not been instantiated and use .extend()", function() {
			var View = Backbone.RelationalModel.extend({ });
			var Property = Backbone.RelationalModel.extend({
				relations: [{
					type: Backbone.HasOne,
					key: 'view',
					relatedModel: View,
					reverseRelation: {
						type: Backbone.HasMany,
						key: 'properties'
					}
				}]
			});

			var view = new View({
				id: 1,
				properties: [ { id: 1, key: 'width', value: '300px' } ]
			});

			ok( view.get( 'properties' ) instanceof Backbone.Collection );
		});

		test( "Reverse relations found for models that have not been instantiated and run .setup() manually", function() {
			// Generated from CoffeeScript code:
			// 	 class View extends Backbone.RelationalModel
			// 	 
			// 	 View.setup()
			// 	 
			// 	 class Property extends Backbone.RelationalModel
			// 	   relations: [
			// 	     type: Backbone.HasOne
			// 	     key: 'view'
			// 	     relatedModel: View
			// 	     reverseRelation:
			// 	       type: Backbone.HasMany
			// 	       key: 'properties'
			// 	   ]
			// 	 
			// 	 Property.setup()
			
			var Property, View,
				__hasProp = {}.hasOwnProperty,
				__extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

			View = ( function( _super ) {
				__extends(View, _super);

				View.name = 'View';

				function View() {
					return View.__super__.constructor.apply( this, arguments );
				}

				return View;
			})( Backbone.RelationalModel );
			
			View.setup();

			Property = (function(_super) {
				__extends(Property, _super);

				Property.name = 'Property';

				function Property() {
					return Property.__super__.constructor.apply(this, arguments);
				}

				Property.prototype.relations = [{
					type: Backbone.HasOne,
					key: 'view',
					relatedModel: View,
					reverseRelation: {
					type: Backbone.HasMany,
						key: 'properties'
					}
				}];

				return Property;
			})(Backbone.RelationalModel);
			
			Property.setup();

			var view = new View({
				id: 1,
				properties: [ { id: 1, key: 'width', value: '300px' } ]
			});

			ok( view.get( 'properties' ) instanceof Backbone.Collection );
		});


		test( "ReverseRelations are applied retroactively", function() {
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

	test( "ReverseRelations are applied retroactively (2)", function() {
		var models = {};
		Backbone.Relational.store.addModelScope( models );

		// Use brand new Model types, so we can be sure we don't have any reverse relations cached from previous tests
		models.NewPerson = Backbone.RelationalModel.extend({
			relations: [{
				type: Backbone.HasOne,
				key: 'user',
				relatedModel: 'NewUser',
				reverseRelation: {
					type: Backbone.HasOne,
					key: 'person'
				}
			}]
		});
		models.NewUser = Backbone.RelationalModel.extend({});

		var user = new models.NewUser( { id: 'newuser-1', person: { id: 'newperson-1' } } );

		equal( user.getRelations().length, 1 );
		ok( user.get( 'person' ) instanceof models.NewPerson );
	});


	module( "Backbone.Collection", { setup: reset } );
	
	
		test( "Loading (fetching) multiple times updates the model, and relations's `keyContents`", function() {
			var collA = new Backbone.Collection();
			collA.model = User;
			var collB = new Backbone.Collection();
			collB.model = User;
			
			// Similar to what happens when calling 'fetch' on collA, updating it, calling 'fetch' on collB
			var name = 'User 1';
			collA.add( { id: '/user/1/', name: name } );
			var user = collA.at( 0 );
			equal( user.get( 'name' ), name );
			
			// The 'name' of 'user' is updated when adding a new hash to the collection
			name = 'New name';
			collA.add( { id: '/user/1/', name: name }, { merge: true } );
			var updatedUser = collA.at( 0 );
			equal( user.get( 'name' ), name );
			equal( updatedUser.get( 'name' ), name );
			
			// The 'name' of 'user' is also updated when adding a new hash to another collection
			name = 'Another new name';
			collB.add( { id: '/user/1/', name: name, title: 'Superuser' }, { merge: true } );
			var updatedUser2 = collA.at( 0 );
			equal( user.get( 'name' ), name );
			equal( updatedUser2.get('name'), name );

			//console.log( collA.models, collA.get( '/user/1/' ), user, updatedUser, updatedUser2 );
			ok( collA.get( '/user/1/' ) === updatedUser );
			ok( collA.get( '/user/1/' ) === updatedUser2 );
			ok( collB.get( '/user/1/' ) === user );
		});
		
		test( "Loading (fetching) a collection multiple times updates related models as well (HasOne)", function() {
			var coll = new PersonCollection();
			coll.add( { id: 'person-10', name: 'Person', user: { id: 'user-10', login: 'User' } } );

			var person = coll.at( 0 );
			var user = person.get( 'user' );

			equal( user.get( 'login' ), 'User' );

			coll.add( { id: 'person-10', name: 'New person', user: { id: 'user-10', login: 'New user' } }, { merge: true } );

			equal( person.get( 'name' ), 'New person' );
			equal( user.get( 'login' ), 'New user' );
		});
		
		test( "Loading (fetching) a collection multiple times updates related models as well (HasMany)", function() {
			var coll = new Backbone.Collection();
			coll.model = Zoo;

			// Create a 'zoo' with 1 animal in it
			coll.add( { id: 'zoo-1', name: 'Zoo', animals: [ { id: 'lion-1', name: 'Mufasa' } ] } );
			var zoo = coll.at( 0 );
			var lion = zoo.get( 'animals' ) .at( 0 );

			equal( lion.get( 'name' ), 'Mufasa' );

			// Update the name of 'zoo' and 'lion'
			coll.add( { id: 'zoo-1', name: 'Zoo Station', animals: [ { id: 'lion-1', name: 'Simba' } ] }, { merge: true } );

			equal( zoo.get( 'name' ), 'Zoo Station' );
			equal( lion.get( 'name' ), 'Simba' );
		});

		test( "add/remove/update (with `add`, `remove` and `merge` options)", function() {
			var coll = new AnimalCollection();

			/**
			 * Add
			 */
			coll.add( { id: 1, species: 'giraffe' } );

			ok( coll.length === 1 );

			coll.add( {	id: 1, species: 'giraffe' } );

			ok( coll.length === 1 );

			coll.add([
				{
					id: 1, species: 'giraffe'
				},
				{
					id: 2, species: 'gorilla'
				}
			]);

			var giraffe = coll.get( 1 ),
				gorilla = coll.get( 2 ),
				dolphin = new Animal( { species: 'dolphin' } ),
				hippo = new Animal( { id: 4, species: 'hippo' } );

			ok( coll.length === 2 );

			coll.add( dolphin );

			ok( coll.length === 3 );

			// Update won't do anything
			coll.add( {	id: 1, species: 'giraffe', name: 'Long John' } );

			ok( !coll.get( 1 ).get( 'name' ), 'name=' + coll.get( 1 ).get( 'name' ) );

			// Update with `merge: true` will update the animal
			coll.add( { id: 1, species: 'giraffe', name: 'Long John' }, { merge: true } );

			ok( coll.get( 1 ).get( 'name' ) === 'Long John' );

			/**
			 * Remove
			 */
			coll.remove( 1 );

			ok( coll.length === 2 );
			ok( !coll.get( 1 ), "`giraffe` removed from coll" );

			coll.remove( dolphin );

			ok( coll.length === 1 );
			ok( coll.get( 2 ) === gorilla, "Only `gorilla` is left in coll" );

			/**
			 * Update
			 */
			coll.add( giraffe );

			// This shouldn't do much at all
			var options = { add: false, merge: false, remove: false };
			coll.update( [ dolphin, { id: 2, name: 'Silverback' } ], options );

			ok( coll.length === 2 );
			ok( coll.get( 2 ) === gorilla, "`gorilla` is left in coll" );
			ok( !coll.get( 2 ).get( 'name' ), "`gorilla` name not updated" );

			// This should remove `giraffe`, add `hippo`, leave `dolphin`, and update `gorilla`.
			options = { add: true, merge: true, remove: true };
			coll.update( [ 4, dolphin, { id: 2, name: 'Silverback' } ], options );

			ok( coll.length === 3 );
			ok( !coll.get( 1 ), "`giraffe` removed from coll" );
			equal( coll.get( 2 ), gorilla );
			ok( !coll.get( 3 ) );
			equal( coll.get( 4 ), hippo );
			equal( coll.get( dolphin ), dolphin );
			equal( gorilla.get( 'name' ), 'Silverback' );
		});

		test( "add/remove/update on a relation (with `add`, `remove` and `merge` options)", function() {
			var zoo = new Zoo(),
				animals = zoo.get( 'animals' ),
				a = new Animal( { id: 'a' } ),
				b = new Animal( { id: 'b' } ),
				c = new Animal( { id: 'c' } );

			// The default is to call `Collection.update` without specifying options explicitly;
			// the defaults are { add: true, merge: true, remove: true }.
			zoo.set( 'animals', [ a ] );
			ok( animals.length == 1, 'animals.length=' + animals.length + ' == 1?' );

			zoo.set( 'animals', [ a, b ], { add: false, merge: true, remove: true } );
			ok( animals.length == 1, 'animals.length=' + animals.length + ' == 1?' );

			zoo.set( 'animals', [ b ], { add: false, merge: false, remove: true } );
			ok( animals.length == 0, 'animals.length=' + animals.length + ' == 0?' );

			zoo.set( 'animals', [ { id: 'a', species: 'a' } ], { add: false, merge: true, remove: false } );
			ok( animals.length == 0, 'animals.length=' + animals.length + ' == 0?' );
			ok( a.get( 'species' ) === 'a', "`a` not added, but attributes did get merged" );

			zoo.set( 'animals', [ { id: 'b', species: 'b' } ], { add: true, merge: false, remove: false } );
			ok( animals.length == 1, 'animals.length=' + animals.length + ' == 1?' );
			ok( !b.get( 'species' ), "`b` added, but attributes did not get merged" );

			zoo.set( 'animals', [ { id: 'c', species: 'c' } ], { add: true, merge: false, remove: true } );
			ok( animals.length == 1, 'animals.length=' + animals.length + ' == 1?' );
			ok( !animals.get( 'b' ), "b removed from animals" );
			ok( animals.get( 'c' ) === c, "c added to animals" );
			ok( !c.get( 'species' ), "`c` added, but attributes did not get merged" );

			zoo.set( 'animals', [ a, { id: 'b', species: 'b' } ] );
			ok( animals.length == 2, 'animals.length=' + animals.length + ' == 2?' );
			ok( b.get( 'species' ) === 'b', "`b` added, attributes got merged" );
			ok( !animals.get( 'c' ), "c removed from animals" );

			zoo.set( 'animals', [ { id: 'c', species: 'c' } ], { add: true, merge: true, remove: false } );
			ok( animals.length == 3, 'animals.length=' + animals.length + ' == 3?' );
			ok( c.get( 'species' ) === 'c', "`c` added, attributes got merged" );
		});


	module( "Events", { setup: reset } );

		test( "`add:`, `remove:` and `change:` events", function() {
			var zoo = new Zoo(),
				animal = new Animal();

			var addEventsTriggered = 0;
			var removeEventsTriggered = 0;
			var changeEventsTriggered = 0;

			zoo
//				.on( 'change:animals', function( model, coll ) {
//					console.log( 'change:animals; args=%o', arguments );
//				})
//				.on( 'change:animals', function( model, coll ) {
//					console.log( 'change:animals; args=%o', arguments );
//				})
				.bind( 'add:animals', function( model, coll ) {
					//console.log( 'add:animals; args=%o', arguments );
					addEventsTriggered++;
				})
				.bind( 'remove:animals', function( model, coll ) {
					//console.log( 'remove:animals; args=%o', arguments );
					removeEventsTriggered++;
				});

			animal
//				.on( 'change:livesIn', function( model, coll ) {
//					console.log( 'change:livesIn; args=%o', arguments );
//				})
				.bind( 'change:livesIn', function( model, coll ) {
					//console.log( 'change:livesIn; args=%o', arguments );
					changeEventsTriggered++;
				});

			// Should trigger `change:livesIn` and `add:animals`
			animal.set( 'livesIn', zoo );

			zoo.set( 'id', 'z1' );
			animal.set( 'id', 'a1' );

			ok( addEventsTriggered === 1 );
			ok( removeEventsTriggered === 0 );
			ok( changeEventsTriggered === 1 );

			// Doing this shouldn't trigger any `add`/`remove`/`update` events
			zoo.set( 'animals', [ 'a1' ] );

			ok( addEventsTriggered === 1 );
			ok( removeEventsTriggered === 0 );
			ok( changeEventsTriggered === 1 );

			// Doesn't cause an actual state change
			animal.set( 'livesIn', 'z1' );

			ok( addEventsTriggered === 1 );
			ok( removeEventsTriggered === 0 );
			ok( changeEventsTriggered === 1 );

			// Should trigger a `remove` on zoo and an `update` on animal
			animal.set( 'livesIn', { id: 'z2' } );

			ok( addEventsTriggered === 1 );
			ok( removeEventsTriggered === 1 );
			ok( changeEventsTriggered === 2 );
		});

		test( "No (`reset`) events when initializing a HasMany", function() {
			var eventsTriggered = 0;

			var PropertiesCollection = Backbone.Collection.extend({
				initialize: function() {
					this
						.on( 'add', function() {
							eventsTriggered++;
						})
						.on( 'reset', function() {
							eventsTriggered++;
						})
						.on( 'remove', function() {
							eventsTriggered++;
						});
				}
			});
			var Properties = Backbone.RelationalModel.extend({});
			var View = Backbone.RelationalModel.extend({
				relations: [
					{
						type: Backbone.HasMany,
						key: 'properties',
						relatedModel: Properties,
						collectionType: PropertiesCollection,
						reverseRelation: {
							type: Backbone.HasOne,
							key: 'view'
						}
					}
				]
			});

			var view = new View();

			ok( view.get( 'properties' ) instanceof PropertiesCollection );
			ok( eventsTriggered === 0 );
		});

		test( "Firing of `change` and `change:<key>` events", function() {
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

			ok( change === 0, 'no change event should fire' );
			ok( changeAnimals === 0, 'no change:animals event should fire' );
			ok( animalChange === 0, 'no animals:change event should fire' );

			// Add an `animal`
			change = changeAnimals = animalChange = 0;
			zoo.set( { animals: [ { id: 'a1' } ] } );

			ok( change === 1, 'change event should fire' );
			ok( changeAnimals === 1, 'change:animals event should fire' );
			ok( animalChange === 0, 'no animals:change event should fire' );

			// Change an animal
			change = changeAnimals = animalChange = 0;
			zoo.set( { animals: [ { id: 'a1', name: 'a1' } ] } );

			ok( change === 0, 'no change event should fire' );
			ok( changeAnimals === 0, 'no change:animals event should fire' );
			ok( animalChange === 1, 'animals:change event should fire' );

			// Only change the `zoo` itself
			change = changeAnimals = animalChange = 0;
			zoo.set( { name: 'Artis' } );

			ok( change === 1, 'change event should fire' );
			ok( changeAnimals === 0, 'no change:animals event should fire' );
			ok( animalChange === 0, 'no animals:change event should fire' );

			// Replace an `animal`
			change = changeAnimals = animalChange = 0;
			zoo.set( { animals: [ { id: 'a2' } ] } );

			ok( change === 1, 'change event should fire' );
			ok( changeAnimals === 1, 'change:animals event should fire' );
			ok( animalChange === 0, 'no animals:change event should fire' );

			// Remove an `animal`
			change = changeAnimals = animalChange = 0;
			zoo.set( { animals: [] } );

			ok( change === 1, 'change event should fire' );
			ok( changeAnimals === 1, 'change:animals event should fire' );
			ok( animalChange === 0, 'no animals:change event should fire' );

			// Operate directly on the HasMany collection
			var animals = zoo.get( 'animals' ),
				a1 = Animal.findOrCreate( 'a1', { create: false } ),
				a2 = Animal.findOrCreate( 'a2', { create: false } );

			ok( a1 instanceof Animal );
			ok( a2 instanceof Animal );

			// Add an animal
			change = changeAnimals = animalChange = 0;
			animals.add( 'a2' );

			ok( change === 0, 'change event not should fire' );
			ok( changeAnimals === 1, 'change:animals event should fire(??)' );
			ok( animalChange === 0, 'no animals:change event should fire' );

			// Update an animal directly
			change = changeAnimals = animalChange = 0;
			a2.set( 'name', 'a2' );

			ok( change === 0, 'no change event should fire' );
			ok( changeAnimals === 0, 'no change:animals event should fire' );
			ok( animalChange === 1, 'animals:change event should fire' );

			// Remove an animal directly
			change = changeAnimals = animalChange = 0;
			animals.remove( 'a2' );

			ok( change === 0, 'no change event should fire' );
			ok( changeAnimals === 1, 'change:animals event should fire(??)' );
			ok( animalChange === 0, 'no animals:change event should fire' );
		});

		test( "Does not trigger add / remove events for existing models on bulk assignment", function() {
			var house = new House({
				id: 'house-100',
				location: 'in the middle of the street',
				occupants: [ { id : 'person-5', jobs: [ { id : 'job-22' } ] }, { id : 'person-6' } ]
			});

			var eventsTriggered = 0;

			house
				.on( 'add:occupants', function(model) {
					ok( false, model.id + " should not be added" );
					eventsTriggered++;
				})
				.on( 'remove:occupants', function(model) {
					ok( false, model.id + " should not be removed" );
					eventsTriggered++;
				});

			house.get( 'occupants' ).at( 0 ).on( 'add:jobs', function( model ) {
				ok( false, model.id + " should not be added" );
				eventsTriggered++;
			});

			house.set( house.toJSON() );

			ok( eventsTriggered === 0, "No add / remove events were triggered" )
		});

		test( "triggers appropriate add / remove / change events on bulk assignment", function() {
			var house = new House({
				id: 'house-100',
				location: 'in the middle of the street',
				occupants: [ { id : 'person-5', nickname : 'Jane' }, { id : 'person-6' }, { id : 'person-8', nickname : 'Jon' } ]
			});

			var addEventsTriggered = 0;
			var removeEventsTriggered = 0;
			var changeEventsTriggered = 0;

			house
//				.bind( 'all', function(ev, model) {
//					console.log('all', ev, model);
//				})
				.on( 'add:occupants', function( model ) {
					ok( model.id === 'person-7', "Only person-7 should be added: " + model.id + " being added" );
					addEventsTriggered++;
				})
				.on( 'remove:occupants', function( model ) {
					ok( model.id === 'person-6', "Only person-6 should be removed: " + model.id + " being removed" );
					removeEventsTriggered++;
				});

			house.get( 'occupants' ).on( 'change:nickname', function( model ) {
				ok( model.id === 'person-8', "Only person-8 should have it's nickname updated: " + model.id + " nickname updated" );
				changeEventsTriggered++;
			});

			house.set( { occupants : [ { id : 'person-5', nickname : 'Jane'}, { id : 'person-7' }, { id : 'person-8', nickname : 'Phil' } ] } );

			ok( addEventsTriggered == 1, "Exactly one add event was triggered (triggered " + addEventsTriggered + " events)" );
			ok( removeEventsTriggered == 1, "Exactly one remove event was triggered (triggered " + removeEventsTriggered + " events)" );
			ok( changeEventsTriggered == 1, "Exactly one change event was triggered (triggered " + changeEventsTriggered + " events)" );
		});


	module( "Performance", { setup: reset } );


		test( "Creation and destruction", 0, function() {
			var relatedModelAddedCount = 0;

			Backbone.Relation.prototype._relatedModelAdded = function( model, coll, options ) {
				// Allow 'model' to set up its relations, before calling 'tryAddRelated'
				// (which can result in a call to 'addRelated' on a relation of 'model')
				var dit = this;
				model.queue( function() {
					dit.tryAddRelated( model, options );
				});
				relatedModelAddedCount++;
				//console.log( this, model, coll, options );
			};

			var relatedModelRemovedCount = 0;
			Backbone.Relation.prototype._relatedModelRemoved = function( model, coll, options ) {
				this.removeRelated( model, options );
				relatedModelRemovedCount++;
			};

			var Child = Backbone.RelationalModel.extend({
				url: '/child/'
			});

			var Parent = Backbone.RelationalModel.extend({
				relations: [{
					type: Backbone.HasMany,
					key: 'children',
					relatedModel: Child
				}]
			});

			var Parents = Backbone.Collection.extend({
				model: Parent
			});

			// bootstrap data
			var data = [];
			for ( var i = 1; i <= 300; i++ ) {
				data.push({
					name: 'parent-' + i,
					children: [
						{id: 'p-' + i + '-c1', name: 'child-1'},
						{id: 'p-' + i + '-c2', name: 'child-2'},
						{id: 'p-' + i + '-c3', name: 'child-3'}
					]
				});
			}

			// test 2 (run separetly)
			Backbone.Relational.store.reset();
			relatedModelAddedCount = 0;
			console.log('loading test 2...');
			var start = new Date();

			data.forEach(function (parent) {
				parent.children = parent.children.map(function (child) {
					return new Child(child);
				});
			});

			var parents = new Parents();
			parents.on('reset', function () {
				var end = new Date();
				var secs = (end - start) / 1000;
				console.log('data loaded in ' + secs + ', relatedModelAddedCount=' + relatedModelAddedCount );
			});
			parents.reset(data);

			var Child = Backbone.RelationalModel.extend({
				url: '/child/'
			});

			var Parent = Backbone.RelationalModel.extend({
				relations: [{
					type: Backbone.HasMany,
					key: 'children',
					relatedModel: Child,
					reverseRelation: {
						key: 'parent'
					}
				}]
			});

			var Parents = Backbone.Collection.extend({
				model: Parent
			});

			// test 1
			Backbone.Relational.store.reset();
			relatedModelAddedCount = 0;
			console.log('loading test 1...');
			var start = new Date();

			var parents = new Parents();
			parents.on('reset', function () {
				var end = new Date();
				var secs = (end - start) / 1000;
				console.log('data loaded in ' + secs + ', relatedModelAddedCount=' + relatedModelAddedCount );
			});
			parents.reset(data);

			// test 2 (run separetly)
			Backbone.Relational.store.reset();
			relatedModelAddedCount = 0;
			console.log('loading test 2...');
			var start = new Date();

			data.forEach(function (parent) {
				parent.children = parent.children.map(function (child) {
					return new Child(child);
				});
			});

			var parents = new Parents();
			parents.on('reset', function () {
				var end = new Date();
				var secs = (end - start) / 1000;
				console.log('data loaded in ' + secs + ', relatedModelAddedCount=' + relatedModelAddedCount );
			});
			parents.reset(data);

			var start = new Date();
			relatedModelRemovedCount = 0;

			parents.each( function( parent ) {
				parent.get( 'children' ).each( function( child ) {
					child.destroy();
				});
			});

			var end = new Date();
			var secs = (end - start) / 1000;
			console.log('data removed in ' + secs + ', relatedModelRemovedCount=' + relatedModelRemovedCount );

			// test 1
			Backbone.Relational.store.reset();
			relatedModelAddedCount = 0;
			console.log('loading test 1...');
			var start = new Date();

			var parents = new Parents();
			parents.on('reset', function () {
				var end = new Date();
				var secs = (end - start) / 1000;
				console.log('data loaded in ' + secs + ', relatedModelAddedCount=' + relatedModelAddedCount );
			});
			parents.reset(data);

			var start = new Date();
			relatedModelRemovedCount = 0;

			parents.remove( parents.models );

			var end = new Date();
			var secs = (end - start) / 1000;
			console.log('data removed in ' + secs + ', relatedModelRemovedCount=' + relatedModelRemovedCount );
		});
});

