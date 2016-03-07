# modreg
A Node.js module that provides registry handling of installable components.

Can be used for integrating modules, components, extensions, plug-ins and
  pretty much anything that requires registration with a main registry.

## Usage example

The below example shows how `modreg` can be used to register a component.

```javascript
var modreg = require('modreg');

// Create a manager object (component registry)
var manager = modreg(options);

// Install a component into the manager registry.
manager.install(fnMyComponent);

// The function that makes registration requests to the registry.
function fnMyComponent(register) {

  // Use the `register` function to make requests to the registry for
  // adding component names.
  return register('my-component-name')
          .then(reg => {
            // `my-component-name` is available and successfully added
            // to the registry.

            // Define an object to serve as the value for `my-component-name`
            // component
            let component = {};

            // Commit the value.
            reg.commit(component);
          })
          // If the registration fails, output it to console
          .catch(error => console.log('Failed to register:', error))

}
```

For more elaborate implementations, see [examples](examples) directory

## How `modreg` works

`modreg` was built to provide a base interface for creating registries and
  handling component registration.

* A registry `installs` modules
* Each module must first make a request to the registry, to `register` a
  component name.
* If the component name is successfully allocated, then the module can now
  `commit` a value that represents the component reference, or `cancel`
  the request.

## API

### `modreg(options)`

Creates a new `Manager` object.

`options` is an object with the following properties:

* `map` - A `Map` object that handles the storage of key-value pairs. Although
  it is not required to be a `Map` instance, it **must** provide the following
  methods: `has(key)`, `set(key,value)`, `get(key)` and `delete(key)`.

By default, unless `map` option is provided, each `Manager` created uses a `Map`
  instance to handle key-value pairs.

### `Manager.install(fn)`

Installs function `fn` into the current manager.
The `fn` function will receive a **register** `function` argument,
  that can be used to register `keys`.

View example in [examples/demo-service/manager.js](examples/demo-service/manager.js#L10)

#### Example
```javascript
var manager = modreg();
manager.install( function (register) {
  register(key)
})
```
The **register** function can be used any number of times to register multiple
  keys, and will return a `Promise` for each call.

The returned `Promise` will:
* `reject` if the key cannot be registered *(e.g.: the
  key has already been registered)*
* `resolve` with a **registration**
  object argument, if the key has been successfully registered.

See [examples/demo-service/services/service-example-one.js](examples/demo-service/services/service-example-one.js) or
[examples/demo-service/services/service-example-two.js](examples/demo-service/services/service-example-two.js)
for examples

### `Registration` object

* `registration.commit(value)` - Associates `value` with the `key` that was
  registered and for which the `registration` object was received.

* `registration.cancel(error)` - Explicitly cancel a `register` request.

**Note:**
By default, unless `commit()` is called after a successful `key` registration,
  the request is canceled and the `key` is deleted once the execution of the
  block ends.

In order to signal the `install` sequence to wait for a `commit`, ensure that
  the execution block returns a `Promise` that solves after the call to
  `commit`; The result of the promise (`resolve`, or `reject`) is disregarded.

## License
[MIT](LICENSE)
