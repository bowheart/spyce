module.exports = {
	serveApp
}

const path = require('path')

// Spyce can also be included as a sheath module.
if (typeof sheath === 'function') sheath('spyce', () => module.exports)


/*
	spyce.serveApp() -- Serve an app with a given template.
	Registers an express middleware function.
*/
function serveApp(appName, tpl) {
	return (req, res, next) => {
		let app = req.app.locals.buildInfo.apps[appName]
		if (!app) next(new ReferenceError('Spyce Error: App "' + appName + '" not found.'))

		let scripts = defaultScripts() + scriptify(app.libs) + scriptify(app.files, true)
		let context = {
			app: {scripts},
			hotreload: {scripts: hotreloadScripts()}
		}
		res.render(tpl, context)
	}
}





// Helper Functions.

function defaultScripts() {
	return `
		<script src="http://localhost/npm-modules/sheath-js/src/sheath.js"></script>
		<script>
			sheath.config.mode('${process.env.NODE_ENV || 'production'}')
			sheath.on('asyncPhase', function() {
				sheath.css && sheath.css.inject()
			})
		</script>
	`
}

function hotreloadScripts() {
	return `
		<script src="https://cdn.socket.io/socket.io-1.2.0.js"></script>
		<script>
			(function() {
				var socket = io()
				socket.emit('hotreloadme')
				socket.on('hotreload', function() {
					window.location.reload()
				})
			}())
		</script>
	`
}

/*
	moduleWebPath() -- Get the web-facing path of a module from its absolute file path.
*/
function moduleWebPath(file) {
	if (!/node_modules\/spyce\/build\/modules/.test(file)) throw new Error('Spyce Error: Invalid module file.')

	return file.split('node_modules/spyce/build/').pop()
}

function scriptify(files, findWebPaths) {
	return files.map(file => '<script src="' + (findWebPaths ? moduleWebPath(file) : file) + '"></script>').join``
}
