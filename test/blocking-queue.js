import { reset } from './setup/setup';
import { BlockingQueue } from 'backbone-relational';

QUnit.module( "Backbone.Relational.BlockingQueue", { beforeEach: reset });

	QUnit.test( "Block", function( assert ) {
		var queue = new BlockingQueue();
		var count = 0;
		var increment = function() { count++; };
		var decrement = function() { count--; };

		queue.add( increment );
		assert.ok( count === 1, 'Increment executed right away' );

		queue.add( decrement );
		assert.ok( count === 0, 'Decrement executed right away' );

		queue.block();
		queue.add( increment );

		assert.ok( queue.isLocked(), 'Queue is blocked' );
		assert.equal( count, 0, 'Increment did not execute right away' );

		queue.block();
		queue.block();

		assert.equal( queue._permitsUsed, 3, '_permitsUsed should be incremented to 3' );

		queue.unblock();
		queue.unblock();
		queue.unblock();

		assert.equal( count, 1, 'Increment executed' );
	});
