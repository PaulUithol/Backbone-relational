QUnit.module( "Backbone.Relational.Collection", { setup: require('./setup/setup').reset } );

	QUnit.test( "Loading (fetching) multiple times updates the model, and relations's `keyContents`", function() {
		var collA = new Backbone.Relational.Collection();
		collA.model = User;
		var collB = new Backbone.Relational.Collection();
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

	QUnit.test( "Loading (fetching) a collection multiple times updates related models as well (HasOne)", function() {
		var coll = new PersonCollection();
		coll.add( { id: 'person-10', name: 'Person', user: { id: 'user-10', login: 'User' } } );

		var person = coll.at( 0 );
		var user = person.get( 'user' );

		equal( user.get( 'login' ), 'User' );

		coll.add( { id: 'person-10', name: 'New person', user: { id: 'user-10', login: 'New user' } }, { merge: true } );

		equal( person.get( 'name' ), 'New person' );
		equal( user.get( 'login' ), 'New user' );
	});

	QUnit.test( "Loading (fetching) a collection multiple times updates related models as well (HasMany)", function() {
		var coll = new Backbone.Relational.Collection();
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

	QUnit.test( "reset should use `merge: true` by default", function() {
		var nodeList = new NodeList();

		nodeList.add( [ { id: 1 }, { id: 2, parent: 1 } ] );

		var node1 = nodeList.get( 1 ),
			node2 = nodeList.get( 2 );

		ok( node2.get( 'parent' ) === node1 );
		ok( !node1.get( 'parent' ) );

		nodeList.reset( [ { id: 1, parent: 2 } ] );

		ok( node1.get( 'parent' ) === node2 );
	});

	QUnit.test( "Return values for add/remove/reset/set match plain Backbone's", function() {
		var Car = Backbone.Relational.Model.extend(),
			Cars = Backbone.Relational.Collection.extend( { model: Car } ),
			cars = new Cars();

		ok( cars.add( { name: 'A' } ) instanceof Car, "Add one model" );

		var added = cars.add( [ { name: 'B' }, { name: 'C' } ] );
		ok( _.isArray( added ), "Added (an array of) two models" );
		ok( added.length === 2 );

		ok( cars.remove( cars.at( 0 ) ) instanceof Car, "Remove one model" );
		var removed = cars.remove( [ cars.at( 0 ), cars.at( 1 ) ] );
		ok( _.isArray( removed ), "Remove (an array of) two models" );
		ok( removed.length === 2 );

		ok( cars.reset( { name: 'D' } ) instanceof Car, "Reset with one model" );
		var reset = cars.reset( [ { name: 'E' }, { name: 'F' } ] );
		ok( _.isArray( reset ), "Reset (an array of) two models" );
		ok( reset.length === 2 );
		ok( cars.length === 2 );

		var e = cars.at(0),
			f = cars.at(1);

		ok( cars.set( e ) instanceof Car, "Set one model" );
		ok( _.isArray( cars.set( [ e, f ] ) ), "Set (an array of) two models" );
		// Check removing `[]`
		var result = cars.remove( [] );
		ok( result === false, "Removing `[]` is a noop (results in 'false', no models removed)" );
		// ok( result.length === 0, "Removing `[]` is a noop (results in an empty array, no models removed)" );
		ok( cars.length === 2, "Still 2 cars" );

		// Check removing `null`
		result = cars.remove( null );
		ok( _.isUndefined( result ), "Removing `null` is a noop" );
		ok( cars.length === 2, "Still 2 cars" );

		// Check setting to `[]`
		result = cars.set( [] );
		ok( _.isArray( result ) && !result.length, "Set `[]` empties collection" );
		ok( cars.length === 0, "All cars gone" );

		cars.set( [ e, f ] );
		ok( cars.length === 2, "2 cars again" );

		// Check setting `null`
		// ok( _.isUndefined( cars.set( null ) ), "Set `null` empties collection" );
		ok( _.isUndefined( cars.set( null ) ), "Set `null` causes noop on collection" );
		// console.log( cars, cars.length );
		// ok( cars.length === 0, "All cars gone" );
		ok( cars.length === 2, "All cars still exist" );
	});

	QUnit.test( "add/remove/set (with `add`, `remove` and `merge` options)", function() {
		var coll = new AnimalCollection();

		/**
		 * Add
		 */
		coll.add( { id: '1', species: 'giraffe' } );

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
		coll.set( [ dolphin, { id: 2, name: 'Silverback' } ], options );

		ok( coll.length === 2 );
		ok( coll.get( 2 ) === gorilla, "`gorilla` is left in coll" );
		ok( !coll.get( 2 ).get( 'name' ), "`gorilla` name not updated" );

		// This should remove `giraffe`, add `hippo`, leave `dolphin`, and update `gorilla`.
		options = { add: true, merge: true, remove: true };
		coll.set( [ 4, dolphin, { id: 2, name: 'Silverback' } ], options );

		ok( coll.length === 3 );
		ok( !coll.get( 1 ), "`giraffe` removed from coll" );
		equal( coll.get( 2 ), gorilla );
		ok( !coll.get( 3 ) );
		equal( coll.get( 4 ), hippo );
		equal( coll.get( dolphin ), dolphin );
		equal( gorilla.get( 'name' ), 'Silverback' );
	});

	QUnit.test( "add/remove/set on a relation (with `add`, `remove` and `merge` options)", function() {
		var zoo = new Zoo(),
			animals = zoo.get( 'animals' ),
			a = new Animal( { id: 'a' } ),
			b = new Animal( { id: 'b' } ),
			c = new Animal( { id: 'c' } );

		// The default is to call `Collection.update` without specifying options explicitly;
		// the defaults are { add: true, merge: true, remove: true }.
		zoo.set( 'animals', [ a ] );
		ok( animals.length === 1, 'animals.length=' + animals.length + ' == 1?' );

		zoo.set( 'animals', [ a, b ], { add: false, merge: true, remove: true } );
		ok( animals.length === 1, 'animals.length=' + animals.length + ' == 1?' );

		zoo.set( 'animals', [ b ], { add: false, merge: false, remove: true } );
		ok( animals.length === 0, 'animals.length=' + animals.length + ' == 0?' );

		zoo.set( 'animals', [ { id: 'a', species: 'a' } ], { add: false, merge: true, remove: false } );
		ok( animals.length === 0, 'animals.length=' + animals.length + ' == 0?' );
		ok( a.get( 'species' ) === 'a', "`a` not added, but attributes did get merged" );

		zoo.set( 'animals', [ { id: 'b', species: 'b' } ], { add: true, merge: false, remove: false } );
		ok( animals.length === 1, 'animals.length=' + animals.length + ' == 1?' );
		ok( !b.get( 'species' ), "`b` added, but attributes did not get merged" );

		zoo.set( 'animals', [ { id: 'c', species: 'c' } ], { add: true, merge: false, remove: true } );
		ok( animals.length === 1, 'animals.length=' + animals.length + ' == 1?' );
		ok( !animals.get( 'b' ), "b removed from animals" );
		ok( animals.get( 'c' ) === c, "c added to animals" );
		ok( !c.get( 'species' ), "`c` added, but attributes did not get merged" );

		zoo.set( 'animals', [ a, { id: 'b', species: 'b' } ] );
		ok( animals.length === 2, 'animals.length=' + animals.length + ' == 2?' );
		ok( b.get( 'species' ) === 'b', "`b` added, attributes got merged" );
		ok( !animals.get( 'c' ), "c removed from animals" );

		zoo.set( 'animals', [ { id: 'c', species: 'c' } ], { add: true, merge: true, remove: false } );
		ok( animals.length === 3, 'animals.length=' + animals.length + ' == 3?' );
		ok( c.get( 'species' ) === 'c', "`c` added, attributes got merged" );
	});

	QUnit.test( "`merge` on a nested relation", function() {
		var zoo = new Zoo( { id: 1, animals: [ { id: 'a' } ] } ),
			animals = zoo.get( 'animals' ),
			a = animals.get( 'a' );

		ok( a.get( 'livesIn' ) === zoo, "`a` is in `zoo`" );

		// Pass a non-default option to a new model, with an existing nested model
		var zoo2 = new Zoo( { id: 2, animals: [ { id: 'a', species: 'a' } ] }, { merge: false } );

		ok( a.get( 'livesIn' ) === zoo2, "`a` is in `zoo2`" );
		ok( !a.get( 'species' ), "`a` hasn't gotten merged" );
	});

	QUnit.test( "pop", function() {
		var zoo = new Zoo({
				animals: [ { name: 'a' } ]
			}),
			animals = zoo.get( 'animals' );

		var a = animals.pop(),
			b = animals.pop();

		ok( a && a.get( 'name' ) === 'a' );
		ok( typeof b === 'undefined' );
	});

	QUnit.test( "Adding a new model doesn't `merge` it onto itself", function() {
		var TreeModel = Backbone.Relational.Model.extend({
			relations: [
				{
					key: 'parent',
					type: Backbone.Relational.HasOne
				}
			],

			initialize: function( options ) {
				if ( coll ) {
					coll.add( this );
				}
			}
		});

		var TreeCollection = Backbone.Relational.Collection.extend({
			model: TreeModel
		});

		// Using `set` to add a new model, since this is what would be called when `fetch`ing model(s)
		var coll = new TreeCollection(),
			model = coll.set( { id: 'm2', name: 'new model', parent: 'm1' } );

		ok( model instanceof TreeModel );
		ok( coll.size() === 1, "One model in coll" );

		equal( model.get( 'parent' ), null );
		equal( model.get( 'name' ), 'new model' );
		deepEqual( model.getIdsToFetch( 'parent' ), [ 'm1' ] );

		model = coll.set( { id: 'm2', name: 'updated model', parent: 'm1' } );
		equal( model.get( 'name' ), 'updated model' );
		deepEqual( model.getIdsToFetch( 'parent' ), [ 'm1' ] );
	});
