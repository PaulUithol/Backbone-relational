import { reset } from './setup/setup';
import { Semaphore } from 'backbone-relational';
import _ from '../src/utils/underscore-compat';

QUnit.module('Backbone.Relational.Semaphore ', { beforeEach: reset }, () => {
	QUnit.test('Unbounded', function(assert) {
		let semaphore = _.extend({}, Semaphore);
		assert.ok(!semaphore.isLocked(), 'Semaphore is not locked initially');
		semaphore.acquire();
		assert.ok(semaphore.isLocked(), 'Semaphore is locked after acquire');
		semaphore.acquire();
		assert.equal(semaphore._permitsUsed, 2, '_permitsUsed should be incremented 2 times');

		semaphore.setAvailablePermits(4);
		assert.equal(semaphore._permitsAvailable, 4, '_permitsAvailable should be 4');

		semaphore.acquire();
		semaphore.acquire();
		assert.equal(semaphore._permitsUsed, 4, '_permitsUsed should be incremented 4 times');

		try {
			semaphore.acquire();
		}	catch (ex) {
			assert.ok(true, 'Error thrown when attempting to acquire too often');
		}

		semaphore.release();
		assert.equal(semaphore._permitsUsed, 3, '_permitsUsed should be decremented to 3');

		semaphore.release();
		semaphore.release();
		semaphore.release();
		assert.equal(semaphore._permitsUsed, 0, '_permitsUsed should be decremented to 0');
		assert.ok(!semaphore.isLocked(), 'Semaphore is not locked when all permits are released');

		try {
			semaphore.release();
		}	catch (ex) {
			assert.ok(true, 'Error thrown when attempting to release too often');
		}
	});
});
