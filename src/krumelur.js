var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');

var VNode = require('virtual-dom/vnode/vnode');
var VText = require('virtual-dom/vnode/vtext');
var convertHTML = require('html-to-vdom')({
    VNode: VNode,
    VText: VText
});
var parser = require('vdom-parser');

var Krumelur = {
  version: "0.1.0",
  vTrees: {}
};

Krumelur.snapshot = function(element) {
  if (!element.id) { throw "Krumelur.snapshot: element most have id defined"; }
  Krumelur.vTrees[element.id] = parser(element);
};

Krumelur.applyFromSnapshot = function(htmlString, element) {
  if (!element.id) { throw "Krumelur.applyFromSnapshot: element most have id defined"; }
  var replacementVtree = parser(htmlString) ;
  var patches = diff(Krumelur.vTrees[element.id], replacementVtree);
  patch(element, patches);
};

Krumelur.apply = function(htmlString, element) {
  if (!element.id) { throw "Krumelur.apply: element most have id defined"; }
  var replacementVtree = parser(htmlString);
  var patches = diff(parser(element), replacementVtree);
  patch(element, patches);
};

module.exports = global.Krumelur = Krumelur
