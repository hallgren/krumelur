# Krumelur

With Krumelur it's possible to update a DOM elements with new html content, it does so by using a virtual-dom to patch the element with changes from the new html string.

### API

`Krumelur.apply(html, element)`

### Example

```js
  id = document.getElementById("body")
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

