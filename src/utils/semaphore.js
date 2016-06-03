/**
 * Semaphore mixin; can be used as both binary and counting.
 **/
export default {
	_permitsAvailable: null,
	_permitsUsed: 0,

	acquire: function() {
		if ( this._permitsAvailable && this._permitsUsed >= this._permitsAvailable ) {
			throw new Error( 'Max permits acquired' );
		} else {
			this._permitsUsed++;
		}
	},

	release: function() {
		if ( this._permitsUsed === 0 ) {
			throw new Error( 'All permits released' );
		} else {
			this._permitsUsed--;
		}
	},

	isLocked: function() {
		return this._permitsUsed > 0;
	},

	setAvailablePermits: function( amount ) {
		if ( this._permitsUsed > amount ) {
			throw new Error( 'Available permits cannot be less than used permits' );
		}
		this._permitsAvailable = amount;
	}
};
