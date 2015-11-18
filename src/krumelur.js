var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');

var VNode = require('virtual-dom/vnode/vnode');
var VText = require('virtual-dom/vnode/vtext');
var convertHTML = require('html-to-vdom')({
    VNode: VNode,
    VText: VText
});

var Krumelur = {
  version: "0.0.1",
  vTrees: {}
};

Krumelur.snapshot = function(element) {
  if (!element.id) { throw "Krumelur.initialize: element most have id defined"; }
  Krumelur.vTrees[element.id] = convertHTML(element.outerHTML.trim());
};

Krumelur.apply = function(htmlString, element) {
  var replacementVtree = convertHTML(htmlString.trim());
  var patches = diff(Krumelur.vTrees[element.id], replacementVtree);
  element = patch(element, patches);
  Krumelur.vTrees[element.id] = replacementVtree;
};

module.exports = global.Krumelur = Krumelur
