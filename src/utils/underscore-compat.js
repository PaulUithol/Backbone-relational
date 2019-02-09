import _ from 'underscore';

/**
 * Partial Underscore emulation when _ is Lodash.
 * Please try to write code that is compatible with both, but add
 * compatibility code below otherwise.
 */
if (!_.any) {  // We have Lodash, make it imitate Underscore a bit more.
	_.any = _.some;
	_.all = _.every;
	_.contains = _.includes;
	_.pluck = _.map;
}

export default _;
