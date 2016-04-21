var Objects = require('./objects');

/**
 * Initialize a few models that are used in a large number of tests
 */
module.exports = function initObjects() {
	require('./setup').reset();

	window.person1 = new Person({
		id: 'person-1',
		name: 'boy',
		likesALot: 'person-2',
		resource_uri: 'person-1',
		user: { id: 'user-1', login: 'dude', email: 'me@gmail.com', resource_uri: 'user-1' }
	});

	window.person2 = new Person({
		id: 'person-2',
		name: 'girl',
		likesALot: 'person-1',
		resource_uri: 'person-2'
	});

	window.person3 = new Person({
		id: 'person-3',
		resource_uri: 'person-3'
	});

	window.oldCompany = new Company({
		id: 'company-1',
		name: 'Big Corp.',
		ceo: {
			name: 'Big Boy'
		},
		employees: [ { person: 'person-3' } ], // uses the 'Job' link table to achieve many-to-many. No 'id' specified!
		resource_uri: 'company-1'
	});

	window.newCompany = new Company({
		id: 'company-2',
		name: 'New Corp.',
		employees: [ { person: 'person-2' } ],
		resource_uri: 'company-2'
	});

	window.ourHouse = new House({
		id: 'house-1',
		location: 'in the middle of the street',
		occupants: ['person-2'],
		resource_uri: 'house-1'
	});

	window.theirHouse = new House({
		id: 'house-2',
		location: 'outside of town',
		occupants: [],
		resource_uri: 'house-2'
	});
}
