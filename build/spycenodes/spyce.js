'use strict';

var _templateObject = _taggedTemplateLiteral([''], ['']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

module.exports = {
	serveApp: serveApp
};

var path = require('path');

// Spyce can also be included as a sheath module.
if (typeof sheath === 'function') sheath('spyce', function () {
	return module.exports;
});

/*
	spyce.serveApp() -- Serve an app with a given template.
	Registers an express middleware function.
*/
function serveApp(appName, tpl) {
	return function (req, res, next) {
		var app = req.app.locals.buildInfo.apps[appName];
		if (!app) next(new ReferenceError('Spyce Error: App "' + appName + '" not found.'));

		var scripts = defaultScripts() + scriptify(app.libs) + scriptify(app.files, true);
		var context = {
			app: { scripts: scripts },
			hotreload: { scripts: hotreloadScripts() }
		};
		res.render(tpl, context);
	};
}

// Helper Functions.

function defaultScripts() {
	return '\n\t\t<script src="http://localhost/npm-modules/sheath-js/src/sheath.js"></script>\n\t\t<script>\n\t\t\tsheath.config.mode(\'' + (process.env.NODE_ENV || 'production') + '\')\n\t\t\tsheath.on(\'asyncPhase\', function() {\n\t\t\t\tsheath.css && sheath.css.inject()\n\t\t\t})\n\t\t</script>\n\t';
}

function hotreloadScripts() {
	return '\n\t\t<script src="https://cdn.socket.io/socket.io-1.2.0.js"></script>\n\t\t<script>\n\t\t\t(function() {\n\t\t\t\tvar socket = io()\n\t\t\t\tsocket.emit(\'hotreloadme\')\n\t\t\t\tsocket.on(\'hotreload\', function() {\n\t\t\t\t\twindow.location.reload()\n\t\t\t\t})\n\t\t\t}())\n\t\t</script>\n\t';
}

/*
	moduleWebPath() -- Get the web-facing path of a module from its absolute file path.
*/
function moduleWebPath(file) {
	if (!/node_modules\/spyce\/build\/modules/.test(file)) throw new Error('Spyce Error: Invalid module file.');

	return file.split('node_modules/spyce/build/').pop();
}

function scriptify(files, findWebPaths) {
	return files.map(function (file) {
		return '<script src="' + (findWebPaths ? moduleWebPath(file) : file) + '"></script>';
	}).join(_templateObject);
}