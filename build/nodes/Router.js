'use strict';

var express = require('express');
var path = require('path');

sheath('Router', ['Home'], function (Home) {
	var router = express.Router();

	router.use(function (req, res, next) {
		console.log('serving...', req.url);
		next();
	});
	router.use(express.static('assets'));
	router.use('/', Home);

	return router;
});

sheath('Home', 'spyce', function (spyce) {
	var router = express.Router();

	router.get('/', spyce.serveApp('HomeApp', path.resolve(__filename, '../home.ejs')));

	return router;
});