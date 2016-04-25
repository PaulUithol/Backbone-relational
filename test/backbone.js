QUnit.module( "General / Backbone", { setup: require('./setup/setup').reset } );

	QUnit.test( "Prototypes, constructors and inheritance", function() {
		// This stuff makes my brain hurt a bit. So, for reference:
		var Model = Backbone.Model.extend(),
			i = new Backbone.Model(),
			iModel = new Model();

		var RelModel= Backbone.Relational.Model.extend(),
			iRel = new Backbone.Relational.Model(),
			iRelModel = new RelModel();

		// Both are functions, so their `constructor` is `Function`
		ok( Backbone.Model.constructor === Backbone.Relational.Model.constructor );

		ok( Backbone.Model !== Backbone.Relational.Model );
		ok( Backbone.Model === Backbone.Model.prototype.constructor );
		ok( Backbone.Relational.Model === Backbone.Relational.Model.prototype.constructor );
		ok( Backbone.Model.prototype.constructor !== Backbone.Relational.Model.prototype.constructor );

		ok( Model.prototype instanceof Backbone.Model );
		ok( !( Model.prototype instanceof Backbone.Relational.Model ) );
		ok( RelModel.prototype instanceof Backbone.Model );
		ok( Backbone.Relational.Model.prototype instanceof Backbone.Model );
		ok( RelModel.prototype instanceof Backbone.Relational.Model );

		ok( i instanceof Backbone.Model );
		ok( !( i instanceof Backbone.Relational.Model ) );
		ok( iRel instanceof Backbone.Model );
		ok( iRel instanceof Backbone.Relational.Model );

		ok( iModel instanceof Backbone.Model );
		ok( !( iModel instanceof Backbone.Relational.Model ) );
		ok( iRelModel instanceof Backbone.Model );
		ok( iRelModel instanceof Backbone.Relational.Model );
	});

	QUnit.test('Collection#set', 1, function() {
		var a = new Backbone.Model({id: 3, label: 'a'} ),
			b = new Backbone.Model({id: 2, label: 'b'} ),
			col = new Backbone.Relational.Collection([a]);

		col.set([a,b], {add: true, merge: false, remove: true});
		ok( col.length === 2 );
	});
