import { reset } from './setup/setup';
import { Collection, Model, HasOne, store } from 'backbone-relational';
import { Zoo, Animal, AnimalCollection, PersonCollection, User, NodeList } from './setup/objects';
import _ from '../src/utils/underscore-compat';
import { VERSION as BACKBONE_VERSION } from 'backbone'
import semver from 'semver';

QUnit.module('Collection', {
	beforeEach() {
		reset();
		store.addModelScope({ Zoo, Animal, User });
	}
}, () => {
	QUnit.test('Loading (fetching) multiple times updates the model, and relations\'s `keyContents`', function(assert) {
		let collA = new Collection();
		collA.model = User;
		let collB = new Collection();
		collB.model = User;

		// Similar to what happens when calling 'fetch' on collA, updating it, calling 'fetch' on collB
		let name = 'User 1';
		collA.add({ id: '/user/1/', name: name });
		let user = collA.at(0);
		assert.equal(user.get('name'), name);

		// The 'name' of 'user' is updated when adding a new hash to the collection
		name = 'New name';
		collA.add({ id: '/user/1/', name: name }, { merge: true });
		let updatedUser = collA.at(0);
		assert.equal(user.get('name'), name);
		assert.equal(updatedUser.get('name'), name);

		// The 'name' of 'user' is also updated when adding a new hash to another collection
		name = 'Another new name';
		collB.add({ id: '/user/1/', name: name, title: 'Superuser' }, { merge: true });
		let updatedUser2 = collA.at(0);
		assert.equal(user.get('name'), name);
		assert.equal(updatedUser2.get('name'), name);

		//console.log( collA.models, collA.get( '/user/1/' ), user, updatedUser, updatedUser2 );
		assert.ok(collA.get('/user/1/') === updatedUser);
		assert.ok(collA.get('/user/1/') === updatedUser2);
		assert.ok(collB.get('/user/1/') === user);
	});

	QUnit.test('Loading (fetching) a collection multiple times updates related models as well (HasOne)', function(assert) {
		let coll = new PersonCollection();
		coll.add({ id: 'person-10', name: 'Person', user: { id: 'user-10', login: 'User' } });

		let person = coll.at(0);
		let user = person.get('user');

		assert.equal(user.get('login'), 'User');

		coll.add({ id: 'person-10', name: 'New person', user: { id: 'user-10', login: 'New user' } }, { merge: true });

		assert.equal(person.get('name'), 'New person');
		assert.equal(user.get('login'), 'New user');
	});

	QUnit.test('Loading (fetching) a collection multiple times updates related models as well (HasMany)', function(assert) {
		let coll = new Collection();
		coll.model = Zoo;

		// Create a 'zoo' with 1 animal in it
		coll.add({ id: 'zoo-1', name: 'Zoo', animals: [{ id: 'lion-1', name: 'Mufasa' }] });
		let zoo = coll.at(0);
		let lion = zoo.get('animals') .at(0);

		assert.equal(lion.get('name'), 'Mufasa');

		// Update the name of 'zoo' and 'lion'
		coll.add({ id: 'zoo-1', name: 'Zoo Station', animals: [{ id: 'lion-1', name: 'Simba' }] }, { merge: true });

		assert.equal(zoo.get('name'), 'Zoo Station');
		assert.equal(lion.get('name'), 'Simba');
	});

	QUnit.test('reset should use `merge: true` by default', function(assert) {
		let nodeList = new NodeList();

		nodeList.add([{ id: 1 }, { id: 2, parent: 1 }]);

		let node1 = nodeList.get(1),
			node2 = nodeList.get(2);

		assert.ok(node2.get('parent') === node1);
		assert.ok(!node1.get('parent'));

		nodeList.reset([{ id: 1, parent: 2 }]);

		assert.ok(node1.get('parent') === node2);
	});

	QUnit.test('Return values for add/remove/reset/set match plain Backbone\'s', function(assert) {
		let Car = Model.extend(),
			Cars = Collection.extend({ model: Car }),
			cars = new Cars();

		assert.ok(cars.add({ name: 'A' }) instanceof Car, 'Add one model');

		let added = cars.add([{ name: 'B' }, { name: 'C' }]);
		assert.ok(_.isArray(added), 'Added (an array of) two models');
		assert.ok(added.length === 2);

		assert.ok(cars.remove(cars.at(0)) instanceof Car, 'Remove one model');
		let removed = cars.remove([cars.at(0), cars.at(1)]);
		assert.ok(_.isArray(removed), 'Remove (an array of) two models');
		assert.ok(removed.length === 2);

		assert.ok(cars.reset({ name: 'D' }) instanceof Car, 'Reset with one model');
		let reset = cars.reset([{ name: 'E' }, { name: 'F' }]);
		assert.ok(_.isArray(reset), 'Reset (an array of) two models');
		assert.ok(reset.length === 2);
		assert.ok(cars.length === 2);

		let e = cars.at(0),
			f = cars.at(1);

		assert.ok(cars.set(e) instanceof Car, 'Set one model');
		assert.ok(_.isArray(cars.set([e, f])), 'Set (an array of) two models');
		// Check removing `[]`
		let result = cars.remove([]);

		//have to also check if the result is an array since in backbone 1.3.1 Backbone.VERSION is incorrectly set to 1.2.3
		if (semver.satisfies(BACKBONE_VERSION, '^1.3.1') || _.isArray(result)) {
			assert.ok(result.length === 0, 'Removing `[]` is a noop (results in an empty array, no models removed)');
		} else {
			assert.ok(result === false, 'Removing `[]` is a noop (results in \'false\', no models removed)');
		}
		assert.ok(cars.length === 2, 'Still 2 cars');

		// Check removing `null`
		result = cars.remove(null);
		assert.ok(_.isUndefined(result), 'Removing `null` is a noop');
		assert.ok(cars.length === 2, 'Still 2 cars');

		// Check setting to `[]`
		result = cars.set([]);
		assert.ok(_.isArray(result) && !result.length, 'Set `[]` empties collection');
		assert.ok(cars.length === 0, 'All cars gone');

		cars.set([e, f]);
		assert.ok(cars.length === 2, '2 cars again');

		// Check setting `null`
		// assert.ok( _.isUndefined( cars.set( null ) ), "Set `null` empties collection" );
		assert.ok(_.isUndefined(cars.set(null)), 'Set `null` causes noop on collection');
		// console.log( cars, cars.length );
		// assert.ok( cars.length === 0, "All cars gone" );
		assert.ok(cars.length === 2, 'All cars still exist');
	});

	QUnit.test('add/remove/set (with `add`, `remove` and `merge` options)', function(assert) {
		let coll = new AnimalCollection();

		/**
		* Add
		*/
		coll.add({ id: '1', species: 'giraffe' });

		assert.ok(coll.length === 1);

		coll.add({	id: 1, species: 'giraffe' });

		assert.ok(coll.length === 1);

		coll.add([
			{
				id: 1, species: 'giraffe'
			},
			{
				id: 2, species: 'gorilla'
			}
		]);

		let giraffe = coll.get(1),
			gorilla = coll.get(2),
			dolphin = new Animal({ species: 'dolphin' }),
			hippo = new Animal({ id: 4, species: 'hippo' });

		assert.ok(coll.length === 2);

		coll.add(dolphin);

		assert.ok(coll.length === 3);

		// Update won't do anything
		coll.add({	id: 1, species: 'giraffe', name: 'Long John' });

		assert.ok(!coll.get(1).get('name'), 'name=' + coll.get(1).get('name'));

		// Update with `merge: true` will update the animal
		coll.add({ id: 1, species: 'giraffe', name: 'Long John' }, { merge: true });

		assert.ok(coll.get(1).get('name') === 'Long John');

		/**
		* Remove
		*/
		coll.remove(1);

		assert.ok(coll.length === 2);
		assert.ok(!coll.get(1), '`giraffe` removed from coll');

		coll.remove(dolphin);

		assert.ok(coll.length === 1);
		assert.ok(coll.get(2) === gorilla, 'Only `gorilla` is left in coll');

		/**
		* Update
		*/
		coll.add(giraffe);

		// This shouldn't do much at all
		let options = { add: false, merge: false, remove: false };
		coll.set([dolphin, { id: 2, name: 'Silverback' }], options);

		assert.ok(coll.length === 2);
		assert.ok(coll.get(2) === gorilla, '`gorilla` is left in coll');
		assert.ok(!coll.get(2).get('name'), '`gorilla` name not updated');

		// This should remove `giraffe`, add `hippo`, leave `dolphin`, and update `gorilla`.
		options = { add: true, merge: true, remove: true };
		coll.set([4, dolphin, { id: 2, name: 'Silverback' }], options);

		assert.ok(coll.length === 3);
		assert.ok(!coll.get(1), '`giraffe` removed from coll');
		assert.equal(coll.get(2), gorilla);
		assert.ok(!coll.get(3));
		assert.equal(coll.get(4), hippo);
		assert.equal(coll.get(dolphin), dolphin);
		assert.equal(gorilla.get('name'), 'Silverback');
	});

	QUnit.test('add/remove/set on a relation (with `add`, `remove` and `merge` options)', function(assert) {
		let zoo = new Zoo(),
			animals = zoo.get('animals'),
			a = new Animal({ id: 'a' }),
			b = new Animal({ id: 'b' }),
			c = new Animal({ id: 'c' });

		// The default is to call `Collection.update` without specifying options explicitly;
		// the defaults are { add: true, merge: true, remove: true }.
		zoo.set('animals', [a]);
		assert.ok(animals.length === 1, 'animals.length=' + animals.length + ' == 1?');

		zoo.set('animals', [a, b], { add: false, merge: true, remove: true });
		assert.ok(animals.length === 1, 'animals.length=' + animals.length + ' == 1?');

		zoo.set('animals', [b], { add: false, merge: false, remove: true });
		assert.ok(animals.length === 0, 'animals.length=' + animals.length + ' == 0?');

		zoo.set('animals', [{ id: 'a', species: 'a' }], { add: false, merge: true, remove: false });
		assert.ok(animals.length === 0, 'animals.length=' + animals.length + ' == 0?');
		assert.ok(a.get('species') === 'a', '`a` not added, but attributes did get merged');

		zoo.set('animals', [{ id: 'b', species: 'b' }], { add: true, merge: false, remove: false });
		assert.ok(animals.length === 1, 'animals.length=' + animals.length + ' == 1?');
		assert.ok(!b.get('species'), '`b` added, but attributes did not get merged');

		zoo.set('animals', [{ id: 'c', species: 'c' }], { add: true, merge: false, remove: true });
		assert.ok(animals.length === 1, 'animals.length=' + animals.length + ' == 1?');
		assert.ok(!animals.get('b'), 'b removed from animals');
		assert.ok(animals.get('c') === c, 'c added to animals');
		assert.ok(!c.get('species'), '`c` added, but attributes did not get merged');

		zoo.set('animals', [a, { id: 'b', species: 'b' }]);
		assert.ok(animals.length === 2, 'animals.length=' + animals.length + ' == 2?');
		assert.ok(b.get('species') === 'b', '`b` added, attributes got merged');
		assert.ok(!animals.get('c'), 'c removed from animals');

		zoo.set('animals', [{ id: 'c', species: 'c' }], { add: true, merge: true, remove: false });
		assert.ok(animals.length === 3, 'animals.length=' + animals.length + ' == 3?');
		assert.ok(c.get('species') === 'c', '`c` added, attributes got merged');
	});

	QUnit.test('`merge` on a nested relation', function(assert) {
		let zoo = new Zoo({ id: 1, animals: [{ id: 'a' }] }),
			animals = zoo.get('animals'),
			a = animals.get('a');

		assert.ok(a.get('livesIn') === zoo, '`a` is in `zoo`');

		// Pass a non-default option to a new model, with an existing nested model
		let zoo2 = new Zoo({ id: 2, animals: [{ id: 'a', species: 'a' }] }, { merge: false });

		assert.ok(a.get('livesIn') === zoo2, '`a` is in `zoo2`');
		assert.ok(!a.get('species'), '`a` hasn\'t gotten merged');
	});

	QUnit.test('pop', function(assert) {
		let zoo = new Zoo({
				animals: [{ name: 'a' }]
			}),
			animals = zoo.get('animals');

		let a = animals.pop(),
			b = animals.pop();

		assert.ok(a && a.get('name') === 'a');
		assert.ok(typeof b === 'undefined');
	});

	QUnit.test('Adding a new model doesn\'t `merge` it onto itself', function(assert) {
		let TreeModel = Model.extend({
			relations: [
				{
					key: 'parent',
					type: HasOne
				}
			],

			initialize(options) {
				if (coll) {
					coll.add(this);
				}
			}
		});

		let TreeCollection = Collection.extend({
			model: TreeModel
		});

		// Using `set` to add a new model, since this is what would be called when `fetch`ing model(s)
		let coll = new TreeCollection(),
			model = coll.set({ id: 'm2', name: 'new model', parent: 'm1' });

		assert.ok(model instanceof TreeModel);
		assert.ok(coll.size() === 1, 'One model in coll');

		assert.equal(model.get('parent'), null);
		assert.equal(model.get('name'), 'new model');
		assert.deepEqual(model.getIdsToFetch('parent'), ['m1']);

		model = coll.set({ id: 'm2', name: 'updated model', parent: 'm1' });
		assert.equal(model.get('name'), 'updated model');
		assert.deepEqual(model.getIdsToFetch('parent'), ['m1']);
	});
});
