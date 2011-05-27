# Backbone-relational
Backbone-relational provides one-to-one, one-to-many and many-to-one relations between models for [Backbone](https://github.com/documentcloud/backbone). To use relations, extend `Backbone.RelationalModel` (instead of the regular `Backbone.Model`) and define a property `relations`, containing an array of option objects. Each relation must define (as a minimum) the `type`, `key` and `relatedModel`. Available relation types are `Backbone.HasOne` and `Backbone.HasMany`.

* Bi-directional relations automatically notify related models of changes.
* Decide how relations are serialized using the `includeInJSON` option (just id, or the full set of attributes, in which case the relations of this object are in turn serialized as well).
* Convert nested objects in a model's attributes into Models when using the `createModels` option upon initialization.
* Bind new events to a RelationalModel for:
	* addition/removal on HasMany relations (bind to `add:<key>` and `remove:<key>`; arguments=`(model, collection)`),
	* changes to the key itself on HasMany and HasOne relations (bind to `update:<key>`; arguments=`(model, attribute)`).


## Installation

Backbone-relational depends on [backbone.js](https://github.com/documentcloud/backbone) (and thus on [underscore.js](https://github.com/documentcloud/underscore)). **Please use a HEAD version of backbone.js (preferably [0.5.0](https://github.com/documentcloud/backbone/tree/0.5.0)), since the latest stable is quite old**.


## Example
```javascript
	paul = new Person({
		id: 'person-1',
		name: 'Paul',
		user: { id: 'user-1', login: 'dude', email: 'me@gmail.com' }
	});
	
	// A User object is automatically created from the JSON; so 'login' returns 'dude'.
	paul.get('user').get('login');
	
	ourHouse = new House({
		id: 'house-1',
		location: 'in the middle of the street',
		occupants: ['person-1']
	});
	
	// 'ourHouse.occupants' is turned into a Backbone.Collection of Persons.
	// The first person in 'ourHouse.occupants' will point to 'paul'.
	ourHouse.occupants.at(0); // === paul
	
	// the relation from 'House.occupants' to 'Person' has been defined as a bi-directional HasMany relation,
	// with a reverse relation to 'Person.livesIn'. So, 'paul.livesIn' will automatically point back to 'ourHouse'.
	paul.get('livesIn'); // === ourHouse
	
	
	// You can control which relations get serialized to JSON (when saving), using the 'includeInJSON'
	// property on a Relation. Also, each object will only get serialized once to prevent loops.
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
	
	
	// Use the 'add' and 'remove' events to listen for additions/removals on HasMany relations (like 'House.occupants').
	ourHouse.bind( 'add:occupants', function( model, coll ) {
			// create a View?
			console.debug( 'add %o', model );
		});
	ourHouse.bind( 'remove:occupants', function( model, coll ) {
			// destroy a View?
			console.debug( 'remove %o', model );
		});
	
	// Use the 'update' event to listen for changes on a HasOne relation (like 'Person.livesIn').
	paul.bind( 'update:livesIn', function( model, attr ) {
			console.debug( 'update to %o', attr );
		});
	
	
	// Modifying either side of a bi-directional relation updates the other side automatically.
	// Make paul homeless; triggers 'remove:occupants' on ourHouse, and 'update:livesIn' on paul
	ourHouse.get('occupants').remove( paul.id ); 
	
	paul.get('livesIn'); // yup; nothing.
	
	// Move back in; triggers 'add:occupants' on ourHouse, and 'update:livesIn' on paul
	paul.set( { 'livesIn': 'house-1' } );
```

This is achieved using the following relations and models:

```javascript
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
```

## Relation types

### HasOne relations (`Backbone.HasOne`)

The key for a HasOne relation consists of a single `Backbone.RelationalModel`. The default `reverseRelation.type` for a HasOne relation is HasMany. This can be configured to be `HasOne` instead, to create one-to-one relations.

### HasMany relations (`Backbone.HasMany`)

The key for a HasMany relation consists of a `Backbone.Collection` of `Backbone.RelationalModel`s. The default `reverseRelation.type` for a HasMany relation is HasOne; this is the only option here, since many-to-many is not supported directly.

### Many-to-many relations (using two `Backbone.HasMany` relations)
A many-to-many relation can be modeled using two HasMany relations:

```javascript
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
```

## Under the hood

Each `Backbone.RelationalModel` registers itself with `Backbone.Store` upon creation (and removes itself from the `Store` when destroyed). When creating or updating an attribute that is a key in a relation, removed related objects are notified of their removal, and new related objects are looked up in the `Store`.