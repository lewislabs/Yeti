var gulp = require('gulp');
var mainBower = require('main-bower-files')
var ts = require('gulp-typescript');
var sourcemaps = require('gulp-sourcemaps');

gulp.task('copyBower', function(){
    return gulp.src(mainBower())
                .pipe(gulp.dest('build/client/lib'));
});

gulp.task('buildServer', function(){
    return gulp.src('server/*.ts')
        .pipe(sourcemaps.init())
        .pipe(ts({
            target: 'es5',
            module: 'commonjs',
        }))
        .js
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('build/server'));    
});

gulp.task('copyCerts', function(){
   return gulp.src('server/betfair_api.*')
              .pipe(gulp.dest('build/server')); 
});

gulp.task('watch', function(){
    return gulp.watch('server/*.ts',['buildServer']); 
});
gulp.task('default', ['buildServer', 'copyCerts']);