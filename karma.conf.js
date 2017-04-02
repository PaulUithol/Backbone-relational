/* eslint-env node */

module.exports = function( config ) {
	config.set({
		frameworks: [
			'browserify',
			'qunit'
		],

    files: [
			require.resolve( 'babel-polyfill' ),
      // 'test/setup/environment.js',
			'test/*.js'
		],

		preprocessors: {
			[ require.resolve( 'babel-polyfill' ) ]: [ 'browserify' ],
			'test/*.js': [ 'browserify', 'coverage' ],
			'**/*.js': [ 'electron' ]
		},

    client: {
      useIframe: false
    },

    browserify: {
			debug: true,
			transform: [
				[ 'babelify', {
					presets: [ 'es2015' ],
					plugins: [
            [ 'module-resolver', {
              alias: {
                'backbone-relational': './src/backbone-relational'
              }
            }],
						[ 'istanbul', {
							exclude: [ 'node_modules/**', 'test/**' ]
						}]
					],
					sourceMap: true
				}]
			]
		},

    reporters: [ 'dots', 'coverage' ],

    coverageReporter: {
      dir: './coverage',
      reporters: [
        { type: 'text-summary' },
        { type: 'lcovonly', subdir: '.' }
      ]
    },

		port: 9877,
		colors: true
	});
};
