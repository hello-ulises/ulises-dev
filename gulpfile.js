var gulp = require('gulp'),
    browserify = require('browserify'),
    source = require('vinyl-source-stream'),
    buffer = require('vinyl-buffer'),
    jshint = require('gulp-jshint'),
    cp = require('child_process').exec,
    uglify = require('gulp-uglify'),
    bs = require('browser-sync').create();

var src = './assets',
    dest = './_site/assets';

// Task for building blog when something changed:
gulp.task('jekyll',['js'], function(){
    return cp('bundler exec jekyll build --watch --future',
        function(err,stdout,stderr){
            console.log(err);
            console.log(stdout);
            console.log(stderr);
        });
});

// Task for serving blog with Browsersync
gulp.task('serve', ['js'], function () {
    bs.init({server: {baseDir: '_site/'}, port: 4000});
    // Reloads page when some of the already built files changed:
    gulp.watch('_site/**/*.*').on('change', bs.reload);
});

gulp.task('js', function(){
    return browserify({
        entries: './components/main.js',
        debug: true
    }).bundle()
        .pipe(source('main.min.js'))
        .pipe(jshint())
        // .pipe(buffer())
        // .pipe(uglify())
        .pipe(gulp.dest(src + '/js'));
});

gulp.task('watch',function(){
    gulp.watch('./components/*.js', ['js']);
});

gulp.task('default', ['js','watch','serve']);