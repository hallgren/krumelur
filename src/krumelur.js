var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');
var parser = require('vdom-parser');

var Krumelur = {
  version: "0.1.0",
  vTrees: {}
};

/*
 * DOMParser HTML extension
 * 2012-09-04
 *
 * By Eli Grey, http://eligrey.com
 * Public domain.
 * NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
 */

/*! @source https://gist.github.com/1129031 */
/*global document, DOMParser*/

(function(DOMParser) {
  "use strict";

  var DOMParser_proto = DOMParser.prototype;
  var real_parseFromString = DOMParser_proto.parseFromString;

  // Firefox/Opera/IE throw errors on unsupported types
  try {
    // WebKit returns null on unsupported types
    if ((new DOMParser).parseFromString("", "text/html")) {
      // text/html parsing is natively supported
      return;
    }
  } catch (ex) {}

  window.usingPolyfillOnIE9 = false;
  DOMParser_proto.parseFromString = function(markup, type) {
    if (/^\s*text\/html\s*(?:;|$)/i.test(type)) {
      var doc = document.implementation.createHTMLDocument("");

      // Note: IE 9 doesn't support writing innerHTML on this node
      try {
        doc.head.innerHTML = '';
      } catch (ex) {
        // Note: exposing this only for testing purpose
        window.usingPolyfillOnIE9 = true;
      }

      // Note: make this polyfill behave closer to native domparser
      if (markup.indexOf('<!') > -1) {
        try {
          doc.documentElement.innerHTML = markup;
        } catch (ex) {}
      } else if (markup.indexOf('<title') > -1
        || markup.indexOf('<meta') > -1
        || markup.indexOf('<link') > -1
        || markup.indexOf('<script') > -1
        || markup.indexOf('<style') > -1)
      {
        try {
          doc.head.innerHTML = markup;
        } catch (ex) {}
      } else {
        doc.body.innerHTML = markup;
      }
      return doc;
    } else {
      return real_parseFromString.apply(this, arguments);
    }
  };

  // Note: exposing this only for testing purpose
  window.usingDomParserPolyfill = true;
}(DOMParser));

Krumelur.snapshot = function(element, vTree) {
  if (!element.id) { throw "Krumelur.snapshot: element must have id defined"; }
  Krumelur.vTrees[element.id] = vTree || parser(element);
};

Krumelur.applyFromSnapshot = function(htmlString, element, snapshotCallback) {
  if (!element.id) { throw "Krumelur.applyFromSnapshot: element must have id defined"; }
  var replacementVtree = parser(htmlString) ;
  var patches = diff(Krumelur.vTrees[element.id], replacementVtree);
  patch(element, patches);

  if (snapshotCallback) {
    setTimeout(function(){
      Krumelur.snapshot(element, replacementVtree);
      if (typeof snapshotCallback == "function") {
        snapshotCallback();
      }
    }, 50);
  }
};

Krumelur.apply = function(htmlString, element) {
  var replacementVtree = parser(htmlString);
  var patches = diff(parser(element), replacementVtree);
  patch(element, patches);
};

Krumelur.applyOuter = Krumelur.apply

Krumelur.applyInner = function(htmlString, element) {
  var replacementVtree = parser(htmlString);
  var patches = diff(parser(element.innerHTML), replacementVtree);

  if (!element.firstElementChild) {
    var empty_element = document.createElement("EMPTY")
    if (!element.childNodes[0]) element.appendChild(empty_element);
    else element.replaceChild(empty_element, element.childNodes[0]);
  }

  patch(element.firstElementChild, patches);
};

module.exports = global.Krumelur = Krumelur
