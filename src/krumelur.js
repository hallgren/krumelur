var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');
var parser = require('vdom-parser');

var Krumelur = {
  version: "0.1.0",
  vTrees: {}
};

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
  patch(element.firstElementChild, patches);
};

module.exports = global.Krumelur = Krumelur
