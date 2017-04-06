module.exports = {
	serve,
	watch
}

const builder = require('./build')
const {BUILD_DIR, UTILS_DIR, createSheathContext, requireWithSheath} = require('../config')
const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const nodemon = require('gulp-nodemon')
const path = require('path')
const port = process.env.PORT || 3000

let router
let served = false
let buildInfo
let hotReloading = []
let sheath = createSheathContext()


function serve() {
	if (served) return initCustomRouter()
	
	initSocket()
	initRouter()
	initCustomRouter()
	initServer()
	served = true
}


function watch() {
	let stream = nodemon('-w modules -w nodes -e js,jsx,jsxy,json,ejs -x "echo Spyce: Starting build"')
	let building = false

	stream.on('start', () => {
		if (building) return console.log('Spyce: A build is currently in progress. Build cancelled')
		
		building = true
		builder.build().then(newBuildInfo => {
			console.log('Spyce: Build successful')
			app.locals.buildInfo = buildInfo = newBuildInfo
			resetSheath()
			serve()
			hotReload()
			building = false
		}).catch(ex => {
			console.error('Spyce: An error was thrown while attempting to build', ex)
		})
	}).on('quit', () => {

	}).on('restart', files => {
		console.log('restarted due to:', files)
	})
}





// Helper Functions.
function hotReload() {
	if (hotReloading.length) io.emit('hotreload')
}


function initCustomRouter() {
	let routerFile = buildInfo.nodeFileMap.Router
	if (!routerFile) return
	
	requireWithSheath(routerFile, sheath)
	sheath.run('Router', Router => {
		router = Router
	})
}


function initRouter() {
	// Set up static serving of modules (development only).
	if (app.get('env') === 'development') {
		app.use(express.static(BUILD_DIR))
	}
	app.use((req, res, next) => {
		if (!router) return next()
		router(req, res, next)
	})
}


function initServer() {
	server.listen(port, () => {
		console.log('Server listening on port ' + port)
	})
}


function initSocket() {
	io.on('connection', socket => {
		let hotReloadMe = false
		socket.on('hotreloadme', () => {
			hotReloadMe = true
			hotReloading.push('me')
		})
		let stop = () => {
			if (hotReloadMe) hotReloading.pop()
			hotReloadMe = false
		}
		socket.on('unhotreloadme', stop)
		socket.on('disconnect', stop)
	})
}


function resetSheath() {
	sheath = createSheathContext()
	requireWithSheath(path.join(UTILS_DIR, 'sheath-node'), sheath)
	sheath.config.asyncResolver(name => {
		let file = buildInfo.nodeFileMap[name]
		if (!file) throw new Error('Spyce Error: Unknown node "' + name + '" requested.')
		
		return file
	})
}
