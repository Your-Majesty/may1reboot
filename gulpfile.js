var gulp = require('gulp'),
  bower = require('bower'),
  changed = require('gulp-changed'),
  plumber = require('gulp-plumber'),
  postcss = require('gulp-postcss'),
  include = require("gulp-include"),
  sass = require("gulp-sass"),
  cssnext = require('cssnext'),
  precss = require('precss'),
  del = require('del'),
  runSequence = require('run-sequence'),
  shell = require('gulp-shell'),
  fs = require('fs'),
  gulpif = require('gulp-if'),
  uglify = require('gulp-uglify'),
  cleanCSS = require('gulp-clean-css'),
  rename = require('gulp-rename'),
  template = require('gulp-template'),
  htmlmin = require('gulp-htmlmin'),
  watch = require('gulp-watch');

function handleError(err) {
  console.log(err.toString());
  this.emit('end');
}

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

gulp.task('build-clean', function(callback) {
  return del(['build/**'], callback);
});

gulp.task('build-markup', function(callback) {

  var version = process.env.CIRCLE_TAG || process.env.CIRCLE_SHA1 || Date.now();

  var options = {
    version: version,
    cssExt: isProduction() ? 'min.css?v=' + version : 'css',
    jsExt: isProduction() ? 'min.js?v=' + version : 'js'
  };

  return gulp.src(['./source/**/*.html'])
    .pipe(plumber({ errorHandler: handleError }))
    .pipe(template(options))
    .pipe(gulpif(isProduction(), htmlmin({ collapseWhitespace: true })))
    .pipe(gulp.dest('./build'));
});

gulp.task('build-javascripts', function(callback) {
  return gulp.src('./source/js/main.js')
    .pipe(include())
    .on('error', console.log)
    .pipe(gulpif(isProduction(), uglify()))
    .pipe(gulpif(isProduction(), rename('main.min.js')))
    .pipe(gulp.dest('./build/js'));
});

gulp.task('build-stylesheets', function() {
  return gulp.src('./source/css/main.scss')
    .pipe(sass())
    .on('error', console.log)
    .pipe(gulpif(isProduction(), cleanCSS()))
    .pipe(gulpif(isProduction(), rename('main.min.css')))
    .pipe(gulp.dest('./build/css'));
});

gulp.task('build-assets', function(callback) {
  return gulp.src(['./source/**/*.{svg,png,jpg,json,mp3,wav,mp4,eot,ttf,woff,woff2,otf}'])
    .pipe(plumber({ errorHandler: handleError }))
    .pipe(gulp.dest('./build'));
});

gulp.task('build-surge', function(callback) {
  return gulp.src(['./.surgeignore'])
    .pipe(plumber({ errorHandler: handleError }))
    .pipe(gulp.dest('./build'));
});

gulp.task('build', function(callback) {
  runSequence('build-clean',
    'build-markup',
    'build-javascripts',
    'build-stylesheets',
    'build-assets',
    'build-surge',
    callback);
});

gulp.task('watch-markup', function() {
  watch('./source/**/*.html', function() {
    gulp.start("build-markup");
  })
});

gulp.task('watch-javascripts', function() {
  watch('source/**/*.js', function() {
    gulp.start("build-javascripts");
  })
});

gulp.task('watch-stylesheets', function() {
  watch('./source/**/*.scss', function() {
    gulp.start("build-stylesheets");
  })
});

gulp.task('watch-assets', function() {
  watch('./source/**/*.{svg,png,jpg,json,mp3,wav,mp4,eot,ttf,woff,woff2,otf}', function() {
    gulp.start("build-assets");
  })
});

gulp.task('watch', function(callback) {
  runSequence('watch-markup',
    'watch-javascripts',
    'watch-stylesheets',
    'watch-assets',
    callback);
});

gulp.task('deploy', ['build'], shell.task([
  'surge ./build --domain ym-m1r-v13.surge.sh'
]));

gulp.task('serve', ['build'], function() {

  var express = require('express'),
    morgan = require('morgan'),
    app = express(),
    port = 3000;

  app.use(morgan('dev'));
  app.use(express.static(__dirname + '/build'));
  app.listen(port);

  console.log('Listening on port %d', port);
});

gulp.task('serve-live', ['build'], shell.task([
  'cd build; live-server'
]));

gulp.task('live', ['serve-live', 'watch']);

gulp.task('default', ['serve', 'watch']);

