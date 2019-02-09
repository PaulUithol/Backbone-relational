import _ from './underscore-compat';
import Semaphore from './semaphore';

/**
 * A BlockingQueue that accumulates items while blocked (via 'block'),
 * and processes them when unblocked (via 'unblock').
 * Process can also be called manually (via 'process').
 */
function BlockingQueue() {
	this._queue = [];
};

_.extend(BlockingQueue.prototype, Semaphore, {
	_queue: null,

	add(func) {
		if (this.isBlocked()) {
			this._queue.push(func);
		} else {
			func();
		}
	},

	// Some of the queued events may trigger other blocking events. By
	// copying the queue here it allows queued events to process closer to
	// the natural order.
	//
	// queue events [ 'A', 'B', 'C' ]
	// A handler of 'B' triggers 'D' and 'E'
	// By copying `this._queue` this executes:
	// [ 'A', 'B', 'D', 'E', 'C' ]
	// The same order the would have executed if they didn't have to be
	// delayed and queued.
	process() {
		let queue = this._queue;
		this._queue = [];
		while (queue && queue.length) {
			queue.shift()();
		}
	},

	block() {
		this.acquire();
	},

	unblock() {
		this.release();
		if (!this.isBlocked()) {
			this.process();
		}
	},

	isBlocked() {
		return this.isLocked();
	}
});

export default BlockingQueue;
