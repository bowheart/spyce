#!/usr/bin/env node

const execSync = require('child_process').execSync
const fs = require('fs')
const path = require('path')
const packageJsonFile = path.resolve('./package.json')
let packageJson

try {
	packageJson = require(packageJsonFile)
} catch (ex) {
	console.error('Spyce Cli: The current directory must be an initialized npm module before spyce can be used (run `npm init`).')
	return
}


const commands = {
	init() {
		execSync(`mkdir assets modules nodes && echo "${basicRouter()}" > nodes/Router.js && echo "${basicApp()}" > modules/HomeApp.js && echo "${basicTemplate()}" > nodes/home.ejs`)
		
		let scripts = packageJson.scripts || (packageJson.scripts = {})
		scripts.start = 'node ./node_modules/spyce/start.js serve'
		scripts.debug = 'node --inspect=5885 ./node_modules/spyce/start.js serve'
		packageJson.spycePlugins = ['spyce']
		
		writePackageJson()
		execSync('npm link spyce')
		console.log('Spyce app initialized. Use `npm start` to build and serve your new app. Use `npm run debug` to debug it.')
	},
	
	install() {
		let dep = args.shift()
		if (!dep) return console.log('USAGE: spyce install <npm-module>\n\n where <npm-module> is the name of a module in the npm registry.')
		
		execSync(`npm install --save ${dep}`)
		let spycePlugins = packageJson.spycePlugins || (packageJson.spycePlugins = [])
		spycePlugins.push(dep)
		
		writePackageJson()
		console.log(`Spyce module ${dep} installed`)
	},
	
	kill() {
		execSync('rm -rf nodes modules && npm unlink spyce')
		console.log('Spyce app killed.')
	}
}


let args = process.argv.slice(2)
let command = args.shift()
return commands[command]
	? commands[command]()
	: usage()



// Helper functions.

function basicApp() {
	return (
`sheath(() => {
	let suffix = sheath.config.mode() === 'production' ? '.min' : ''
	sheath.lib
		('css', 'SheathCss.utils', \\\`http://localhost/npm-modules/sheath-css/src/sheath-css.js\\\`)
		('React', \\\`https://unpkg.com/react@15/dist/react$\{suffix}.js\\\`)
		('ReactDOM', \\\`https://unpkg.com/react-dom@15/dist/react-dom$\{suffix}.js\\\`)
})

sheath('HomeApp', ['React', 'ReactDOM', 'css!reset'], (React, ReactDOM) => {
	ReactDOM.render(
		<h1>Welcome to spyce</h1>,
		document.getElementById('app')
	)
})

sheath.css('reset', 'css', css => {
	let bg = css.color('#f7')
	let text = css.color('#3')
	return <<
		@import url('https://fonts.googleapis.com/css?family=Open+Sans');
		
		body {
			background: [bg];
			color: [text];
			font-family: 'Open Sans', Helvetica, sans-serif;
			margin: 0;
		}
	>>
})`
	)
}

function basicRouter() {
	return (
`const express = require('express')
const path = require('path')

sheath('Router', ['Home'], Home => {
	let router = express.Router()
	
	router.use(express.static('assets'))
	router.use('/', Home)
	
	return router
})

sheath('Home', 'spyce', spyce => {
	let router = express.Router()
	
	router.get('/', spyce.serveApp('HomeApp', path.resolve(__filename, '../home.ejs')))
	
	return router
})`
	)
}

function basicTemplate() {
	return (
`<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8">
		<title>Spyce Home</title>
	</head>
	<body>
		<div id="app"></div>
		<%- app.scripts %>
		<%- hotreload.scripts %>
	</body>
</html>`
	)
}

function usage() {
	console.log('USAGE: spyce <command>\n\nwhere <command> is one of: ["init"]')
}

function writePackageJson() {
	fs.writeFileSync(packageJsonFile, JSON.stringify(packageJson, null, 2))
}
