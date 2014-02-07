cartouche
=========

A minimal node.js image service powered by Amazon S3.

Install
-------

	npm install cartouche

Quick Overview
--------------

###Usage

Just get an [Amazon Simple Storage Service](http://aws.amazon.com/documentation/s3/) instance running and include cartouche in your node application.

`````javascript
var cartouche = require('cartouche')({
    key: '<AMAZON_S3_API_KEY>',
    secret: '<AMAZON_S3_SECRET_KEY>',
    bucket: '<AMAZON_S3_BUCKET>'	
});
`````

It's then super simple to upload picture to your S3 bucket.

`````javascript
var photo = cartouche('/path/to/image');

photo.save(function(err, photoData){
	if(!err) console.log(photoData);
});
`````

####Transformations

Cartouche 

`````javascript
var photo = cartouche('/path/to/image', {
	resize: {
		width: 200 // will resize the image to have a width of 200px before uploading it
	}
});

photo.save(function(err, photoData){
	if(!err) console.log(photoData);
});
`````

Author
------

* [Olivier Lesnicki](https://github.com/olivierlesnicki)


License
-------

Licensed under the MIT License.