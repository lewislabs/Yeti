var fs = require('fs');
var path = require('path');
var es = require('event-stream');
var gulp = require('gulp');
var tsify = require('tsify');
var sourcemaps = require('gulp-sourcemaps');
var ts = require('gulp-typescript');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var glob = require('glob');
var clean = require('gulp-clean');
var resolve = require('resolve');

var config = {
    clientBase: 'client/',
    serverBase: 'server/',
    buildBase: 'build/',
    buildClientBase: 'build/client/',
    buildServerBase: 'build/server/',
    typescriptGlob: '**/*.ts*',
    viewsGlob: '**/*.htm*',
    clientTsdConfig: { target: 'es5', module: 'commonjs', jsx: 'react' },
    serverTsdConfig: { target: 'es5', module: 'commonjs' }
};

var vendorConfig = {
    vendorModules: ['react-dom', 'react', 'jquery']
};


var getFolders = function(dir) {
    return fs.readdirSync(dir)
        .filter(function(file) {
            return fs.statSync(path.join(dir, file)).isDirectory();
        });
};

gulp.task('build:client:buildVendorBundle', function(){
    var b = browserify();
    for (var index = 0; index < vendorConfig.vendorModules.length; index++) {
        var vendor = vendorConfig.vendorModules[index];
        var resolvedPath = resolve.sync(vendor);
        console.log('Resolved vendor package '+ vendor + ' to '+ resolvedPath);
        b.require(resolvedPath, {expose: vendor});
    }
    return b.bundle()
            .on('error', function (err) {
                console.log(err);
            })
            .pipe(source('vendor.js'))
            .pipe(gulp.dest(config.buildClientBase));
});

gulp.task('build:client:copyPages', ['clean:client'], function() {
    return gulp.src(config.clientBase + config.viewsGlob)
        .pipe(gulp.dest(config.buildClientBase));
});

gulp.task('build:client', ['build:client:copyPages', 'build:client:buildVendorBundle'], function() {
    var folders = getFolders(config.clientBase);
    var tasks = folders.map(function(folder) {
        console.log("Browserifying typescript files from " + folder + config.typescriptGlob);
        var b = browserify();
        var files = glob.sync(config.clientBase + folder + config.typescriptGlob, { nonnull: false });
        if (!files) {
            console.log('No files found under ' + config.clientBase + folder);
            return;
        }
        files.forEach(function(file, i, all) {
            console.log('Browserifying file : ' + file);
            b.add(file);
        });
        vendorConfig.vendorModules.forEach(function(vendor, i){
           b.external(vendor); 
        });
        return b.plugin(tsify, config.clientTsdConfig)
            .bundle()
            .pipe(source('bundle.js'))
            .pipe(gulp.dest(config.buildClientBase + folder));
    });
    return es.merge(tasks);
});

gulp.task('build:server', ['build:server:copyCerts'], function() {
    return gulp.src(config.serverBase + config.typescriptGlob)
        .pipe(sourcemaps.init())
        .pipe(ts(config.serverTsdConfig))
        .js
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(config.buildServerBase));
});

gulp.task('build:server:copyCerts', ['clean:server'], function() {
    return gulp.src(config.serverBase + 'betfair_api.*')
        .pipe(gulp.dest(config.buildServerBase));
});



gulp.task('clean:server', function(cb) {
    return gulp.src(config.buildServerBase, { read: false }).pipe(clean({ force: true }));
});

gulp.task('clean:client', function() {
    return gulp.src(config.buildClientBase, { read: false }).pipe(clean({ force: true }));
});

gulp.task('clean', ['clean:client', 'clean:server']);

gulp.task('watch:server', function(){
    return gulp.watch('server/*.ts', ['clean:server', 'build:server']);
});

gulp.task('watch:client', function(){
    return gulp.watch('client/**/*.ts*', ['clean:client', 'build:client']);
});

gulp.task('watch', ['watch:client', 'watch:server']);

gulp.task('default', ['clean:server', 'clean:client', 'build:server', 'build:client'])
