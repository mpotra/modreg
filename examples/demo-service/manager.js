var debug = require('debug')('demo-service')
var modreg = require('./../../index.js')
var manager
var map = new Map() // custom map

debug('Create the manager, using custom map')
manager = modreg({'map': map})

// Install a custom service.
manager.install( require('./services/service-example-one') )
        .then(services => debug('installed [service-example-one]: %j', services))
        .catch(e => debug('error installing [service-example-one]: %s', e))

// Install two more services, defined in the same module.
// [service-1] should fail, because already installed by `services/service-example-one`
manager.install( require('./services/service-example-two') )
        .then(services => debug('installed [service-example-two]: %j', services))
        .catch(e => debug('error installing [service-example-two]: %s', e))
