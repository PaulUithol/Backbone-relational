import gulp from 'gulp';

gulp.task('watch', function() {
  // watch for source code changes or test case changes
  gulp.watch([
    `${__dirname}/../src/**/*.js`,
    `${__dirname}/../test/**/*.js`
  ], ['build', 'test']);
});
