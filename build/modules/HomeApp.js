'use strict';

sheath(function () {
	var suffix = sheath.config.mode() === 'production' ? '.min' : '';
	sheath.lib('css', 'SheathCss.utils', 'http://localhost/npm-modules/sheath-css/src/sheath-css.js')('React', 'https://unpkg.com/react@15/dist/react.js')('ReactDOM', 'https://unpkg.com/react-dom@15/dist/react-dom.js');
});

sheath('HomeApp', ['React', 'ReactDOM', 'css!reset'], function (React, ReactDOM) {
	ReactDOM.render(React.createElement(
		'h1',
		null,
		'Welcome to spyce'
	), document.getElementById('app'));
});

sheath.css('reset', 'css', function (css) {
	var bg = css.color('#f7');
	var text = css.color('#3');
	return sheath.css.evaluate('@import url(\'https://fonts.googleapis.com/css?family=Open+Sans\'); body { background: ' + sheath.css.jsExpr(bg) + '; color: ' + sheath.css.jsExpr(text) + '; font-family: \'Open Sans\', Helvetica, sans-serif; margin: 0; }');
});