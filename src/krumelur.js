var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');

var VNode = require('virtual-dom/vnode/vnode');
var VText = require('virtual-dom/vnode/vtext');
var convertHTML = require('html-to-vdom')({
    VNode: VNode,
    VText: VText
});

var Krumelur = {
  version: "0.0.2"
};

Krumelur.apply = function(htmlString, element) {
  var replacementVtree = convertHTML(htmlString.trim());
  var patches = diff(convertHTML(element.outerHTML.trim()), replacementVtree);
  element = patch(element, patches);
};

module.exports = global.Krumelur = Krumelur
