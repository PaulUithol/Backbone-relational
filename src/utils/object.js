import _ from './underscore-compat';
import extend from './extend';
import Events from './events';

/**
 * Base object to extend off of. Works similar to how you extend in Backbone
 */
function ExtendableObject(...args) {
	this.initialize.call(this, ...args);
};
_.extend(ExtendableObject.prototype, Events);
ExtendableObject.extend = extend;

export default ExtendableObject;
