"use strict";
var debug = require('debug')('demo-service:service-example-one')

// Simple implementation on one registration.
const serviceName = 'service-1'

// The module exports a `fnInstall()` function that receives
// the `register` function as argument.
module.exports = function (register) {
  debug('requesting registration of [%s]:', serviceName)
  
  // Return a promise, to signal the manager that it needs to wait
  // for a `commit()` or `cancel()`.
  return register(serviceName)
            .then(registration => {
              debug('Successfully registered %s', serviceName)
              
              // Create an object to commit.
              let service = {}
              service.start = () => { debug('%s.start()', serviceName) }
              service.stop = () => { debug('%s.stop()', serviceName) }
              
              // Commit to this registration.
              registration.commit(service)
                          .then(() => debug('Successful commit for [%s]', serviceName))
                          .catch(e => debug('Failed commit for [%s]: %s', serviceName, e))
                          
              // No need to return a promise here, since `commit`
              // has already been called before the promise, that is
              // being returned, solves
            })
            .catch(error => {
              debug('ERROR: %s', error)
            })
  
}