import lib_debug from 'debug'
const debug = lib_debug('demo-service:service-example-two')

// A custom module that attempts to register two services.
const services = ['service-1', 'service-2']

// The module exports a `fnInstall()` function that receives
// the `register` function as argument.
export default function(register) {
  debug('requesting registration of [%s]:', services.join(','))
  
  var requests
  
  // Store promises to each register() request.
  requests = services.map((serviceName) => {
    // Request to register `serviceName`
    let request = register(serviceName).then((registration) => {
      debug('Successful registration of [%s]:', serviceName)
      
      // Create an object to commit.
      let service = {}
      service.start = () => { debug('%s.start()', serviceName) }
      service.stop = () => { debug('%s.stop()', serviceName) }
      
      registration.commit(service)
        .then(() => debug('Successful commit for [%s]', serviceName))
        .catch((e) => debug('Failed commit for [%s]: %s', serviceName, e))
    })

    // Also catch errors so that Promise.all wouldn't finish on first error.
    return request.catch((e) => debug('Failed to register %s: %s', serviceName, e))
  })
  
  // Return a promise that solves when all requests have solved.
  // Catching each request error
  return Promise.all(requests)
}
