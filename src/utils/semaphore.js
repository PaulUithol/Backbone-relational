/**
 * Semaphore mixin; can be used as both binary and counting.
 **/
export default {
	_permitsAvailable: null,
	_permitsUsed: 0,

	acquire() {
		if (this._permitsAvailable && this._permitsUsed >= this._permitsAvailable) {
			throw new Error('Max permits acquired');
		} else {
			this._permitsUsed++;
		}
	},

	release() {
		if (this._permitsUsed === 0) {
			throw new Error('All permits released');
		} else {
			this._permitsUsed--;
		}
	},

	isLocked() {
		return this._permitsUsed > 0;
	},

	setAvailablePermits(amount) {
		if (this._permitsUsed > amount) {
			throw new Error('Available permits cannot be less than used permits');
		}
		this._permitsAvailable = amount;
	}
};
