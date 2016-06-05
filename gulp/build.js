/*eslint-env __dirname */

import gulp from 'gulp';
import rollup from 'gulp-rollup';
import babel from 'rollup-plugin-babel';
import json from 'rollup-plugin-json';
import preset from 'babel-preset-es2015-rollup';
import plumber from 'gulp-plumber';
import sourcemaps from 'gulp-sourcemaps';
import filter from 'gulp-filter';
import rename from 'gulp-rename';
import uglify from 'gulp-uglify';
import file from 'gulp-file';

import banner from './_copyright';
import {name} from '../package.json';

const srcPath = 'src/';
const buildPath = 'dist/';

function buildLib(dest) {
  return gulp.src(`${srcPath}${name}.js`, {read: false})
    .on('error', function(err) {
      console.log(err);
      this.emit('end');
    })
    .pipe(rollup({
      entry: `${srcPath}${name}.js`,
      external: [
        'underscore',
        'backbone'
      ],
      plugins: [
        json(),
        babel({
          sourceMaps: true,
          presets: [preset],
          babelrc: false
        })
      ],
      sourceMap: true,
      format: 'umd',
      moduleName: 'BackboneRelational',
      banner,
      globals: {
        backbone: 'Backbone',
        underscore: '_'
      }
    }))
    .pipe(plumber())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest(dest)) // non-minified
    .pipe(filter(['**/*.js', '!**/*.js.map']))
    .pipe(rename(`${name}.min.js`))
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(uglify({
      preserveComments: 'license'
     }))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest(dest)); // minified
}

gulp.task('build', function() {
  buildLib(buildPath);
});
