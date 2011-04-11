## Backbone-relational
Backbone-relational provides one-to-one, one-to-many and many-to-one relations for [Backbone](https://github.com/documentcloud/backbone). To use relations, extend Backbone.RelationModel (instead of the regular Backbone.Model), and define a property 'relations', which specifies the relations. Available relation types are 'Backbone.HasOne' and 'Backbone.HasMany'.

* Bi-directional relations automatically notify related models of changes
* Decide how relations are serialized using the 'includeInJSON' option (just id, or the full set of attributes, in which case the relations of this object are in turn serialized as well)
* Convert nested objects in a model's attributes into Models when using the 'createModels' option upon initialization

### Example:

	paul = new Person({
		id: 'person-1',
		name: 'Paul',
		user: { login: 'dude', email: 'me@gmail.com' }
	});
	
	ourHouse = new House({
		id: 'house-1',
		location: 'in the middle of the street',
		occupants: ['person-1']
	});
	
	paul.get('user').get('login'); // 'dude'
	
	paul.get('livesIn'); // a ref to 'ourHouse', which is automatically defined because of the bi-directional HasMany relation on House to Person
	
	ourHouse.get('occupants').remove( paul.id ); // we just made paul homeless..
	
	paul.get('livesIn'); // see? 'null'.

	
This required the following relations and models:


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

### How it works

Each Backbone.RelationalModel registers itself with Backbone.Store upon creation (and removes itself from the Store when destroyed). When creating or updating an attribute that is a key in a relation, removed related objects are notified of their removal, and new related objects are looked up in the Store.