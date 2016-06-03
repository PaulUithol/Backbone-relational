import _ from 'underscore';
import extend from './extend';
import Events from './events';

/**
 * Base object to extend off of. Works similar to how you extend in Backbone
 */
const extendableObject = function(...args) {
  this.initialize.call(this, ...args);
};
_.extend(extendableObject.prototype, Events);
extendableObject.extend = extend;

export default extendableObject;
