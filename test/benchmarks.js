import { reset } from './setup/setup';
import { Model, Collection, Store, HasMany, HasOne, store } from 'backbone-relational';
import _ from '../src/utils/underscore-compat';

QUnit.module('Performance', { beforeEach: reset }, () => {
	QUnit.test('Creation and destruction', function(assert) {
		let registerCount = 0,
			unregisterCount = 0,
			register = Store.prototype.register,
			unregister = Store.prototype.unregister;

		Store.prototype.register = function(model) {
			registerCount++;
			return register.apply(this, arguments);
		};
		Store.prototype.unregister = function(model, coll, options) {
			unregisterCount++;
			return unregister.apply(this, arguments);
		};

		let addHasManyCount = 0,
			addHasOneCount = 0,
			tryAddRelatedHasMany = HasMany.prototype.tryAddRelated,
			tryAddRelatedHasOne = HasOne.prototype.tryAddRelated;

		Store.prototype.tryAddRelated = function(model, coll, options) {
			addHasManyCount++;
			return tryAddRelatedHasMany.apply(this, arguments);
		};
		HasOne.prototype.tryAddRelated = function(model, coll, options) {
			addHasOneCount++;
			return tryAddRelatedHasOne.apply(this, arguments);
		};

		let removeHasManyCount = 0,
			removeHasOneCount = 0,
			removeRelatedHasMany = HasMany.prototype.removeRelated,
			removeRelatedHasOne = HasOne.prototype.removeRelated;

		HasMany.prototype.removeRelated = function(model, coll, options) {
			removeHasManyCount++;
			return removeRelatedHasMany.apply(this, arguments);
		};
		HasOne.prototype.removeRelated = function(model, coll, options) {
			removeHasOneCount++;
			return removeRelatedHasOne.apply(this, arguments);
		};

		let Child = Model.extend({
			url: '/child/',

			toString() {
				return this.id;
			}
		});

		let Parent = Model.extend({
			relations: [{
				type: HasMany,
				key: 'children',
				relatedModel: Child,
				reverseRelation: {
					key: 'parent'
				}
			}],

			toString() {
				return this.get('name');
			}
		});

		let Parents = Collection.extend({
			model: Parent
		});


		// bootstrap data
		let data = [];
		for (let i = 1; i <= 300; i++) {
			data.push({
				name: 'parent-' + i,
				children: [
					{id: 'p-' + i + '-c1', name: 'child-1'},
					{id: 'p-' + i + '-c2', name: 'child-2'},
					{id: 'p-' + i + '-c3', name: 'child-3'}
				]
			});
		}


		/**
		 * Test 2
		 */
		store.reset();
		addHasManyCount = addHasOneCount = 0;
		// console.log('loading test 2...');
		let start = new Date();

		let preparedData = _.map(data, function(item) {
			item = _.clone(item);
			item.children = item.children.map(function(child) {
				return new Child(child);
			});
			return item;
		});

		let parents = new Parents();

		parents.on('reset', function() {
			let secs = (new Date() - start) / 1000;
			// console.log( 'data loaded in %s, addHasManyCount=%o, addHasOneCount=%o', secs, addHasManyCount, addHasOneCount );
		});
		parents.reset(preparedData);

		//_.invoke( _.clone( parents.models ), 'destroy' );


		/**
		 * Test 1
		 */
		store.reset();
		addHasManyCount = addHasOneCount = 0;
		// console.log('loading test 1...');
		start = new Date();

		parents = new Parents();

		parents.on('reset', function() {
			let secs = (new Date() - start) / 1000;
			// console.log( 'data loaded in %s, addHasManyCount=%o, addHasOneCount=%o', secs, addHasManyCount, addHasOneCount );
		});
		parents.reset(data);

		//_.invoke( _.clone( parents.models ), 'destroy' );


		/**
		 * Test 2 (again)
		 */
		store.reset();
		addHasManyCount = addHasOneCount = removeHasManyCount = removeHasOneCount = 0;
		// console.log('loading test 2...');
		start = new Date();

		parents = new Parents();
		parents.on('reset', function() {
			let secs = (new Date() - start) / 1000;
			// console.log( 'data loaded in %s, addHasManyCount=%o, addHasOneCount=%o', secs, addHasManyCount, addHasOneCount );
		});
		parents.reset(preparedData);

		start = new Date();

		parents.each(function(parent) {
			let children = _.clone(parent.get('children').models);
			_.each(children, function(child) {
				child.destroy();
			});
		});

		let secs = (new Date() - start) / 1000;
		// console.log( 'data loaded in %s, removeHasManyCount=%o, removeHasOneCount=%o', secs, removeHasManyCount, removeHasOneCount );

		//_.invoke( _.clone( parents.models ), 'destroy' );

		/**
		 * Test 1 (again)
		 */
		store.reset();
		addHasManyCount = addHasOneCount = removeHasManyCount = removeHasOneCount = 0;
		// console.log('loading test 1...');
		start = new Date();

		parents = new Parents();
		parents.on('reset', function() {
			let secs = (new Date() - start) / 1000;
			// console.log( 'data loaded in %s, addHasManyCount=%o, addHasOneCount=%o', secs, addHasManyCount, addHasOneCount );
		});
		parents.reset(data);

		start = new Date();

		parents.remove(parents.models);

		secs = (new Date() - start) / 1000;
		// console.log( 'data removed in %s, removeHasManyCount=%o, removeHasOneCount=%o', secs, removeHasManyCount, removeHasOneCount );

		// console.log( 'registerCount=%o, unregisterCount=%o', registerCount, unregisterCount );

		assert.expect(0);
	});
});
