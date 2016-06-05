/*eslint-env __dirname */

import gulp from 'gulp';
import {Server} from 'karma';

gulp.task('test', function(done) {
  new Server({
    configFile: `${__dirname}/../karma.conf.js`,
    singleRun: true,
    autoWatch: false
  }, done).start();
});
