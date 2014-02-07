var async = require('async');
var _ = require('lodash');
var gm = require('gm');
var temporary = require('temporary');
var uuid = require('node-uuid');

/**
 * Construct a new Photo object
 * @param {String} path             The path of the image to transform and upload
 * @param {Object} options          A bunch of options to apply to the general transformation
 * @param {Array} transformations   A set of transformations
 */

function Photo(client, path, options, transformations) {

    this.id = uuid.v1();

    this.path = path;

    // store client
    this.client = client;

    // store general options
    this.options = _.isObject(options) ? options : {};

    // store default transformation
    this.transformations = [{
        name: "original"
    }];

    // store users' transformations
    _.each(transformations, function(transformation) {
        this.add(transformation);
    }, this);

    // build the output object
    this.o = {};
    this.o.url = {};

    // build the local representation of
    // the output object
    this.local = {};
    this.local.path = {};
    this.local.path.original = path;

    // create a temporary directory
    this.dir = new temporary.Dir();


};

/**
 * Obtain original image properties
 * @return {Promise}
 */

function analyze(photo, _callback) {

    gm(photo.local.path.original)
        .size(photo.local.path.original, function(err, size) {
            if (err) {
                _callback(err);
            } else {
                // store size
                photo.o.size = size;
                _callback();
            }
        });

};

/**
 * Perform a complete set of transformations
 * @param  {Photo} photo
 * @param  {String} name  Transformation name
 * @return {Promise}
 */

function transform(photo, transformation, _callback) {

    // Create an async chain
    var actions = [
        function(_callback) {
            _callback();
        }
    ];

    // Resize transformations
    if (transformation.resize) {
        actions.push(function(_callback) {
            transformResize(photo, transformation, _callback);
        });
    }

    async.series(actions, function(err) {
        _callback(err);
    });

};

function getTransformationLocalPath(photo, transformation) {
    return photo.dir.path + '/' + photo.id + '_' + transformation.name + '.jpg';
};

function getTransformationRemotePath(photo, transformation) {
    return '/' + photo.id + '_' + transformation.name + '.jpg';
};

transformResize = function(photo, transformation, _callback) {

    var path = photo.local.path.original
    var targetPath = getTransformationLocalPath(photo, transformation);

    // check if the current picture has already been treated
    // (eg. squared, blurred or rounded)
    if (photo.local.path[transformation.name]) {
        path = photo.local.path[transformation.name];
    }

    gm(path)
        .resize(transformation.resize.width, transformation.resize.height)
        .write(targetPath, function(err) {
            if (err) {
                _callback(err);
            } else {
                photo.local.path[transformation.name] = targetPath;
                _callback();
            }
        });

};

/**
 * Upload a file to Amazon S3
 * @param  {Photo} photo
 * @param  {String} localPath
 * @param  {String} remotePath
 * @return {Promise}
 */

function upload(photo, transformation, _callback) {

    var localPath = photo.local.path[transformation.name];
    var remotePath = getTransformationRemotePath(photo, transformation);

    var uploader = photo.client.upload(localPath, remotePath, {
        'Content-Type': 'image/jpeg',
        'x-amz-acl': 'public-read'
    });

    uploader.on('error', function(err) {
        _callback(err);
    });

    uploader.on('end', function(url) {
        photo.o.url[transformation.name] = url;
        _callback();
    });

};

Photo.prototype.add = function(transformation) {
    this.transformations.push(_.defaults(transformation, this.options));
    return this;
};

/**
 * Perform all transformations and upload them
 * @return {Promise}
 */
Photo.prototype.save = function(_callback) {

    var photo = this;

    // Create an async chain
    var actions = [
        function(_callback) {
            analyze(photo, _callback);
        }
    ];

    // Perform all transformations
    _.each(photo.transformations, function(transformation, i) {

        actions.push(function(_callback) {
            transform(photo, transformation, _callback)
        });

        // Re-carry original picture analysis
        // if it has been transformed
        if (transformation.name === "original" && photo.path !== photo.local.path) {
            actions.push(function(_callback) {
                analyze(photo, _callback);
            });
        }

    }, photo);

    // Perform all uploads
    _.each(photo.transformations, function(transformation, i) {
        actions.push(function(_callback) {
            upload(photo, transformation, _callback)
        });
    }, photo);

    async.series(actions, function(err) {
        if (err) {
            _callback(err);
        } else {
            _callback(null, photo.o);
        }
    });

};

module.exports = Photo;
