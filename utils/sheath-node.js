/*
	Sheath-node
	Another library by Joshua Claunch -- https://github.com/bowheart
*/
if (typeof sheath !== 'function') throw new Error('Sheath-node Error: Sheath must be defined on the global scope before Sheath-node can be loaded.')

// Use sheath.registerMod() in place of an IIFE to house Sheath-node's code.
sheath.registerMod('node', function(link) {
	var names = []
	
	/*
		sheath.node() -- A utility for creating modular node with dependency injection.
		Signature is exactly the same as sheath()
	*/
	var api = function(name, deps, factory) {
		names.push(name)
		
		link('node!' + name, deps, function() {
			var node = factory.apply(this, arguments)
			if (typeof node === 'undefined') node = this.exports
			
			if (typeof node !== 'object') {
				throw new TypeError('SheathNode Error: Node factory must return an object.')
			}
			
			var routes = node.routes
			if (routes && (typeof routes !== 'object' || Array.isArray(routes))) {
				throw new TypeError('SheathNode Error: Node "routes" property must be an object, if specified.')
			}
			return node // inject the node into dependents
		})
	}
	
	api.names = function() {
		// Map so we're not exposing internal data.
		return names.map(function(name) {
			return name
		})
	}
	
	var handle = function() {
		// Nothing to handle or resolve; all node! modules are linked.
	}
	
	return {api, handle}
})
