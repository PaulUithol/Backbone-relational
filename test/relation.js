QUnit.module( "Backbone.Relation options", { setup: require('./setup/data') } );

	QUnit.test( "`includeInJSON` (Person to JSON)", function() {
		var json = person1.toJSON();
		equal( json.user_id, 'user-1', "The value of 'user_id' is the user's id (not an object, since 'includeInJSON' is set to the idAttribute)" );
		ok ( json.likesALot instanceof Object, "The value of 'likesALot' is an object ('includeInJSON' is 'true')" );
		equal( json.likesALot.likesALot, 'person-1', "Person is serialized only once" );

		json = person1.get( 'user' ).toJSON();
		equal( json.person, 'boy', "The value of 'person' is the person's name (`includeInJSON` is set to 'name')" );

		json = person2.toJSON();
		ok( person2.get('livesIn') instanceof House, "'person2' has a 'livesIn' relation" );
		equal( json.livesIn, undefined , "The value of 'livesIn' is not serialized (`includeInJSON` is 'false')" );

		json = person3.toJSON();
		ok( json.user_id === null, "The value of 'user_id' is null");
		ok( json.likesALot === null, "The value of 'likesALot' is null");
	});

	QUnit.test( "`includeInJSON` (Zoo to JSON)", function() {
		var zoo = new Zoo({
			id: 0,
			name: 'Artis',
			city: 'Amsterdam',
			animals: [
				new Animal( { id: 1, species: 'bear', name: 'Baloo' } ),
				new Animal( { id: 2, species: 'tiger', name: 'Shere Khan' } )
			]
		});

		var jsonZoo = zoo.toJSON(),
			jsonBear = jsonZoo.animals[ 0 ];

		ok( _.isArray( jsonZoo.animals ), "animals is an Array" );
		equal( jsonZoo.animals.length, 2 );
		equal( jsonBear.id, 1, "animal's id has been included in the JSON" );
		equal( jsonBear.species, 'bear', "animal's species has been included in the JSON" );
		ok( !jsonBear.name, "animal's name has not been included in the JSON" );

		var tiger = zoo.get( 'animals' ).get( 1 ),
			jsonTiger = tiger.toJSON();

		ok( _.isObject( jsonTiger.livesIn ) && !_.isArray( jsonTiger.livesIn ), "zoo is an Object" );
		equal( jsonTiger.livesIn.id, 0, "zoo.id is included in the JSON" );
		equal( jsonTiger.livesIn.name, 'Artis', "zoo.name is included in the JSON" );
		ok( !jsonTiger.livesIn.city, "zoo.city is not included in the JSON" );
	});

	QUnit.test( "'createModels' is false", function() {
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

	QUnit.test( "Relations load from both `keySource` and `key`", function() {
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

	QUnit.test( "`keySource` is emptied after a set, doesn't get confused by `unset`", function() {
		var SubModel = Backbone.RelationalModel.extend();

		var Model = Backbone.RelationalModel.extend({
			relations: [{
				type: Backbone.HasOne,
				key: 'submodel',
				keySource: 'sub_data',
				relatedModel: SubModel
			}]
		});

		var inst = new Model( {'id': 123} );

		// `set` may be called from fetch
		inst.set({
			'id': 123,
			'some_field': 'some_value',
			'sub_data': {
				'id': 321,
				'key': 'value'
			},
			'to_unset': 'unset value'
		});

		ok( inst.get('submodel').get('key') === 'value', "value of submodule.key should be 'value'" );
		inst.set( { 'to_unset': '' }, { 'unset': true } );
		ok( inst.get('submodel').get('key') === 'value', "after unset value of submodule.key should be still 'value'" );

		ok( typeof inst.get('sub_data') === 'undefined', "keySource field should be removed from model" );
		ok( typeof inst.get('submodel') !== 'undefined', "key field should be added..." );
		ok( inst.get('submodel') instanceof SubModel, "... and should be model instance" );

		// set called from fetch
		inst.set({
			'sub_data': {
				'id': 321,
				'key': 'value2'
			}
		});

		ok( typeof inst.get('sub_data') === 'undefined',  "keySource field should be removed from model" );
		ok( typeof inst.get('submodel') !== 'undefined',  "key field should be present..." );
		ok( inst.get('submodel').get('key') === 'value2', "... and should be updated" );
	});

	QUnit.test( "'keyDestination' saves to 'key'", function() {
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

	QUnit.test( "'collectionOptions' sets the options on the created HasMany Collections", function() {
		var shop = new Shop({ id: 1 });
		equal( shop.get( 'customers' ).url, 'shop/' + shop.id + '/customers/' );
	});

	QUnit.test( "`parse` with deeply nested relations", function() {
		var collParseCalled = 0,
			modelParseCalled = 0;

		var Job = Backbone.RelationalModel.extend({});

		var JobCollection = Backbone.Collection.extend({
			model: Job,

			parse: function( resp, options ) {
				collParseCalled++;
				return resp.data || resp;
			}
		});

		var Company = Backbone.RelationalModel.extend({
			relations: [{
				type: 'HasMany',
				key: 'employees',
				parse: true,
				relatedModel: Job,
				collectionType: JobCollection,
				reverseRelation: {
					key: 'company'
				}
			}]
		});

		var Person = Backbone.RelationalModel.extend({
			relations: [{
				type: 'HasMany',
				key: 'jobs',
				parse: true,
				relatedModel: Job,
				collectionType: JobCollection,
				reverseRelation: {
					key: 'person',
					parse: false
				}
			}],

			parse: function( resp, options ) {
				modelParseCalled++;
				var data = _.clone( resp.model );
				data.id = data.id.uri;
				return data;
			}
		});

		Company.prototype.parse = Job.prototype.parse = function( resp, options ) {
			modelParseCalled++;
			var data = _.clone( resp.model );
			data.id = data.id.uri;
			return data;
		};

		var data = {
			model: {
				id: { uri: 'c1' },
				employees: [
					{
						model: {
							id: { uri: 'e1' },
							person: {
								/*model: {
									id: { uri: 'p1' },
									jobs: [ 'e1', { model: { id: { uri: 'e3' } } } ]
								}*/
								id: 'p1',
								jobs: [ 'e1', { model: { id: { uri: 'e3' } } } ]
							}
						}
					},
					{
						model: {
							id: { uri: 'e2' },
							person: {
								id: 'p2'
								/*model: {
									id: { uri: 'p2' }
								}*/
							}
						}
					}
				]
			}
		};

		var company = new Company( data, { parse: true } ),
			employees = company.get( 'employees' ),
			job = employees.first(),
			person = job.get( 'person' );

		ok( job && job.id === 'e1', 'job exists' );
		ok( person && person.id === 'p1', 'person exists' );

		ok( modelParseCalled === 4, 'model.parse called 4 times? ' + modelParseCalled );
		ok( collParseCalled === 0, 'coll.parse called 0 times? ' + collParseCalled );
	});

QUnit.module( "Backbone.Relation preconditions", { setup: require('./setup/setup').reset } );


	QUnit.test( "'type', 'key', 'relatedModel' are required properties", function() {
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
		ok( _.size( view._relations ) === 0 );
		ok( view.getRelations().length === 0 );

		View = Backbone.RelationalModel.extend({
			relations: [
				{
					type: Backbone.HasOne,
					relatedModel: Properties
				}
			]
		});

		view = new View();
		ok( _.size( view._relations ) === 0 );

		View = Backbone.RelationalModel.extend({
			relations: [
				{
					type: Backbone.HasOne,
					key: 'parentView'
				}
			]
		});

		view = new View();
		ok( _.size( view._relations ) === 1 );
		ok( view.getRelation( 'parentView' ).relatedModel === View, "No 'relatedModel' makes it self-referential" );
	});

	QUnit.test( "'type' can be a string or an object reference", function() {
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
		ok( _.size( view._relations ) === 1 );

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
		ok( _.size( view._relations ) === 1 );

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
		ok( _.size( view._relations ) === 1 );
	});

	QUnit.test( "'key' can be a string or an object reference", function() {
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
		ok( _.size( view._relations ) === 1 );

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
		ok( _.size( view._relations ) === 1 );
	});

	QUnit.test( "HasMany with a reverseRelation HasMany is not allowed", function() {
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

		ok( _.size( password._relations ) === 0, "No _relations created on Password" );
	});

	QUnit.test( "Duplicate relations not allowed (two simple relations)", function() {
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
		ok( _.size( view._relations ) === 1 );
	});

	QUnit.test( "Duplicate relations not allowed (one relation with a reverse relation, one without)", function() {
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
		ok( _.size( view._relations ) === 1 );
	});

	QUnit.test( "Duplicate relations not allowed (two relations with reverse relations)", function() {
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
		ok( _.size( view._relations ) === 1 );
	});

	QUnit.test( "Duplicate relations not allowed (different relations, reverse relations)", function() {
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

		var view = new View(),
			prop1 = new Properties( { name: 'a' } ),
			prop2 = new Properties( { name: 'b' } );

		view.set( { listProperties: prop1, windowProperties: prop2 } );

		ok( _.size( view._relations ) === 2 );
		ok( _.size( prop1._relations ) === 1 );
		ok( view.get( 'listProperties' ).get( 'name' ) === 'a' );
		ok( view.get( 'windowProperties' ).get( 'name' ) === 'b' );
	});

QUnit.module( "Backbone.Relation general", { setup: require('./setup/setup').reset } );


	QUnit.test( "Only valid models (no validation failure) should be added to a relation", function() {
		var zoo = new Zoo();

		zoo.on( 'add:animals', function( animal ) {
			ok( animal instanceof Animal );
		});

		var smallElephant = new Animal( { name: 'Jumbo', species: 'elephant', weight: 2000, livesIn: zoo } );
		equal( zoo.get( 'animals' ).length, 1, "Just 1 elephant in the zoo" );

		// should fail validation, so it shouldn't be added
		zoo.get( 'animals' ).add( { name: 'Big guy', species: 'elephant', weight: 13000 }, { validate: true } );

		equal( zoo.get( 'animals' ).length, 1, "Still just 1 elephant in the zoo" );
	});

	QUnit.test( "Updating (retrieving) a model keeps relation consistency intact", function() {
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

	QUnit.test( "Setting id on objects with reverse relations updates related collection correctly", function() {
		var zoo1 = new Zoo();

		ok( zoo1.get( 'animals' ).size() === 0, "zoo has no animals" );

		var lion = new Animal( { livesIn: 2 } );
		zoo1.set( 'id', 2 );

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

	QUnit.test( "Collections can be passed as attributes on creation", function() {
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

	QUnit.test( "Models can be passed as attributes on creation", function() {
		var artis = new Zoo( { name: 'Artis' } );

		var animal = new Animal( { species: 'Hippo', livesIn: artis });

		equal( artis.get( 'animals' ).at( 0 ), animal, "Artis has a Hippo" );
		equal( animal.get( 'livesIn' ), artis, "The Hippo is in Artis" );
	});

	QUnit.test( "id checking handles `undefined`, `null`, `0` ids properly", function() {
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

	QUnit.test( "Relations are not affected by `silent: true`", function() {
		var ceo = new Person( { id: 1 } );
		var company = new Company( {
				employees: [ { id: 2 }, { id: 3 }, 4 ],
				ceo: 1
			}, { silent: true } ),
			employees = company.get( 'employees' ),
			employee = employees.first();

		ok( company.get( 'ceo' ) === ceo );
		ok( employees instanceof Backbone.Collection );
		equal( employees.length, 2 );

		employee.set( 'company', null, { silent: true } );
		equal( employees.length, 1 );

		employees.add( employee, { silent: true } );
		ok( employee.get( 'company' ) === company );

		ceo.set( 'runs', null, { silent: true } );
		ok( !company.get( 'ceo' ) );

		var employee4 = new Job( { id: 4 } );
		equal( employees.length, 3 );
	});

	QUnit.test( "Repeated model initialization and a collection should not break existing models", function () {
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
		throws( function() { new Company( dataCompanyA ); }, "Can only instantiate one model for a given `id` (per model type)" );

		// init-ed a lead and its nested contacts are a collection
		ok( companyA.get('employees') instanceof Backbone.Collection, "Company's employees should be a collection" );
		equal(companyA.get('employees').length, 2, 'with elements');

		var CompanyCollection = Backbone.Collection.extend({
			model: Company
		});
		var companyCollection = new CompanyCollection( [ dataCompanyA, dataCompanyB ] );

		// After loading a collection with models of the same type
		// the existing company should still have correct collections
		ok( companyCollection.get( dataCompanyA.id ) === companyA );
		ok( companyA.get('employees') instanceof Backbone.Collection, "Company's employees should still be a collection" );
		equal( companyA.get('employees').length, 2, 'with elements' );
	});

	QUnit.test( "Destroy removes models from (non-reverse) relations", function() {
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

	QUnit.test( "If keySource is used, don't remove a model that is present in the key attribute", function() {
		var ForumPost = Backbone.RelationalModel.extend({
			// Normally would set something here, not needed for test
		});
		var Forum = Backbone.RelationalModel.extend({
			relations: [{
				type: Backbone.HasMany,
				key: 'posts',
				relatedModel: ForumPost,
				reverseRelation: {
					key: 'forum',
					keySource: 'forum_id'
				}
			}]
		});

		var testPost = new ForumPost({
			id: 1,
			title: 'Hello World',
			forum: { id: 1, title: 'Cupcakes' }
		});

		var testForum = Forum.findOrCreate( 1 );

		notEqual( testPost.get( 'forum' ), null, "The post's forum is not null" );
		equal( testPost.get( 'forum' ).get( 'title' ), "Cupcakes", "The post's forum title is Cupcakes" );
		equal( testForum.get( 'title' ), "Cupcakes", "A forum of id 1 has the title cupcakes" );

		var testPost2 = new ForumPost({
			id: 3,
			title: 'Hello World',
			forum: { id: 2, title: 'Donuts' },
			forum_id: 3
		});

		notEqual( testPost2.get( 'forum' ), null, "The post's forum is not null" );
		equal( testPost2.get( 'forum' ).get( 'title' ), "Donuts", "The post's forum title is Donuts" );
		deepEqual( testPost2.getRelation( 'forum' ).keyContents, { id: 2, title: 'Donuts' }, 'The expected forum is 2' );
		equal( testPost2.getRelation( 'forum' ).keyId, null, "There's no expected forum anymore" );

		var testPost3 = new ForumPost({
			id: 4,
			title: 'Hello World',
			forum: null,
			forum_id: 3
		});

		equal( testPost3.get( 'forum' ), null, "The post's forum is null" );
		equal( testPost3.getRelation( 'forum' ).keyId, 3, 'Forum is expected to have id=3' );
	});

	// GH-187
	QUnit.test( "Can pass related model in constructor", function() {
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
		ok( b1.get( 'a' ).id === 'a1' );

		var a2 = new A({ id: 'a2' });
		var b2 = new B({ a: a2 });
		ok( b2.get( 'a' ) instanceof A );
		ok( b2.get( 'a' ).id === 'a2' );
	});
