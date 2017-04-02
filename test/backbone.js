import { reset } from './setup/setup';
import { Model as BackboneModel } from 'backbone';
import { Model as RelationalModel, Collection as RelationalCollection } from 'backbone-relational';

QUnit.module( "General / Backbone", { beforeEach: reset });

	QUnit.test( "Prototypes, constructors and inheritance", function( assert ) {
		// This stuff makes my brain hurt a bit. So, for reference:
		var Model = BackboneModel.extend(),
			i = new BackboneModel(),
			iModel = new Model();

		var RelModel = RelationalModel.extend(),
			iRel = new RelationalModel(),
			iRelModel = new RelModel();

		// Both are functions, so their `constructor` is `Function`
		assert.ok( BackboneModel.constructor === RelationalModel.constructor );

		assert.ok( BackboneModel !== RelationalModel );
		assert.ok( BackboneModel === BackboneModel.prototype.constructor );
		assert.ok( RelationalModel === RelationalModel.prototype.constructor );
		assert.ok( BackboneModel.prototype.constructor !== RelationalModel.prototype.constructor );

		assert.ok( Model.prototype instanceof BackboneModel );
		assert.ok( !( Model.prototype instanceof RelationalModel ) );
		assert.ok( RelModel.prototype instanceof BackboneModel );
		assert.ok( RelationalModel.prototype instanceof BackboneModel );
		assert.ok( RelModel.prototype instanceof RelationalModel );

		assert.ok( i instanceof BackboneModel );
		assert.ok( !( i instanceof RelationalModel ) );
		assert.ok( iRel instanceof BackboneModel );
		assert.ok( iRel instanceof RelationalModel );

		assert.ok( iModel instanceof BackboneModel );
		assert.ok( !( iModel instanceof RelationalModel ) );
		assert.ok( iRelModel instanceof BackboneModel );
		assert.ok( iRelModel instanceof RelationalModel );
	});

	QUnit.test( 'Collection#set', function( assert ) {
		var a = new BackboneModel({ id: 3, label: 'a' }),
			b = new BackboneModel({ id: 2, label: 'b' }),
			col = new RelationalCollection( [ a ] );

		col.set( [ a, b ], { add: true, merge: false, remove: true });
		assert.ok( col.length === 2 );
	});
