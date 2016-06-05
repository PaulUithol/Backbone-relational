QUnit.module( "Performance", { setup: require('./setup/setup').reset } );

	QUnit.test( "Creation and destruction", 0, function() {
		var registerCount = 0,
			unregisterCount = 0,
			register = Backbone.Relational.Store.prototype.register,
			unregister = Backbone.Relational.Store.prototype.unregister;

		Backbone.Relational.Store.prototype.register = function( model ) {
			registerCount++;
			return register.apply( this, arguments );
		};
		Backbone.Relational.Store.prototype.unregister = function( model, coll, options ) {
			unregisterCount++;
			return unregister.apply( this, arguments );
		};

		var addHasManyCount = 0,
			addHasOneCount = 0,
			tryAddRelatedHasMany = Backbone.Relational.HasMany.prototype.tryAddRelated,
			tryAddRelatedHasOne = Backbone.Relational.HasOne.prototype.tryAddRelated;

		Backbone.Relational.Store.prototype.tryAddRelated = function( model, coll, options ) {
			addHasManyCount++;
			return tryAddRelatedHasMany.apply( this, arguments );
		};
		Backbone.Relational.HasOne.prototype.tryAddRelated = function( model, coll, options ) {
			addHasOneCount++;
			return tryAddRelatedHasOne.apply( this, arguments );
		};

		var removeHasManyCount = 0,
			removeHasOneCount = 0,
			removeRelatedHasMany = Backbone.Relational.HasMany.prototype.removeRelated,
			removeRelatedHasOne= Backbone.Relational.HasOne.prototype.removeRelated;

		Backbone.Relational.HasMany.prototype.removeRelated = function( model, coll, options ) {
			removeHasManyCount++;
			return removeRelatedHasMany.apply( this, arguments );
		};
		Backbone.Relational.HasOne.prototype.removeRelated = function( model, coll, options ) {
			removeHasOneCount++;
			return removeRelatedHasOne.apply( this, arguments );
		};

		var Child = Backbone.Relational.Model.extend({
			url: '/child/',

			toString: function() {
				return this.id;
			}
		});

		var Parent = Backbone.Relational.Model.extend({
			relations: [{
				type: Backbone.Relational.HasMany,
				key: 'children',
				relatedModel: Child,
				reverseRelation: {
					key: 'parent'
				}
			}],

			toString: function() {
				return this.get( 'name' );
			}
		});

		var Parents = Backbone.Relational.Collection.extend({
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


		/**
		 * Test 2
		 */
		Backbone.Relational.store.reset();
		addHasManyCount = addHasOneCount = 0;
		// console.log('loading test 2...');
		var start = new Date();

		var preparedData = _.map( data, function( item ) {
			item = _.clone( item );
			item.children = item.children.map( function( child ) {
				return new Child( child );
			});
			return item;
		});

		var parents = new Parents();

		parents.on('reset', function () {
			var secs = (new Date() - start) / 1000;
			// console.log( 'data loaded in %s, addHasManyCount=%o, addHasOneCount=%o', secs, addHasManyCount, addHasOneCount );
		});
		parents.reset( preparedData );

		//_.invoke( _.clone( parents.models ), 'destroy' );


		/**
		 * Test 1
		 */
		Backbone.Relational.store.reset();
		addHasManyCount = addHasOneCount = 0;
		// console.log('loading test 1...');
		var start = new Date();

		var parents = new Parents();

		parents.on('reset', function () {
			var secs = (new Date() - start) / 1000;
			// console.log( 'data loaded in %s, addHasManyCount=%o, addHasOneCount=%o', secs, addHasManyCount, addHasOneCount );
		});
		parents.reset( data );

		//_.invoke( _.clone( parents.models ), 'destroy' );


		/**
		 * Test 2 (again)
		 */
		Backbone.Relational.store.reset();
		addHasManyCount = addHasOneCount = removeHasManyCount = removeHasOneCount = 0;
		// console.log('loading test 2...');
		var start = new Date();

		var parents = new Parents();
		parents.on('reset', function () {
			var secs = (new Date() - start) / 1000;
			// console.log( 'data loaded in %s, addHasManyCount=%o, addHasOneCount=%o', secs, addHasManyCount, addHasOneCount );
		});
		parents.reset( preparedData );


		start = new Date();

		parents.each( function( parent ) {
			var children = _.clone( parent.get( 'children' ).models );
			_.each( children, function( child ) {
				child.destroy();
			});
		});

		var secs = (new Date() - start) / 1000;
		// console.log( 'data loaded in %s, removeHasManyCount=%o, removeHasOneCount=%o', secs, removeHasManyCount, removeHasOneCount );

		//_.invoke( _.clone( parents.models ), 'destroy' );

		/**
		 * Test 1 (again)
		 */
		Backbone.Relational.store.reset();
		addHasManyCount = addHasOneCount = removeHasManyCount = removeHasOneCount = 0;
		// console.log('loading test 1...');
		var start = new Date();

		var parents = new Parents();
		parents.on('reset', function () {
			var secs = (new Date() - start) / 1000;
			// console.log( 'data loaded in %s, addHasManyCount=%o, addHasOneCount=%o', secs, addHasManyCount, addHasOneCount );
		});
		parents.reset(data);

		start = new Date();

		parents.remove( parents.models );

		var secs = (new Date() - start) / 1000;
		// console.log( 'data removed in %s, removeHasManyCount=%o, removeHasOneCount=%o', secs, removeHasManyCount, removeHasOneCount );

		// console.log( 'registerCount=%o, unregisterCount=%o', registerCount, unregisterCount );
	});
