import { reset } from './setup/setup';
import { store, Model, HasMany, HasOne, Collection } from 'backbone-relational';
import { Person, Password, User } from './setup/objects';
import initObjects from './setup/data';

let objects;

QUnit.module( "Backbone.Relational.HasOne", { beforeEach() {
  reset();
  store.addModelScope({
    Person, Password, User
  });
  objects = initObjects();
} });

	QUnit.test( "HasOne relations on Person are set up properly", function( assert ) {
		assert.ok( objects.person1.get('likesALot') === objects.person2 );
		assert.equal( objects.person1.get('user').id, 'user-1', "The id of 'objects.person1's user is 'user-1'" );
		assert.ok( objects.person2.get('likesALot') === objects.person1 );
	});

	QUnit.test( "Reverse HasOne relations on Person are set up properly", function( assert ) {
		assert.ok( objects.person1.get( 'likedALotBy' ) === objects.person2 );
		assert.ok( objects.person1.get( 'user' ).get( 'person' ) === objects.person1, "The person belonging to 'objects.person1's user is 'objects.person1'" );
		assert.ok( objects.person2.get( 'likedALotBy' ) === objects.person1 );
	});

	QUnit.test( "'set' triggers 'change' and 'update', on a HasOne relation, for a Model with multiple relations", function( assert ) {
		// triggers initialization of the reverse relation from User to Password
		var password = new Password( { plaintext: 'asdf' } );

		objects.person1.on( 'change', function( model, options ) {
				assert.ok( model.get( 'user' ) instanceof User, "In 'change', model.user is an instance of User" );
				assert.equal( model.previous( 'user' ).get( 'login' ), oldLogin, "previousAttributes is available on 'change'" );
			});

		objects.person1.on( 'change:user', function( model, options ) {
				assert.ok( model.get( 'user' ) instanceof User, "In 'change:user', model.user is an instance of User" );
				assert.equal( model.previous( 'user' ).get( 'login' ), oldLogin, "previousAttributes is available on 'change'" );
			});

		objects.person1.on( 'change:user', function( model, attr, options ) {
				assert.ok( model.get( 'user' ) instanceof User, "In 'change:user', model.user is an instance of User" );
				assert.ok( attr.get( 'person' ) === objects.person1, "The user's 'person' is 'objects.person1'" );
				assert.ok( attr.get( 'password' ) instanceof Password, "The user's password attribute is a model of type Password");
				assert.equal( attr.get( 'password' ).get( 'plaintext' ), 'qwerty', "The user's password is ''qwerty'" );
			});

		var user = { login: 'me@hotmail.com', password: { plaintext: 'qwerty' } };
		var oldLogin = objects.person1.get( 'user' ).get( 'login' );

		// Triggers assertions for 'change' and 'change:user'
		objects.person1.set( { user: user } );

		user = objects.person1.get( 'user' ).on( 'change:password', function( model, attr, options ) {
			assert.equal( attr.get( 'plaintext' ), 'asdf', "The user's password is ''qwerty'" );
		});

		// Triggers assertions for 'change:user'
		user.set( { password: password } );
	});

	QUnit.test( "'set' doesn't triggers 'change' and 'change:' when passed `silent: true`", function( assert ) {
		objects.person1.on( 'change', function( model, options ) {
			assert.ok( false, "'change' should not get triggered" );
		});

		objects.person1.on( 'change:user', function( model, attr, options ) {
			assert.ok( false, "'change:user' should not get triggered" );
		});

		objects.person1.on( 'change:user', function( model, attr, options ) {
			assert.ok( false, "'change:user' should not get triggered" );
		});

		assert.ok( objects.person1.get( 'user' ) instanceof User, "objects.person1 has a 'user'" );

		var user = new User({ login: 'me@hotmail.com', password: { plaintext: 'qwerty' } });
		objects.person1.set( 'user', user, { silent: true } );

		assert.equal( objects.person1.get( 'user' ), user );
	});

	QUnit.test( "'unset' triggers 'change' and 'change:<key>'", function( assert ) {
		objects.person1.on( 'change', function( model, options ) {
				assert.equal( model.get('user'), null, "model.user is unset" );
			});

		objects.person1.on( 'change:user', function( model, attr, options ) {
				assert.equal( attr, null, "new value of attr (user) is null" );
			});

		assert.ok( objects.person1.get( 'user' ) instanceof User, "objects.person1 has a 'user'" );

		var user = objects.person1.get( 'user' );
		objects.person1.unset( 'user' );

		assert.equal( user.get( 'person' ), null, "objects.person1 is not set on 'user' anymore" );
	});

	QUnit.test( "'clear' triggers 'change' and 'change:<key>'", function( assert ) {
		objects.person1.on( 'change', function( model, options ) {
			assert.equal( model.get('user'), null, "model.user is unset" );
		});

		objects.person1.on( 'change:user', function( model, attr, options ) {
			assert.equal( attr, null, "new value of attr (user) is null" );
		});

		assert.ok( objects.person1.get( 'user' ) instanceof User, "objects.person1 has a 'user'" );

		var user = objects.person1.get( 'user' );
		objects.person1.clear();

		assert.equal( user.get( 'person' ), null, "objects.person1 is not set on 'user' anymore" );
	});
