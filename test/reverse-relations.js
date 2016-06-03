QUnit.module( "Reverse relations", { setup: require('./setup/data') } );

	QUnit.test( "Add and remove", function() {
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

	QUnit.test( "Destroy removes models from reverse relations", function() {
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

	QUnit.test( "HasOne relations to self (tree stucture)", function() {
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

	QUnit.test( "Models referencing each other in the same relation", function() {
		var parent = new Node({ id: 1 });
		var child = new Node({ id: 2 });

		child.set( 'parent', parent );
		parent.save( { 'parent': child } );

		ok( parent.get( 'parent' ) === child );
		ok( child.get( 'parent' ) === parent );
	});

	QUnit.test( "HasMany relations to self (tree structure)", function() {
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

	QUnit.test( "HasOne relations to self (cycle, directed graph structure)", function() {
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

	QUnit.test( "New objects (no 'id' yet) have working relations", function() {
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

	QUnit.test( "'Save' objects (performing 'set' multiple times without and with id)", 4, function() {
		person3
			.on( 'add:jobs', function( model, coll ) {
				console.log('got here 1');
				var company = model.get('company');
				ok( company instanceof Company && company.get('ceo').get('name') === 'Lunar boy' && model.get('person') === person3,
					"add:jobs: Both Person and Company are set on the Job instance once the event gets fired" );
			})
			.on( 'remove:jobs', function( model, coll ) {
				console.log('got here 2');
				ok( false, "remove:jobs: 'person3' should not lose his job" );
			});

		// Create Models from an object. Should trigger `add:jobs` on `person3`
		var company = new Company({
			name: 'Luna Corp.',
			ceo: {
				name: 'Lunar boy'
			},
			employees: [ { person: 'person-3' } ]
		});

		company
			.on( 'add:employees', function( model, coll ) {
				console.log('got here 3');
				var company = model.get('company');
				ok( company instanceof Company && company.get('ceo').get('name') === 'Lunar boy' && model.get('person') === person3,
					"add:employees: Both Person and Company are set on the Company instance once the event gets fired" );
			})
			.on( 'remove:employees', function( model, coll ) {
				console.log('got here 4');
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

	QUnit.test( "Set the same value a couple of time, by 'id' and object", function() {
		person1.set( { likesALot: 'person-2' } );
		person1.set( { likesALot: person2 } );

		ok( person1.get('likesALot') === person2 );
		ok( person2.get('likedALotBy' ) === person1 );

		person1.set( { likesALot: 'person-2' } );

		ok( person1.get('likesALot') === person2 );
		ok( person2.get('likedALotBy' ) === person1 );
	});

	QUnit.test( "Numerical keys", function() {
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

	QUnit.test( "Relations that use refs to other models (instead of keys)", function() {
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

	QUnit.test( "Add an already existing model (reverseRelation shouldn't exist yet) to a relation as a hash", function() {
		// This test caused a race condition to surface:
		// The 'relation's constructor initializes the 'reverseRelation', which called 'relation.addRelated' in it's 'initialize'.
		// However, 'relation's 'initialize' has not been executed yet, so it doesn't have a 'related' collection yet.
		var Properties = Backbone.Relational.Model.extend({});
		var View = Backbone.Relational.Model.extend({
			relations: [
				{
					type: Backbone.Relational.HasMany,
					key: 'properties',
					relatedModel: Properties,
					reverseRelation: {
						type: Backbone.Relational.HasOne,
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

	QUnit.test( "Reverse relations are found for models that have not been instantiated and use .extend()", function() {
		var View = Backbone.Relational.Model.extend({ });
		var Property = Backbone.Relational.Model.extend({
			relations: [{
				type: Backbone.Relational.HasOne,
				key: 'view',
				relatedModel: View,
				reverseRelation: {
					type: Backbone.Relational.HasMany,
					key: 'properties'
				}
			}]
		});

		var view = new View({
			id: 1,
			properties: [ { id: 1, key: 'width', value: '300px' } ]
		});

		ok( view.get( 'properties' ) instanceof Backbone.Relational.Collection );
	});

	QUnit.test( "Reverse relations found for models that have not been instantiated and run .setup() manually", function() {
		// Generated from CoffeeScript code:
		// 	 class View extends Backbone.Relational.Model
		//
		// 	 View.setup()
		//
		// 	 class Property extends Backbone.Relational.Model
		// 	   relations: [
		// 	     type: Backbone.Relational.HasOne
		// 	     key: 'view'
		// 	     relatedModel: View
		// 	     reverseRelation:
		// 	       type: Backbone.Relational.HasMany
		// 	       key: 'properties'
		// 	   ]
		//
		// 	 Property.setup()

		var Property, View,
			__hasProp = {}.hasOwnProperty,
			__extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

		View = ( function( _super ) {
			__extends(View, _super);

			function View() {
				return View.__super__.constructor.apply( this, arguments );
			}

			return View;
		})( Backbone.Relational.Model );

		View.setup();

		Property = (function(_super) {
			__extends(Property, _super);

			function Property() {
				return Property.__super__.constructor.apply(this, arguments);
			}

			Property.prototype.relations = [{
				type: Backbone.Relational.HasOne,
				key: 'view',
				relatedModel: View,
				reverseRelation: {
				type: Backbone.Relational.HasMany,
					key: 'properties'
				}
			}];

			return Property;
		})(Backbone.Relational.Model);

		Property.setup();

		var view = new View({
			id: 1,
			properties: [ { id: 1, key: 'width', value: '300px' } ]
		});

		ok( view.get( 'properties' ) instanceof Backbone.Relational.Collection );
	});

	QUnit.test( "ReverseRelations are applied retroactively", function() {
		// Use brand new Model types, so we can be sure we don't have any reverse relations cached from previous tests
		var NewUser = Backbone.Relational.Model.extend({});
		var NewPerson = Backbone.Relational.Model.extend({
			relations: [{
				type: Backbone.Relational.HasOne,
				key: 'user',
				relatedModel: NewUser,
				reverseRelation: {
					type: Backbone.Relational.HasOne,
					key: 'person'
				}
			}]
		});

		var user = new NewUser( { id: 'newuser-1' } );
		//var user2 = new NewUser( { id: 'newuser-2', person: 'newperson-1' } );
		var person = new NewPerson( { id: 'newperson-1', user: user } );

		ok( person.get('user') === user );
		ok( user.get('person') === person );
		//console.log( person, user );
	});

	QUnit.test( "ReverseRelations are applied retroactively (2)", function() {
		var models = {};
		Backbone.Relational.store.addModelScope( models );

		// Use brand new Model types, so we can be sure we don't have any reverse relations cached from previous tests
		models.NewPerson = Backbone.Relational.Model.extend({
			relations: [{
				type: Backbone.Relational.HasOne,
				key: 'user',
				relatedModel: 'NewUser',
				reverseRelation: {
					type: Backbone.Relational.HasOne,
					key: 'person'
				}
			}]
		});
		models.NewUser = Backbone.Relational.Model.extend({});

		var user = new models.NewUser( { id: 'newuser-1', person: { id: 'newperson-1' } } );

		equal( user.getRelations().length, 1 );
		ok( user.get( 'person' ) instanceof models.NewPerson );
	});

	QUnit.test( "Deep reverse relation starting from a collection", function() {
		var nodes = new NodeList([
			{
				id: 1,
				children: [
					{
						id: 2,
						children: [
							{
								id: 3,
								children: [ 1 ]
							}
						]
					}
				]
			}
		]);

		var parent = nodes.first();
		ok( parent, 'first item accessible after resetting collection' );

		ok( parent.collection === nodes, '`parent.collection` is set to `nodes`' );

		var child = parent.get( 'children' ).first();
		ok( child, '`child` can be retrieved from `parent`' );
		ok( child.get( 'parent' ), 'reverse relation from `child` to `parent` works');

		var grandchild = child.get( 'children' ).first();
		ok( grandchild, '`grandchild` can be retrieved from `child`' );

		ok( grandchild.get( 'parent' ), 'reverse relation from `grandchild` to `child` works');

		ok( grandchild.get( 'children' ).first() === parent, 'reverse relation from `grandchild` to `parent` works');
		ok( parent.get( 'parent' ) === grandchild, 'circular reference from `grandchild` to `parent` works' );
	});

	QUnit.test( "Deep reverse relation starting from a collection, with existing model", function() {
		new Node( { id: 1 } );

		var nodes = new NodeList();
		nodes.set([
			{
				id: 1,
				children: [
					{
						id: 2,
						children: [
							{
								id: 3,
								children: [ 1 ]
							}
						]
					}
				]
			}
		]);

		var parent = nodes.first();
		ok( parent && parent.id === 1, 'first item accessible after resetting collection' );

		var child = parent.get( 'children' ).first();
		ok( child, '`child` can be retrieved from `parent`' );
		ok( child.get( 'parent' ), 'reverse relation from `child` to `parent` works');

		var grandchild = child.get( 'children' ).first();
		ok( grandchild, '`grandchild` can be retrieved from `child`' );

		ok( grandchild.get( 'parent' ), 'reverse relation from `grandchild` to `child` works');

		ok( grandchild.get( 'children' ).first() === parent, 'reverse relation from `grandchild` to `parent` works');
		ok( parent.get( 'parent' ) === grandchild, 'circular reference from `grandchild` to `parent` works' );
	});
