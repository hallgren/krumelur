# Krumelur

With Krumelur it's possible to update a DOM element with new html content, it does so by using a virtual-dom to patch the element with changes from the new html string.

Should works on IE9 and up

## API

`Krumelur.apply(html, element)`

`Krumelur.applyOuter(html, element)` alias to `apply`

`Krumelur.applyInner(html, element)`

### apply and applyOuter

Apply the html markup on the outerHTML on the element.

### applyInner

Apply the html markup on the innerHTML on the element. The html markup needs to be encapsulated in a tag that souround all the applied markup.

## Example

```js
  element = document.getElementById("body")
  Krumelur.apply("<body id='body'><span>Applied on body outerHTML</span></body>", element)
  Krumelur.applyInner("<span>Applied on body innerHTML</span>", element)
```

## Development

## Setup
`npm install`

## Build
`npm run build` generate public/krumelur.js

`npm run build_minified` generate public/krumelur.min.js

## Test
`bundle install` Ruby sinatra webserver is used to host the test files in ./views

`rackup`

## Live demo
[demo](https://fast-tundra-5509.herokuapp.com/)

[todoMVC](https://reactize-todo.herokuapp.com/)

