QUnit.module( "Backbone.HasOne", { setup: require('./setup/data') } );

	QUnit.test( "HasOne relations on Person are set up properly", function() {
		ok( person1.get('likesALot') === person2 );
		equal( person1.get('user').id, 'user-1', "The id of 'person1's user is 'user-1'" );
		ok( person2.get('likesALot') === person1 );
	});

	QUnit.test( "Reverse HasOne relations on Person are set up properly", function() {
		ok( person1.get( 'likedALotBy' ) === person2 );
		ok( person1.get( 'user' ).get( 'person' ) === person1, "The person belonging to 'person1's user is 'person1'" );
		ok( person2.get( 'likedALotBy' ) === person1 );
	});

	QUnit.test( "'set' triggers 'change' and 'update', on a HasOne relation, for a Model with multiple relations", 9, function() {
		// triggers initialization of the reverse relation from User to Password
		var password = new Password( { plaintext: 'asdf' } );

		person1.on( 'change', function( model, options ) {
				ok( model.get( 'user' ) instanceof User, "In 'change', model.user is an instance of User" );
				equal( model.previous( 'user' ).get( 'login' ), oldLogin, "previousAttributes is available on 'change'" );
			});

		person1.on( 'change:user', function( model, options ) {
				ok( model.get( 'user' ) instanceof User, "In 'change:user', model.user is an instance of User" );
				equal( model.previous( 'user' ).get( 'login' ), oldLogin, "previousAttributes is available on 'change'" );
			});

		person1.on( 'change:user', function( model, attr, options ) {
				ok( model.get( 'user' ) instanceof User, "In 'change:user', model.user is an instance of User" );
				ok( attr.get( 'person' ) === person1, "The user's 'person' is 'person1'" );
				ok( attr.get( 'password' ) instanceof Password, "The user's password attribute is a model of type Password");
				equal( attr.get( 'password' ).get( 'plaintext' ), 'qwerty', "The user's password is ''qwerty'" );
			});

		var user = { login: 'me@hotmail.com', password: { plaintext: 'qwerty' } };
		var oldLogin = person1.get( 'user' ).get( 'login' );

		// Triggers assertions for 'change' and 'change:user'
		person1.set( { user: user } );

		user = person1.get( 'user' ).on( 'change:password', function( model, attr, options ) {
			equal( attr.get( 'plaintext' ), 'asdf', "The user's password is ''qwerty'" );
		});

		// Triggers assertions for 'change:user'
		user.set( { password: password } );
	});

	QUnit.test( "'set' doesn't triggers 'change' and 'change:' when passed `silent: true`", 2, function() {
		person1.on( 'change', function( model, options ) {
			ok( false, "'change' should not get triggered" );
		});

		person1.on( 'change:user', function( model, attr, options ) {
			ok( false, "'change:user' should not get triggered" );
		});

		person1.on( 'change:user', function( model, attr, options ) {
			ok( false, "'change:user' should not get triggered" );
		});

		ok( person1.get( 'user' ) instanceof User, "person1 has a 'user'" );

		var user = new User({ login: 'me@hotmail.com', password: { plaintext: 'qwerty' } });
		person1.set( 'user', user, { silent: true } );

		equal( person1.get( 'user' ), user );
	});

	QUnit.test( "'unset' triggers 'change' and 'change:<key>'", 4, function() {
		person1.on( 'change', function( model, options ) {
				equal( model.get('user'), null, "model.user is unset" );
			});

		person1.on( 'change:user', function( model, attr, options ) {
				equal( attr, null, "new value of attr (user) is null" );
			});

		ok( person1.get( 'user' ) instanceof User, "person1 has a 'user'" );

		var user = person1.get( 'user' );
		person1.unset( 'user' );

		equal( user.get( 'person' ), null, "person1 is not set on 'user' anymore" );
	});

	QUnit.test( "'clear' triggers 'change' and 'change:<key>'", 4, function() {
		person1.on( 'change', function( model, options ) {
			equal( model.get('user'), null, "model.user is unset" );
		});

		person1.on( 'change:user', function( model, attr, options ) {
			equal( attr, null, "new value of attr (user) is null" );
		});

		ok( person1.get( 'user' ) instanceof User, "person1 has a 'user'" );

		var user = person1.get( 'user' );
		person1.clear();

		equal( user.get( 'person' ), null, "person1 is not set on 'user' anymore" );
	});
