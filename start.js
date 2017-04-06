const server = require('./utils/server')

const commands = {
	serve() {
		server.watch()
	}
}


let args = process.argv.slice(2)
let command = args.shift()

if (!commands[command]) return USAGE()
commands[command]()



// Helper functions.

function USAGE() {
	console.log('USAGE: node ./node_modules/spyce/start.js <command>\n\nwhere <command> is one of ["serve"]')
}
