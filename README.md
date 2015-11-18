# Krumelur

With Krumelur it's possible to take snapshot of DOM elements, a snapshot is a virtual-dom that is stored within Krumelur. It's later possible to update the element with new HTML by applying it to the element.

### API

`Krumelur.snapshot(element)` Store a snapshot of the element.

`Krumelur.apply(html, element)` Apply html on the element by diffing the stored snapshot with the html input and update the element by patching it with the diff.

### Example

```js
  id = document.getElementById("body")
  Krumelur.snapshot(id)
  Krumelur.apply("<body id='body'><span>new body</span></body>",id)
```

## Development

### Setup
`npm install`

### Build
`npm run build` generate public/krumelur.js

`npm run build_minified` generate public/krumelur.min.js

## Test
`bundle install` Ruby sinatra webserver is used to host the test files in ./views

`rackup`

## Live demo
[demo](https://fast-tundra-5509.herokuapp.com/)

