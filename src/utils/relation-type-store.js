import BObject from './object';

export default BObject.extend({
	initialize() {
		this.types = {};
	},
	registerType( name, Type ) {
		this.types[ name ] = Type;
	},
	unregisterType( name, Type ) {
		if ( name in this.types ) {
			delete this.types[ name ];
			return true;
		}
		return false;
	},
	find( name ) {
		return this.types[ name ];
	}
});
