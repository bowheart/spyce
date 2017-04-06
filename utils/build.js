module.exports = {
	build() {
		let builder = new Builder()
		return builder.build()
	}
}


const {MODULES_DIR, NODES_DIR, BUILD_DIR, UTILS_DIR, BABELRC, ENV, createSheathContext, requireWithSheath, waterfall} = require('../config')
const babel = require('babel-core')
const fs = require('fs')
const hss = require('../lang/hss')
const path = require('path')
const rmdir = require('rimraf')
const uglify = require('uglify-js')
const vm = require('vm')


class Builder {
	constructor() {
		this.moduleFileMap = {}
		this.apps = {} // map every app to all module and lib files it needs (listed in optimal load order)
		this.nodeFileMap = {}
		this.currentFile = ''
	}
	
	prepSheath(fileMap) {
		return waterfall(drip => {
			let sheath = this.sheath = createSheathContext()
			
			sheath.config.async(false).mode('analyze')
			sheath.on('moduleDeclared', (name, deps, factory) => {
				fileMap[name] = this.currentFile
			})
			sheath.on('syncPhase', drip) // get sheath past the config phase before we start declaring modules
		}).drop(drip => {
			this.runJsFile(require.resolve('sheath-css'))
			drip()
		})
	}
	
	build() {
		let plugins = []
		this.findSpycePlugins(path.resolve('.'), '', plugins)
		
		return waterfall(drip => {
			this.createWorkspace()
				.then(drip).catch(drip.stop)
		}).drop(drip => {
			
			// Run modules.
			this.prepSheath(this.moduleFileMap)
				.then(drip).catch(drip.stop)
		}).drop(drip => {
			waterfall.all(plugins.map(plugin =>
				this.spider(path.join(plugin.absPath, 'modules'), plugin.relPath + 'modules')
			)).then(drip).catch(drip.stop)
		}).drop(drip => {
			this.mapApps()
			
			// Run nodes (and built-in nodes).
			this.prepSheath(this.nodeFileMap)
				.then(drip).catch(drip.stop)
		}).drop(drip => {
			waterfall.all(plugins.map(plugin =>
				this.spider(path.join(plugin.absPath, 'nodes'), plugin.relPath + 'nodes')
			)).then(drip).catch(drip.stop)
		}).drop(drip => {
			let {moduleFileMap, apps, nodeFileMap} = this
			let buildInfo = {moduleFileMap, apps, nodeFileMap}
			let infoFile = path.join(BUILD_DIR, 'buildInfo.json')
			fs.writeFile(infoFile, JSON.stringify(buildInfo), drip.bind(null, buildInfo))
		}).drop((drip, buildInfo, err) => {
			if (err) throw err
			
			drip(buildInfo)
		})
	}
	
	createWorkspace() {
		return waterfall(drip => {
			rmdir(BUILD_DIR, drip)
		}).drop(drip => {
			fs.mkdir(BUILD_DIR, drip)
		}).drop((drip, err) => {
			if (err) throw err
			
			drip()
		})
	}
	
	spider(absPath, relPath) {
		return waterfall(drip => {
			fs.readdir(absPath, drip)
		}).drop((drip, err, files) => {
			if (err) {
				// It's a file. Proceed with the next task.
				if (err.code === 'ENOTDIR') return this.processFile(absPath, relPath, drip.skip)
				
				drip.skip() // this directory was not found; ignore
			}
			fs.mkdir(path.join(BUILD_DIR, relPath), drip.bind(null, files))
		}).drop((drip, files, err) => {
			if (err) throw err // we should never hit this
			
			waterfall.all(files.map(file =>
				this.spider(path.join(absPath, file), path.join(relPath, file))
			)).then(drip)
		})
	}
	
	processFile(absPath, relPath, resolve) {
		let ext = path.extname(absPath)
		let targetFile = path.join(BUILD_DIR, relPath)
		
		ext.slice(0, 3) === '.js'
			? this.transpileFile(absPath, targetFile, resolve)
			: this.copyFile(absPath, targetFile, resolve)
	}
	
	/*
		Builder.transpileFile() -- Run the code through hss, babel, and uglify.
		This step is "dumb" -- it doesn't know anything about what its transpiled code is doing. It just makes all files servable.
	*/
	transpileFile(source, target, resolve) {
		waterfall(drip => {
			// 1) Run through Hybrid-Stylesheets converter.
			hss.transpile(source, drip)
		}).drop((drip, js) => {
			// 2) Run through Babel.
			js = babel.transform(js, {extends: BABELRC}).code
			
			// 3) Uglify.
			if (ENV === 'production') {
				js = uglify.minify(transformed, {fromString: true}).code
				target = target.replace('.js', '.min.js')
			}
			
			fs.writeFile(target, js, drip)
		}).then(err => {
			if (err) throw err // shouldn't happen
			
			this.runJsFile(target, resolve)
		}).catch(ex => {
			console.error('Spyce: Failed writing to file "' + target + '".')
		})
	}
	
	copyFile(source, target, resolve) {
		let resolved = false

		let readStream = fs.createReadStream(source)
		readStream.on('error', done)
		
		let writeStream = fs.createWriteStream(target)
		writeStream.on('error', done)
		writeStream.on('close', done)
		
		readStream.pipe(writeStream)

		function done(err) {
			if (resolved || !resolve) return
			
			resolve(err)
			resolved = true
		}
	}
	
	runJsFile(file, resolve) {
		this.currentFile = file
		requireWithSheath(file, this.sheath)
		resolve && resolve()
	}
	
	mapApps() {
		let forest = this.sheath.forest()
		let libNames = this.sheath.lib.names()
		let libFiles = this.sheath.lib.files()
		
		Object.keys(forest).forEach(key => {
			this.apps[key] = {files: [], libs: libFiles}
			
			let modules = forest[key]
			modules.forEach(moduleName => {
				// Ignore if we've already added this module's file to the map.
				if (this.apps[key].files.includes(this.moduleFileMap[moduleName])) return
				
				if (libNames.includes(moduleName)) return // it's a lib; don't add it to the list of module files
				this.apps[key].files.push(this.moduleFileMap[moduleName])
			})
		})
	}
	
	findSpycePlugins(dir, relPath, plugins = []) {
		let packageJsonFile = path.join(dir, 'package.json')
		let packageJson = require(packageJsonFile)
		let subPlugins = packageJson.spycePlugins || []
		
		plugins.push({absPath: dir, relPath: relPath})
		subPlugins.forEach(plugin => {
			this.findSpycePlugins(path.join(dir, 'node_modules', plugin), plugin, plugins)
		})
	}
}
