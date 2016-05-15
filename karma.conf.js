module.exports = function(config) {
	config.set({
		frameworks: [
			'browserify',
			'qunit'
		],
		plugins: [
			'karma-browserify',
			'karma-phantomjs-launcher',
			'karma-chrome-launcher',
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
			debug: true
		},

		autoWatch: false,
		port: 9877,
		colors: true,
		singleRun: true,
		logLevel: config.LOG_INFO
	});
}
