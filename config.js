const fs = require('fs')
const path = require('path')
const sheath = require('sheath-js')

const MODULES_DIR = 'modules'
const NODES_DIR = 'nodes'
const REL_SPYCE_DIR = 'node_modules/spyce'

const SPYCE_DIR = path.resolve(REL_SPYCE_DIR)
const BABELRC = path.join(SPYCE_DIR, '.babelrc')
const BUILD_DIR = path.join(SPYCE_DIR, 'build')
const UTILS_DIR = path.join(SPYCE_DIR, 'utils')
const ENV = process.env.NODE_ENV || 'development'


module.exports = {
	MODULES_DIR,
	NODES_DIR,
	SPYCE_DIR,
	BUILD_DIR,
	UTILS_DIR,
	BABELRC,
	ENV,
	createSheathContext,
	requireNoCache,
	requireWithSheath,
	waterfall
}


function createSheathContext() {
	return requireNoCache('sheath-js')
}

function requireNoCache(file) {
	delete require.cache[require.resolve(file)]
	return require(file)
}

function requireWithSheath(file, sheath) {
	if (sheath.const('__files__')) {
		if (sheath.const('__files__')[file]) return // this sheath has already loaded this file
	} else sheath.const('__files__', {})
	
	global.sheath = sheath
	requireNoCache(file)
	sheath.const('__files__')[file] = true
}
