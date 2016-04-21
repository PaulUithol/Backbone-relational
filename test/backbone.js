QUnit.module( "General / Backbone", { setup: require('./setup/setup').reset } );

	QUnit.test( "Prototypes, constructors and inheritance", function() {
		// This stuff makes my brain hurt a bit. So, for reference:
		var Model = Backbone.Model.extend(),
			i = new Backbone.Model(),
			iModel = new Model();

		var RelModel= Backbone.RelationalModel.extend(),
			iRel = new Backbone.RelationalModel(),
			iRelModel = new RelModel();

		// Both are functions, so their `constructor` is `Function`
		ok( Backbone.Model.constructor === Backbone.RelationalModel.constructor );

		ok( Backbone.Model !== Backbone.RelationalModel );
		ok( Backbone.Model === Backbone.Model.prototype.constructor );
		ok( Backbone.RelationalModel === Backbone.RelationalModel.prototype.constructor );
		ok( Backbone.Model.prototype.constructor !== Backbone.RelationalModel.prototype.constructor );

		ok( Model.prototype instanceof Backbone.Model );
		ok( !( Model.prototype instanceof Backbone.RelationalModel ) );
		ok( RelModel.prototype instanceof Backbone.Model );
		ok( Backbone.RelationalModel.prototype instanceof Backbone.Model );
		ok( RelModel.prototype instanceof Backbone.RelationalModel );

		ok( i instanceof Backbone.Model );
		ok( !( i instanceof Backbone.RelationalModel ) );
		ok( iRel instanceof Backbone.Model );
		ok( iRel instanceof Backbone.RelationalModel );

		ok( iModel instanceof Backbone.Model );
		ok( !( iModel instanceof Backbone.RelationalModel ) );
		ok( iRelModel instanceof Backbone.Model );
		ok( iRelModel instanceof Backbone.RelationalModel );
	});

	QUnit.test('Collection#set', 1, function() {
		var a = new Backbone.Model({id: 3, label: 'a'} ),
			b = new Backbone.Model({id: 2, label: 'b'} ),
			col = new Backbone.Collection([a]);

		col.set([a,b], {add: true, merge: false, remove: true});
		ok( col.length === 2 );
	});
