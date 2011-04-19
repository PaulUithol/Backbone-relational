# Backbone-relational
Backbone-relational provides one-to-one, one-to-many and many-to-one relations between models for [Backbone](https://github.com/documentcloud/backbone). To use relations, extend `Backbone.RelationalModel` (instead of the regular `Backbone.Model`) and define a property `relations`, containing an array of option objects. Each relation must define (as a minimum) the `type`, `key` and `relatedModel`. Available relation types are `Backbone.HasOne` and `Backbone.HasMany`.

* Bi-directional relations automatically notify related models of changes.
* Decide how relations are serialized using the `includeInJSON` option (just id, or the full set of attributes, in which case the relations of this object are in turn serialized as well).
* Convert nested objects in a model's attributes into Models when using the `createModels` option upon initialization.
* Bind events to a RelationalModel for addition/removal on HasMany relations ('add:&lt;key>' and 'remove:&lt;key>').

## Example:

	paul = new Person({
		id: 'person-1',
		name: 'Paul',
		user: { id: 'user-1', login: 'dude', email: 'me@gmail.com' }
	});
	
	ourHouse = new House({
		id: 'house-1',
		location: 'in the middle of the street',
		occupants: ['person-1']
	});
	
	paul.get('user').get('login'); // A User object is automatically created from the JSON; so 'login' returns 'dude'
	
	// a ref to 'ourHouse', which is automatically defined because of the bi-directional HasMany relation on House to Person
	paul.get('livesIn');
	
	paul.get('user').toJSON();
		/* result:
			{
				email: 'me@gmail.com',
				id: 'user-1',
				login: 'dude',
				person: {
					id: 'person-1',
					name: 'Paul',
					livesIn: {
						id: "house-1",	
						location: "in the middle of the street",
						occupants: ["person-1"] // not serialized because 'includeInJSON' is false
					},
					user: 'user-1' // not serialized because it is already in the JSON, so we won't create a loop
				}
			}
		*/
	
	// New events to listen to additions/removals on the 'occupants' collection
	ourHouse.bind( 'add:occupants', function( model, coll ) {
			// create a View?
			console.debug( 'add %o', model );
		});
	ourHouse.bind( 'remove:occupants', function( model, coll ) {
			// destroy a View?
			console.debug( 'remove %o', model );
		});
	
	paul.bind( 'change:livesIn', function( model, attr ) {
			console.debug( 'change to %o', attr );
		});
	
	// Make paul homeless; triggers 'remove:occupants' on ourHouse, and 'change:livesIn' on paul
	ourHouse.get('occupants').remove( paul.id ); 
	
	paul.get('livesIn'); // yup; nothing.
	
	// Move back in; triggers 'add:occupants' on ourHouse, and 'change:livesIn' on paul
	paul.set( { 'livesIn': 'house-1' } );


This is achieved using the following relations and models:


	House = Backbone.RelationalModel.extend({
		// The 'relations' property, on the House's prototype. Initialized separately for each instance of House.
		// Each relation must define (as a minimum) the 'type', 'key' and 'relatedModel'. Options are
		// 'includeInJSON', 'createModels' and 'reverseRelation', which takes the same options as the relation itself.
		relations: [
			{
				type: Backbone.HasMany, // Use the type, or the string 'HasOne' or 'HasMany'.
				key: 'occupants',
				relatedModel: 'Person',
				includeInJSON: false,
				reverseRelation: {
					key: 'livesIn'
				}
			}
		]
	});
	
	Person = Backbone.RelationalModel.extend({
		relations: [
			{ // Create a (recursive) one-to-one relationship
				type: Backbone.HasOne,
				key: 'user',
				relatedModel: 'User',
				reverseRelation: {
					type: Backbone.HasOne,
					key: 'person'
				}
			}
		],
		
		initialize: function() {
			// do whatever you want :)
		}
	});
	
	User = Backbone.RelationalModel.extend();

## Relation types

### HasOne relations (`Backbone.HasOne`)

A HasOne relation consists of a single `Backbone.RelationalModel`, which is assigned to the given `key`. The default `reverseRelation.type` for a HasOne relation is HasMany. This can be configured to be `HasOne` instead, to create one-to-one relations.

### HasMany relations (`Backbone.HasMany`)

A HasMany relation consists of a `Backbone.Collection` of `Backbone.RelationalModel`s, which is assigned to the given `key`. The default `reverseRelation.type` for a HasMany relation is HasOne; this is the only option here, since many-to-many is not supported directly.

### Many-to-many relations (using two `Backbone.HasMany` relations)
A many-to-many relation can be modeled using two HasMany relations:

	Person = Backbone.RelationalModel.extend({
		relations: [
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
	
	// A link object between 'Person' and 'Company', to achieve many-to-many relations.
	Tenure = Backbone.RelationalModel.extend({
		defaults: {
			'startDate': null,
			'endDate': null
		}
	})
	
	Company = Backbone.RelationalModel.extend({
		relations: [
			{
				type: 'HasMany',
				key: 'employees',
				relatedModel: 'Tenure',
				reverseRelation: {
					key: 'company'
				}
			}
		]
	});
	
	niceCompany = new Company( { name: 'niceCompany' } );
	niceCompany.bind( 'add:employees', function( model, coll ) {
			// Will see a Tenure with attributes { person: paul, company: niceCompany } being added here
		});
	
	paul.get('jobs').add( { company: niceCompany } );

## Under the hood

Each `Backbone.RelationalModel` registers itself with `Backbone.Store` upon creation (and removes itself from the `Store` when destroyed). When creating or updating an attribute that is a key in a relation, removed related objects are notified of their removal, and new related objects are looked up in the `Store`.