/* eslint-env node */

module.exports = function( config ) {
	config.set({
		frameworks: [
			'browserify',
			'qunit'
		],
		plugins: [
			'karma-browserify',
			'karma-phantomjs-launcher',
			'karma-qunit'
		],

		files: [
			'test/setup/environment.js',
			'test/*.js'
		],

		preprocessors: {
			'test/**/*.js': [ 'browserify' ]
		},

		browserify: {
			debug: true,
			transform: [
				[ 'babelify', {
					presets: [ 'es2015' ],
					sourceMap: true
				}]
			]
		},

		browsers: [
			'PhantomJS'
		],

		singleRun: false,
		autoWatch: false,
		port: 9877,
		colors: true
	});
};
