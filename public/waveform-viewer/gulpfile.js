'use strict';

var gulp = require('gulp');

var rename = require('gulp-rename');

var gutil = require('gulp-util');

var coffee = require('gulp-coffee');

var sourcemaps = require('gulp-sourcemaps');

gulp.task('coffee-waveform', function() {
    return gulp.src('index.coffee').pipe(sourcemaps.init()).pipe(coffee({
        bare: true
    }).on('error', gutil.log)).pipe(sourcemaps.write()).pipe(rename('waveform.js')).pipe(gulp.dest('./'));
});

gulp.task('watch', function() {
    return gulp.watch(['*.coffee'], ['coffe-waveform']);
});

gulp.task('default', ['coffee-waveform'], function() {
    return gulp.watch(['*.coffee'], ['coffee-waveform']);
})
