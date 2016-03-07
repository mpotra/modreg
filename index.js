"use strict";
var debug = require('debug')('manager')

var Manager = module.exports = function Manager(options) { 
  var manager
    , map
    , queuedValidation = Promise.resolve()
    ;
    
  // Create a new manager object
  manager = {}
  
  // Ensure `options` is an object
  options = Object.assign({}, options)

  // Store a reference to any provided `map` object, or use Map.
  map = options.map || new Map()
  
  // Register a key, with an optional value.
  // If the key already exists, registration fails.
  function registerItem(item) {
    return Promise.resolve(map.has(item.key))
                  .then(function (exists) {
                    if (exists)
                      throw new Error(item.key + ' already exists')
                    
                    return setItem(item)
                  })
  }
  
  // Sets the value of a key, in map.
  function setItem(item) {
    return Promise.resolve(item)
                  .then(function (item) {
                    return map.set(item.key, item.value)
                  })
  }
  
  // Gets the value of `key`, from map.
  function getItem(key) {
    return Promise.resolve(key)
                  .then(function (key) {
                    return map.get(key)
                  })
  }
  
  // Removes `key` from map.
  function deleteItem(key) {
    return Promise.resolve(key)
                  .then(function (key) {
                    return map.delete(key)
                  })
  }
  
  // Solves after the queued validation solves.
  function validationReady(item) {
    return queuedValidation.then(() => item, () => item)
  }

  // Function that installs a module.
  manager.install = (fnInstall) => {
    var promise
      , requests = []
      , installRequest
      ;

    // `fnInstall` must be a function.
    // TODO: maybe support any callable (fnInstall.call) ?
    if (typeof fnInstall === 'function') {
      
      // The `register` function, passed as an argument to `fnInstall`
      function register(key, regValue) {
        var request
          , finished
          , __finish = {}
          , registration
          , validation
          ;
        
        // Internal `request` object.
        request = {'key': key, 'value': undefined, 'locked': false}
        
        // An object passed on successful registration.
        registration = request.registration = {'created': new Date(), 'key': key}
        
        // Function to commit a value, onto `key` in map.
        function commit(value) {
          if (!request.locked) {
            request.locked = true

            function resolve() {
              return getItem(key)
                      .then(value => {
                        request.value = value
                        __finish.resolve(value)
                        return Promise.resolve(value)
                      })
            }
            
            function reject(e) {
              request.error = e
              request.cancelled = true
              __finish.reject(e)
              return Promise.reject(e)
            }
            
            // wait for validation; if successful, then set value.
            return validation
                    .then(() => setItem({'key': key, 'value': value}))
                    .then(resolve, reject)
          }
          
          return Promise.reject(new Error('Cannot commit after return'))
        }
        
        // Function to rollback a key.
        function cancel(e) {

          if (!request.locked) {
            request.locked = true
            request.cancelled = true

            function onResolve() {
              return onReject(e).catch(e => e)
            }
            
            function onReject(error) {
              request.error = error
              request.value = undefined;
              __finish.reject(error)
              return Promise.reject(error)
            }
            
            // wait for validation; if successful, then remove key.
            return validation
                    .then(() => deleteItem(key).catch(() => undefined))
                    .then(onResolve)
                    .catch(onReject)
          }
          
          return Promise.reject(new Error('Cannot cancel after return'))
        }
        
        // Rolls back a key, but returns a promise that always solves
        // with the request object.
        request.clean = (e) => {
          return cancel(e || new Error('Commit missing'))
                  .then(() => request, () => request)
        }

        // Promise used to monitor request completion.
        finished = request.finished = new Promise((resolve, reject) => {
          __finish.resolve = (v) => resolve(v)
          __finish.reject = (e) => reject(e)
        })

        // Expose `commit` to the module.
        registration.commit = (value) => {
          return commit(value)
        }
        
        // Expose `cancel` to the module.
        registration.cancel = (error) => {
          return cancel(error)
        }

        // Create a promise that solves the register request.
        validation = validationReady({'key': key, 'value': regValue})
                            .then(registerItem)
                            .then(() => registration)

        // Queue the validation. If validation successful, then queue
        // after it has finished.
        queuedValidation = validation.then(() => finished)
                            
        // Add the request into a queue.
        requests.push(request)
        
        return validation;
      }
    
      // Pass `register()` to the module, and wait for a return.
      installRequest = Promise.resolve(register).then(fnInstall);

      // Processes all requests.
      function finishInstall() {
        var tasks
        // If no requests were made, then throw.
        if (requests.length <= 0)
          return Promise.reject(new Error('No registration requests'))
        
        // Since the module function returned, rollback all registrations
        // that have no commits yet.
        // Requests that received a commit will persist.
        tasks = requests.map(request => request.clean() )
        
        // Once all requests completed, return a map of all successful
        // registrations.
        return Promise.all(tasks)
               .then(getItemsFromRequests)
      }

      // Once the module returns, process all requests.
      promise = installRequest.then(finishInstall, finishInstall)
    } else {
      promise = Promise.reject(new TypeError('Argument type must be function'))
    }
    
    return promise;
  }
  
  return manager;
}

// Computes a map of all successful requests.
function getItemsFromRequests(requests) {
  var successful
    , error
    ;
    
  function getItems(list) {
    var items = [{}].concat(list.map(request => ({[request.key]: request.value || request.error})))
    return Object.assign.apply(Object, items)
  }
  
  successful = requests.filter(request => request.cancelled != true)
  
  if (successful.length > 0) {
    return getItems(successful)
  } else {
    error = new Error('All registration requests failed')
    error.errors = getItems(requests)
    throw error
  }
}
