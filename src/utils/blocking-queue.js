import _ from 'underscore';
import Semaphore from './semaphore';

/**
 * A BlockingQueue that accumulates items while blocked (via 'block'),
 * and processes them when unblocked (via 'unblock').
 * Process can also be called manually (via 'process').
 */
const BlockingQueue = function() {
	this._queue = [];
};

_.extend( BlockingQueue.prototype, Semaphore, {
	_queue: null,

	add: function( func ) {
		if ( this.isBlocked() ) {
			this._queue.push( func );
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
	process: function() {
		var queue = this._queue;
		this._queue = [];
		while ( queue && queue.length ) {
			queue.shift()();
		}
	},

	block: function() {
		this.acquire();
	},

	unblock: function() {
		this.release();
		if ( !this.isBlocked() ) {
			this.process();
		}
	},

	isBlocked: function() {
		return this.isLocked();
	}
});

export default BlockingQueue;
