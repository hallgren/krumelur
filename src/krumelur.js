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

Krumelur.initialize = function(element) {
  if (!element.id) { throw "Krumelur.initialize: element most have id defined"; }
  Krumelur.vTrees[element.id] = convertHTML(element.outerHTML.trim());
};

Krumelur.applyDiffFromHTMLString = function(htmlString, targetElement) {
  var replacementVtree = convertHTML(htmlString.trim());
  var patches = diff(Krumelur.vTrees[targetElement.id], replacementVtree);
  targetElement = patch(targetElement, patches);
  Krumelur.vTrees[targetElement.id] = replacementVtree;
};

module.exports = global.Krumelur = Krumelur
