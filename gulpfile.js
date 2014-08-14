/*

An experimental gulpfile that manages a simple cordova based app using
cordova-lib directly without cordova-cli.

Cordova project is created under ./build/ and treated as a build artifact.
`gulp clean` removes the build directory.
`gulp recreate` creates it afresh.

*/


/////// SETTINGS ////////////

// Plugins can't be stores in package.josn right now.
//  - They are published to plugin registry rather than npm.
//  - They don't list their dependency plugins in their package.json.
//    This might even be impossible because dependencies can be platform specific.
var plugins = ['org.apache.cordova.file'];

// Platform to use for run/emulate. Alternatively, create tasks like runios, runandroid.
var testPlatform = 'android';


var path = require('path');
var fs = require('fs');
var del = require('del');

var pkg = require('./package.json');
var gulp = require('gulp');
var jshint = require('gulp-jshint');
var cordova_lib = require('cordova-lib');
var cdv = cordova_lib.cordova.raw;
var buildDir = path.join(__dirname, 'build');


// List of platforms determined form pkd.dependencies. This way platform file
// downloading and version preferences are entirely handled by npm install.
var platforms = [];  // List like ['cordova-ios', 'cordova-android']
var platform_dirs = [];  // List of subdirs with platform files under node_moduels
for (p in cordova_lib.cordova_platforms) {
    var pname = 'cordova-' + p;
    if (pkg.dependencies[pname]) {
        platforms.push(pname);
        platform_dirs.push(path.join(__dirname, 'node_modules', pname));
        // TODO: Check if those dirs exist and if not ask the user to run "npm install"
    }

}


//////////////////////// TASKS /////////////////////////////

// All cordova-lib calls (except "cordova create") must be done from within
// the cordova project dir because cordova-lib determines projectRoot from
// process.cwd() in cordova-lib/src/cordova/util.js:isCordova()

gulp.task('jshint', function() {
    gulp.src('./src/www/js/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('clean', function(cb) {
  // Alternative package for cleaning is gulp-rimraf
  del(['build'], cb);
});

// Prepare is not really needed
gulp.task('prepare', function() {
    process.chdir(buildDir);
    return cdv.prepare();
});

gulp.task('build', function() {
    process.chdir(buildDir);
    return cdv.build();
});

gulp.task('run', function(cb) {
    process.chdir(buildDir);
    return cdv.run({platforms:[testPlatform], options:['--device']});
});

gulp.task('emulate', function() {
    process.chdir(buildDir);
    return cdv.emulate({platforms:[testPlatform]});
});

gulp.task('release', function() {
    process.chdir(buildDir);
    return cdv.build({options: ['--release']});
    // TODO: copy the apk file(s) out of ./build/.
});


// Create the cordova project under ./build/. This version doesn't use cordova
// create, instead just links config.xml and www/
gulp.task('recreate', ['clean'], function() {
    // TODO: remove "uri" when cordova-lib 0.21.7 is released.
    var srcDir = path.join(__dirname, 'src');

    fs.mkdirSync(buildDir);
    process.chdir(buildDir);

    fs.symlinkSync(path.join('..', 'src', 'config.xml'), 'config.xml');
    fs.symlinkSync(path.join('..', 'src', 'www'), 'www');
    // We could alternatively copy www and then watch it to copy changes.
    // Useful if using SASS CoffeeScrite etc.

    // Must first add plugins then platforms. If adding platforms first,
    // cordova fails expecting to find the ./build/plugins directory.
    // TODO: try 3rd param {cli_variables: {...}}.
    return cdv.plugins('add', plugins)
    .then(function() {
        return cdv.platform('add', platform_dirs);
    });
});


// Alternative version of recreate that uses "cordova create" rather than
// creating the links manually.
gulp.task('cdvcreate', ['clean'], function() {
    // TODO: remove "uri" when cordova-lib 0.21.7 is released.
    var srcDir = path.join(__dirname, 'src');
    cfg = {lib: {www: {uri: srcDir, url: srcDir, link: true}}};

    // TODO: Can app id be saved in package.json
    var appId = 'org.apache.cordova.example.HelloGulp';
    return cdv.create(buildDir, appId, pkg.name, cfg)
    .then(function() {
        // Further Cordova commands must be run inside the cordova project dir.
        process.chdir(buildDir);
    })
    .then(function() {
        return cdv.platform('add', platform_dirs);
    })
    .then(function() {
        // TODO: try 3rd param, cli_variables etc.
        return cdv.plugins('add', plugins);
    });
});
