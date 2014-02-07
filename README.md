cartouche
=========

A minimal node.js image service powered by Amazon S3.

Install
-------

	npm install cartouche

Quick Overview
--------------

###Usage

`````javascript
var cartouche = require('cartouce')({
	
});

var photo = cartouche('/path/to/image.ext');

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