QUnit.module( "Backbone.Relational.Semaphore ", { setup: require('./setup/setup').reset } );

	QUnit.test( "Unbounded", 10, function() {
		var semaphore = _.extend( {}, Backbone.Relational.Semaphore  );
		ok( !semaphore.isLocked(), 'Semaphore is not locked initially' );
		semaphore.acquire();
		ok( semaphore.isLocked(), 'Semaphore is locked after acquire' );
		semaphore.acquire();
		equal( semaphore._permitsUsed, 2 ,'_permitsUsed should be incremented 2 times' );

		semaphore.setAvailablePermits( 4 );
		equal( semaphore._permitsAvailable, 4 ,'_permitsAvailable should be 4' );

		semaphore.acquire();
		semaphore.acquire();
		equal( semaphore._permitsUsed, 4 ,'_permitsUsed should be incremented 4 times' );

		try {
			semaphore.acquire();
		}
		catch( ex ) {
			ok( true, 'Error thrown when attempting to acquire too often' );
		}

		semaphore.release();
		equal( semaphore._permitsUsed, 3 ,'_permitsUsed should be decremented to 3' );

		semaphore.release();
		semaphore.release();
		semaphore.release();
		equal( semaphore._permitsUsed, 0 ,'_permitsUsed should be decremented to 0' );
		ok( !semaphore.isLocked(), 'Semaphore is not locked when all permits are released' );

		try {
			semaphore.release();
		}
		catch( ex ) {
			ok( true, 'Error thrown when attempting to release too often' );
		}
	});
