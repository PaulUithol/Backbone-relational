QUnit.module( "Backbone.BlockingQueue", { setup: require('./setup/setup').reset } );

	QUnit.test( "Block", function() {
		var queue = new Backbone.BlockingQueue();
		var count = 0;
		var increment = function() { count++; };
		var decrement = function() { count--; };

		queue.add( increment );
		ok( count === 1, 'Increment executed right away' );

		queue.add( decrement );
		ok( count === 0, 'Decrement executed right away' );

		queue.block();
		queue.add( increment );

		ok( queue.isLocked(), 'Queue is blocked' );
		equal( count, 0, 'Increment did not execute right away' );

		queue.block();
		queue.block();

		equal( queue._permitsUsed, 3 ,'_permitsUsed should be incremented to 3' );

		queue.unblock();
		queue.unblock();
		queue.unblock();

		equal( count, 1, 'Increment executed' );
	});
