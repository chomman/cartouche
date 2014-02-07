var Photo = require('./lib/photo');
var s3 = require('s3');

var Cartouche = function(config) {

    // Open a new Amazon S3 connection
    var client = s3.createClient({
        key: config.key,
        secret: config.secret,
        bucket: config.bucket
    });

    return function(path, options, transformations) {
        return new Photo(client, path, options, transformations);
    };

};

module.exports = function(config) {
    return new Photo(config);
};