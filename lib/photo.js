var Q = require('q');
var lodash = require('lodash');
var gm = require('gm');
var temporary = require('temporary');
var uuid = require('node-uuid');

/**
 * Construct a new Photo object
 * @param {String} path				The path of the image to transform and upload
 * @param {Object} options			A bunch of options to apply to the general transformation
 * @param {Array} transformations	A set of transformations
 */

function Photo(client, path, options, transformations) {

    this.id = uuid.v1();

    // store client
    this.client = client;

    // store general options
    this.options = _.isObject(options) ? options : {};
    this.options = _.defaults(this.options, {
        name: "original"
    });

    // store transformations
    this.transformations = _.isArray(transformations) ? transformations : [];
    this.transformations.push(this.options);

    // build the output object
    this.o = {};
    this.o.url = {};

    // build the local representation of
    // the output object
    this.local = {};
    this.local.path = {};

    // create a temporary directory
    this.dir = new temporary.Dir();


};

/**
 * Obtain original image properties
 * @return {Promise}
 */

function analyze(photo) {

    var d = Q.deferred();

    gm(this.path)
        .size(this.path, function(err, size) {
            if (err) {
                d.reject(err);
            } else {
                // store size
                photo.size = size;
                d.resolve();
            }
        });

    return d.promise;

};

/**
 * Perform a complete set of transformations
 * @param  {Photo} photo
 * @param  {String} name  Transformation name
 * @return {Promise}
 */

function transform(photo, transformation) {

    var d = Q.deferred();

    // Augment transformation with general attributes
    transformation = _.defaults(transformation, photo.options);

    // Create a promise chain
    var chain = Q(photo, transformation);

    // Resize transformations
    if (transformation.resize) {
        chain.then(transformResize);
    }

    chain
        .done(function() {
            d.resolve(photo, transformation);
        })
        .fail(function(err) {
            d.reject(err);
        });

    return d.promise;

};

function getTransformationLocalPath(photo, transformation) {
    return photo.dir + '/' + photo.id + '_' + transformation.name + '.jpg';
};

function getTransformationRemotePath(photo, transformation) {
    return '/' + photo.id + '_' + transformation.name + '.jpg';
};

transformResize = function(photo, transformation) {

    var d = Q.deferred();

    var path = photo.path;
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
                d.reject(err);
            } else {
                this.local.path[transformation.name] = targetPath;
                d.resolve(photo, transformation);
            }
        });

    return d.promise;

};

/**
 * Upload a file to Amazon S3
 * @param  {Photo} photo
 * @param  {String} localPath
 * @param  {String} remotePath
 * @return {Promise}
 */

function upload(photo, transformations) {

    var deferred = Q.defer();

    var localPath = getTransformationLocalPath(photo, transformation);
    var remotePath = getTransformationRemotePath(photo, transformation);

    var uploader = photo.client.upload(localPath, remotePath, {
        'Content-Type': 'image/jpeg',
        'x-amz-acl': 'public-read'
    });

    uploader.on('error', function(err) {
        deferred.reject(err);
    });

    uploader.on('end', function(url) {
        deferred.resolve(url);
    });

    return deferred.promise;

};

/**
 * Perform all transformations and upload them
 * @return {Promise}
 */
Photo.prototype.save = function() {

    var deferred = Q.defer();

    var chain = Q.defer(this);

    // Perform all transformations
    _.each(this.transformations, function(transformation) {
        chain.then(function() {
            transform(this, transformation)
        });
    }, this);

    // Perform all uploads
    _.each(this.transformations, function(transformation) {
        chain.then(function() {
            upload(this, transformation)
        });
    }, this);

    var photo = this;

    chain
        .done(function() {
            photo.dir.rmdir();
            d.resolve(photo.o)
        })
        .fail(function(err) {
            d.reject(err)
        });

    return deferred.promise;

};

module.exports = Photo;
