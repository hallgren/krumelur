(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
(function (global){
var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

if (typeof document !== 'undefined') {
    module.exports = document;
} else {
    var doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }

    module.exports = doccy;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"min-document":1}],3:[function(require,module,exports){
"use strict";

module.exports = function isObject(x) {
	return typeof x === "object" && x !== null;
};

},{}],4:[function(require,module,exports){

/**
 * index.js
 *
 * A client-side DOM to vdom parser based on DOMParser API
 */

'use strict';

var VNode = require('virtual-dom/vnode/vnode');
var VText = require('virtual-dom/vnode/vtext');
var domParser;

var propertyMap = require('./property-map');
var namespaceMap = require('./namespace-map');

var HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';

module.exports = parser;

/**
 * DOM/html string to vdom parser
 *
 * @param   Mixed   el    DOM element or html string
 * @param   String  attr  Attribute name that contains vdom key
 * @return  Object        VNode or VText
 */
function parser(el, attr) {
	// empty input fallback to empty text node
	if (!el) {
		return createNode(document.createTextNode(''));
	}

	if (typeof el === 'string') {
		if ( !('DOMParser' in window) ) {
			throw new Error('DOMParser is not available, so parsing string to DOM node is not possible.');
		}
		domParser = domParser || new DOMParser();
		var doc = domParser.parseFromString(el, 'text/html');

		// most tags default to body
		if (doc.body.firstChild) {
			el = doc.getElementsByTagName('body')[0].firstChild;

		// some tags, like script and style, default to head
		} else if (doc.head.firstChild && (doc.head.firstChild.tagName !== 'TITLE' || doc.title)) {
			el = doc.head.firstChild;

		// special case for html comment, cdata, doctype
		} else if (doc.firstChild && doc.firstChild.tagName !== 'HTML') {
			el = doc.firstChild;

		// other element, such as whitespace, or html/body/head tag, fallback to empty text node
		} else {
			el = document.createTextNode('');
		}
	}

	if (typeof el !== 'object' || !el || !el.nodeType) { 
		throw new Error('invalid dom node', el);
	}

	return createNode(el, attr);
}

/**
 * Create vdom from dom node
 *
 * @param   Object  el    DOM element
 * @param   String  attr  Attribute name that contains vdom key
 * @return  Object        VNode or VText
 */
function createNode(el, attr) {
	// html comment is not currently supported by virtual-dom
	if (el.nodeType === 3) {
		return createVirtualTextNode(el);

	// cdata or doctype is not currently supported by virtual-dom
	} else if (el.nodeType === 1 || el.nodeType === 9) {
		return createVirtualDomNode(el, attr);
	}

	// default to empty text node
	return new VText('');
}

/**
 * Create vtext from dom node
 *
 * @param   Object  el  Text node
 * @return  Object      VText
 */
function createVirtualTextNode(el) {
	return new VText(el.nodeValue);
}

/**
 * Create vnode from dom node
 *
 * @param   Object  el    DOM element
 * @param   String  attr  Attribute name that contains vdom key
 * @return  Object        VNode
 */
function createVirtualDomNode(el, attr) {
	var ns = el.namespaceURI !== HTML_NAMESPACE ? el.namespaceURI : null;
	var key = attr && el.getAttribute(attr) ? el.getAttribute(attr) : null;

	return new VNode(
		el.tagName
		, createProperties(el)
		, createChildren(el, attr)
		, key
		, ns
	);
}

/**
 * Recursively create vdom
 *
 * @param   Object  el    Parent element
 * @param   String  attr  Attribute name that contains vdom key
 * @return  Array         Child vnode or vtext
 */
function createChildren(el, attr) {
	var children = [];
	for (var i = 0; i < el.childNodes.length; i++) {
		children.push(createNode(el.childNodes[i], attr));
	};

	return children;
}

/**
 * Create properties from dom node
 *
 * @param   Object  el  DOM element
 * @return  Object      Node properties and attributes
 */
function createProperties(el) {
	var properties = {};

	if (!el.hasAttributes()) {
		return properties;
	}

	var ns;
	if (el.namespaceURI && el.namespaceURI !== HTML_NAMESPACE) {
		ns = el.namespaceURI;
	}

	var attr;
	for (var i = 0; i < el.attributes.length; i++) {
		// use built in css style parsing
		if(el.attributes[i].name == 'style'){
			attr = createStyleProperty(el);
		}
		else if (ns) {
			attr = createPropertyNS(el.attributes[i]);
		} else {
			attr = createProperty(el.attributes[i]);
		}

		// special case, namespaced attribute, use properties.foobar
		if (attr.ns) {
			properties[attr.name] = {
				namespace: attr.ns
				, value: attr.value
			};

		// special case, use properties.attributes.foobar
		} else if (attr.isAttr) {
			// init attributes object only when necessary
			if (!properties.attributes) {
				properties.attributes = {}
			}
			properties.attributes[attr.name] = attr.value;

		// default case, use properties.foobar
		} else {
			properties[attr.name] = attr.value;
		}
	};

	return properties;
}

/**
 * Create property from dom attribute 
 *
 * @param   Object  attr  DOM attribute
 * @return  Object        Normalized attribute
 */
function createProperty(attr) {
	var name, value, isAttr;

	// using a map to find the correct case of property name
	if (propertyMap[attr.name]) {
		name = propertyMap[attr.name];
	} else {
		name = attr.name;
	}
	// special cases for data attribute, we default to properties.attributes.data
	if (name.indexOf('data-') === 0) {
		value = attr.value;
		isAttr = true;
	} else {
		value = attr.value;
	}

	return {
		name: name
		, value: value
		, isAttr: isAttr || false
	};
}

/**
 * Create namespaced property from dom attribute 
 *
 * @param   Object  attr  DOM attribute
 * @return  Object        Normalized attribute
 */
function createPropertyNS(attr) {
	var name, value;

	return {
		name: attr.name
		, value: attr.value
		, ns: namespaceMap[attr.name] || ''
	};
}

/**
 * Create style property from dom node
 *
 * @param   Object  el  DOM node
 * @return  Object        Normalized attribute
 */
function createStyleProperty(el) {
	var style = el.style;
	var output = {};
	for (var i = 0; i < style.length; ++i) {
		var item = style.item(i);
		output[item] = style[item];
		// hack to workaround browser inconsistency with url()
		if (output[item].indexOf('url') > -1) {
			output[item] = output[item].replace(/\"/g, '')
		}
	}
	return { name: 'style', value: output };
}

},{"./namespace-map":5,"./property-map":6,"virtual-dom/vnode/vnode":22,"virtual-dom/vnode/vtext":24}],5:[function(require,module,exports){

/**
 * namespace-map.js
 *
 * Necessary to map svg attributes back to their namespace
 */

'use strict';

// extracted from https://github.com/Matt-Esch/virtual-dom/blob/master/virtual-hyperscript/svg-attribute-namespace.js
var DEFAULT_NAMESPACE = null;
var EV_NAMESPACE = 'http://www.w3.org/2001/xml-events';
var XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink';
var XML_NAMESPACE = 'http://www.w3.org/XML/1998/namespace';

var namespaces = {
	'about': DEFAULT_NAMESPACE
	, 'accent-height': DEFAULT_NAMESPACE
	, 'accumulate': DEFAULT_NAMESPACE
	, 'additive': DEFAULT_NAMESPACE
	, 'alignment-baseline': DEFAULT_NAMESPACE
	, 'alphabetic': DEFAULT_NAMESPACE
	, 'amplitude': DEFAULT_NAMESPACE
	, 'arabic-form': DEFAULT_NAMESPACE
	, 'ascent': DEFAULT_NAMESPACE
	, 'attributeName': DEFAULT_NAMESPACE
	, 'attributeType': DEFAULT_NAMESPACE
	, 'azimuth': DEFAULT_NAMESPACE
	, 'bandwidth': DEFAULT_NAMESPACE
	, 'baseFrequency': DEFAULT_NAMESPACE
	, 'baseProfile': DEFAULT_NAMESPACE
	, 'baseline-shift': DEFAULT_NAMESPACE
	, 'bbox': DEFAULT_NAMESPACE
	, 'begin': DEFAULT_NAMESPACE
	, 'bias': DEFAULT_NAMESPACE
	, 'by': DEFAULT_NAMESPACE
	, 'calcMode': DEFAULT_NAMESPACE
	, 'cap-height': DEFAULT_NAMESPACE
	, 'class': DEFAULT_NAMESPACE
	, 'clip': DEFAULT_NAMESPACE
	, 'clip-path': DEFAULT_NAMESPACE
	, 'clip-rule': DEFAULT_NAMESPACE
	, 'clipPathUnits': DEFAULT_NAMESPACE
	, 'color': DEFAULT_NAMESPACE
	, 'color-interpolation': DEFAULT_NAMESPACE
	, 'color-interpolation-filters': DEFAULT_NAMESPACE
	, 'color-profile': DEFAULT_NAMESPACE
	, 'color-rendering': DEFAULT_NAMESPACE
	, 'content': DEFAULT_NAMESPACE
	, 'contentScriptType': DEFAULT_NAMESPACE
	, 'contentStyleType': DEFAULT_NAMESPACE
	, 'cursor': DEFAULT_NAMESPACE
	, 'cx': DEFAULT_NAMESPACE
	, 'cy': DEFAULT_NAMESPACE
	, 'd': DEFAULT_NAMESPACE
	, 'datatype': DEFAULT_NAMESPACE
	, 'defaultAction': DEFAULT_NAMESPACE
	, 'descent': DEFAULT_NAMESPACE
	, 'diffuseConstant': DEFAULT_NAMESPACE
	, 'direction': DEFAULT_NAMESPACE
	, 'display': DEFAULT_NAMESPACE
	, 'divisor': DEFAULT_NAMESPACE
	, 'dominant-baseline': DEFAULT_NAMESPACE
	, 'dur': DEFAULT_NAMESPACE
	, 'dx': DEFAULT_NAMESPACE
	, 'dy': DEFAULT_NAMESPACE
	, 'edgeMode': DEFAULT_NAMESPACE
	, 'editable': DEFAULT_NAMESPACE
	, 'elevation': DEFAULT_NAMESPACE
	, 'enable-background': DEFAULT_NAMESPACE
	, 'end': DEFAULT_NAMESPACE
	, 'ev:event': EV_NAMESPACE
	, 'event': DEFAULT_NAMESPACE
	, 'exponent': DEFAULT_NAMESPACE
	, 'externalResourcesRequired': DEFAULT_NAMESPACE
	, 'fill': DEFAULT_NAMESPACE
	, 'fill-opacity': DEFAULT_NAMESPACE
	, 'fill-rule': DEFAULT_NAMESPACE
	, 'filter': DEFAULT_NAMESPACE
	, 'filterRes': DEFAULT_NAMESPACE
	, 'filterUnits': DEFAULT_NAMESPACE
	, 'flood-color': DEFAULT_NAMESPACE
	, 'flood-opacity': DEFAULT_NAMESPACE
	, 'focusHighlight': DEFAULT_NAMESPACE
	, 'focusable': DEFAULT_NAMESPACE
	, 'font-family': DEFAULT_NAMESPACE
	, 'font-size': DEFAULT_NAMESPACE
	, 'font-size-adjust': DEFAULT_NAMESPACE
	, 'font-stretch': DEFAULT_NAMESPACE
	, 'font-style': DEFAULT_NAMESPACE
	, 'font-variant': DEFAULT_NAMESPACE
	, 'font-weight': DEFAULT_NAMESPACE
	, 'format': DEFAULT_NAMESPACE
	, 'from': DEFAULT_NAMESPACE
	, 'fx': DEFAULT_NAMESPACE
	, 'fy': DEFAULT_NAMESPACE
	, 'g1': DEFAULT_NAMESPACE
	, 'g2': DEFAULT_NAMESPACE
	, 'glyph-name': DEFAULT_NAMESPACE
	, 'glyph-orientation-horizontal': DEFAULT_NAMESPACE
	, 'glyph-orientation-vertical': DEFAULT_NAMESPACE
	, 'glyphRef': DEFAULT_NAMESPACE
	, 'gradientTransform': DEFAULT_NAMESPACE
	, 'gradientUnits': DEFAULT_NAMESPACE
	, 'handler': DEFAULT_NAMESPACE
	, 'hanging': DEFAULT_NAMESPACE
	, 'height': DEFAULT_NAMESPACE
	, 'horiz-adv-x': DEFAULT_NAMESPACE
	, 'horiz-origin-x': DEFAULT_NAMESPACE
	, 'horiz-origin-y': DEFAULT_NAMESPACE
	, 'id': DEFAULT_NAMESPACE
	, 'ideographic': DEFAULT_NAMESPACE
	, 'image-rendering': DEFAULT_NAMESPACE
	, 'in': DEFAULT_NAMESPACE
	, 'in2': DEFAULT_NAMESPACE
	, 'initialVisibility': DEFAULT_NAMESPACE
	, 'intercept': DEFAULT_NAMESPACE
	, 'k': DEFAULT_NAMESPACE
	, 'k1': DEFAULT_NAMESPACE
	, 'k2': DEFAULT_NAMESPACE
	, 'k3': DEFAULT_NAMESPACE
	, 'k4': DEFAULT_NAMESPACE
	, 'kernelMatrix': DEFAULT_NAMESPACE
	, 'kernelUnitLength': DEFAULT_NAMESPACE
	, 'kerning': DEFAULT_NAMESPACE
	, 'keyPoints': DEFAULT_NAMESPACE
	, 'keySplines': DEFAULT_NAMESPACE
	, 'keyTimes': DEFAULT_NAMESPACE
	, 'lang': DEFAULT_NAMESPACE
	, 'lengthAdjust': DEFAULT_NAMESPACE
	, 'letter-spacing': DEFAULT_NAMESPACE
	, 'lighting-color': DEFAULT_NAMESPACE
	, 'limitingConeAngle': DEFAULT_NAMESPACE
	, 'local': DEFAULT_NAMESPACE
	, 'marker-end': DEFAULT_NAMESPACE
	, 'marker-mid': DEFAULT_NAMESPACE
	, 'marker-start': DEFAULT_NAMESPACE
	, 'markerHeight': DEFAULT_NAMESPACE
	, 'markerUnits': DEFAULT_NAMESPACE
	, 'markerWidth': DEFAULT_NAMESPACE
	, 'mask': DEFAULT_NAMESPACE
	, 'maskContentUnits': DEFAULT_NAMESPACE
	, 'maskUnits': DEFAULT_NAMESPACE
	, 'mathematical': DEFAULT_NAMESPACE
	, 'max': DEFAULT_NAMESPACE
	, 'media': DEFAULT_NAMESPACE
	, 'mediaCharacterEncoding': DEFAULT_NAMESPACE
	, 'mediaContentEncodings': DEFAULT_NAMESPACE
	, 'mediaSize': DEFAULT_NAMESPACE
	, 'mediaTime': DEFAULT_NAMESPACE
	, 'method': DEFAULT_NAMESPACE
	, 'min': DEFAULT_NAMESPACE
	, 'mode': DEFAULT_NAMESPACE
	, 'name': DEFAULT_NAMESPACE
	, 'nav-down': DEFAULT_NAMESPACE
	, 'nav-down-left': DEFAULT_NAMESPACE
	, 'nav-down-right': DEFAULT_NAMESPACE
	, 'nav-left': DEFAULT_NAMESPACE
	, 'nav-next': DEFAULT_NAMESPACE
	, 'nav-prev': DEFAULT_NAMESPACE
	, 'nav-right': DEFAULT_NAMESPACE
	, 'nav-up': DEFAULT_NAMESPACE
	, 'nav-up-left': DEFAULT_NAMESPACE
	, 'nav-up-right': DEFAULT_NAMESPACE
	, 'numOctaves': DEFAULT_NAMESPACE
	, 'observer': DEFAULT_NAMESPACE
	, 'offset': DEFAULT_NAMESPACE
	, 'opacity': DEFAULT_NAMESPACE
	, 'operator': DEFAULT_NAMESPACE
	, 'order': DEFAULT_NAMESPACE
	, 'orient': DEFAULT_NAMESPACE
	, 'orientation': DEFAULT_NAMESPACE
	, 'origin': DEFAULT_NAMESPACE
	, 'overflow': DEFAULT_NAMESPACE
	, 'overlay': DEFAULT_NAMESPACE
	, 'overline-position': DEFAULT_NAMESPACE
	, 'overline-thickness': DEFAULT_NAMESPACE
	, 'panose-1': DEFAULT_NAMESPACE
	, 'path': DEFAULT_NAMESPACE
	, 'pathLength': DEFAULT_NAMESPACE
	, 'patternContentUnits': DEFAULT_NAMESPACE
	, 'patternTransform': DEFAULT_NAMESPACE
	, 'patternUnits': DEFAULT_NAMESPACE
	, 'phase': DEFAULT_NAMESPACE
	, 'playbackOrder': DEFAULT_NAMESPACE
	, 'pointer-events': DEFAULT_NAMESPACE
	, 'points': DEFAULT_NAMESPACE
	, 'pointsAtX': DEFAULT_NAMESPACE
	, 'pointsAtY': DEFAULT_NAMESPACE
	, 'pointsAtZ': DEFAULT_NAMESPACE
	, 'preserveAlpha': DEFAULT_NAMESPACE
	, 'preserveAspectRatio': DEFAULT_NAMESPACE
	, 'primitiveUnits': DEFAULT_NAMESPACE
	, 'propagate': DEFAULT_NAMESPACE
	, 'property': DEFAULT_NAMESPACE
	, 'r': DEFAULT_NAMESPACE
	, 'radius': DEFAULT_NAMESPACE
	, 'refX': DEFAULT_NAMESPACE
	, 'refY': DEFAULT_NAMESPACE
	, 'rel': DEFAULT_NAMESPACE
	, 'rendering-intent': DEFAULT_NAMESPACE
	, 'repeatCount': DEFAULT_NAMESPACE
	, 'repeatDur': DEFAULT_NAMESPACE
	, 'requiredExtensions': DEFAULT_NAMESPACE
	, 'requiredFeatures': DEFAULT_NAMESPACE
	, 'requiredFonts': DEFAULT_NAMESPACE
	, 'requiredFormats': DEFAULT_NAMESPACE
	, 'resource': DEFAULT_NAMESPACE
	, 'restart': DEFAULT_NAMESPACE
	, 'result': DEFAULT_NAMESPACE
	, 'rev': DEFAULT_NAMESPACE
	, 'role': DEFAULT_NAMESPACE
	, 'rotate': DEFAULT_NAMESPACE
	, 'rx': DEFAULT_NAMESPACE
	, 'ry': DEFAULT_NAMESPACE
	, 'scale': DEFAULT_NAMESPACE
	, 'seed': DEFAULT_NAMESPACE
	, 'shape-rendering': DEFAULT_NAMESPACE
	, 'slope': DEFAULT_NAMESPACE
	, 'snapshotTime': DEFAULT_NAMESPACE
	, 'spacing': DEFAULT_NAMESPACE
	, 'specularConstant': DEFAULT_NAMESPACE
	, 'specularExponent': DEFAULT_NAMESPACE
	, 'spreadMethod': DEFAULT_NAMESPACE
	, 'startOffset': DEFAULT_NAMESPACE
	, 'stdDeviation': DEFAULT_NAMESPACE
	, 'stemh': DEFAULT_NAMESPACE
	, 'stemv': DEFAULT_NAMESPACE
	, 'stitchTiles': DEFAULT_NAMESPACE
	, 'stop-color': DEFAULT_NAMESPACE
	, 'stop-opacity': DEFAULT_NAMESPACE
	, 'strikethrough-position': DEFAULT_NAMESPACE
	, 'strikethrough-thickness': DEFAULT_NAMESPACE
	, 'string': DEFAULT_NAMESPACE
	, 'stroke': DEFAULT_NAMESPACE
	, 'stroke-dasharray': DEFAULT_NAMESPACE
	, 'stroke-dashoffset': DEFAULT_NAMESPACE
	, 'stroke-linecap': DEFAULT_NAMESPACE
	, 'stroke-linejoin': DEFAULT_NAMESPACE
	, 'stroke-miterlimit': DEFAULT_NAMESPACE
	, 'stroke-opacity': DEFAULT_NAMESPACE
	, 'stroke-width': DEFAULT_NAMESPACE
	, 'surfaceScale': DEFAULT_NAMESPACE
	, 'syncBehavior': DEFAULT_NAMESPACE
	, 'syncBehaviorDefault': DEFAULT_NAMESPACE
	, 'syncMaster': DEFAULT_NAMESPACE
	, 'syncTolerance': DEFAULT_NAMESPACE
	, 'syncToleranceDefault': DEFAULT_NAMESPACE
	, 'systemLanguage': DEFAULT_NAMESPACE
	, 'tableValues': DEFAULT_NAMESPACE
	, 'target': DEFAULT_NAMESPACE
	, 'targetX': DEFAULT_NAMESPACE
	, 'targetY': DEFAULT_NAMESPACE
	, 'text-anchor': DEFAULT_NAMESPACE
	, 'text-decoration': DEFAULT_NAMESPACE
	, 'text-rendering': DEFAULT_NAMESPACE
	, 'textLength': DEFAULT_NAMESPACE
	, 'timelineBegin': DEFAULT_NAMESPACE
	, 'title': DEFAULT_NAMESPACE
	, 'to': DEFAULT_NAMESPACE
	, 'transform': DEFAULT_NAMESPACE
	, 'transformBehavior': DEFAULT_NAMESPACE
	, 'type': DEFAULT_NAMESPACE
	, 'typeof': DEFAULT_NAMESPACE
	, 'u1': DEFAULT_NAMESPACE
	, 'u2': DEFAULT_NAMESPACE
	, 'underline-position': DEFAULT_NAMESPACE
	, 'underline-thickness': DEFAULT_NAMESPACE
	, 'unicode': DEFAULT_NAMESPACE
	, 'unicode-bidi': DEFAULT_NAMESPACE
	, 'unicode-range': DEFAULT_NAMESPACE
	, 'units-per-em': DEFAULT_NAMESPACE
	, 'v-alphabetic': DEFAULT_NAMESPACE
	, 'v-hanging': DEFAULT_NAMESPACE
	, 'v-ideographic': DEFAULT_NAMESPACE
	, 'v-mathematical': DEFAULT_NAMESPACE
	, 'values': DEFAULT_NAMESPACE
	, 'version': DEFAULT_NAMESPACE
	, 'vert-adv-y': DEFAULT_NAMESPACE
	, 'vert-origin-x': DEFAULT_NAMESPACE
	, 'vert-origin-y': DEFAULT_NAMESPACE
	, 'viewBox': DEFAULT_NAMESPACE
	, 'viewTarget': DEFAULT_NAMESPACE
	, 'visibility': DEFAULT_NAMESPACE
	, 'width': DEFAULT_NAMESPACE
	, 'widths': DEFAULT_NAMESPACE
	, 'word-spacing': DEFAULT_NAMESPACE
	, 'writing-mode': DEFAULT_NAMESPACE
	, 'x': DEFAULT_NAMESPACE
	, 'x-height': DEFAULT_NAMESPACE
	, 'x1': DEFAULT_NAMESPACE
	, 'x2': DEFAULT_NAMESPACE
	, 'xChannelSelector': DEFAULT_NAMESPACE
	, 'xlink:actuate': XLINK_NAMESPACE
	, 'xlink:arcrole': XLINK_NAMESPACE
	, 'xlink:href': XLINK_NAMESPACE
	, 'xlink:role': XLINK_NAMESPACE
	, 'xlink:show': XLINK_NAMESPACE
	, 'xlink:title': XLINK_NAMESPACE
	, 'xlink:type': XLINK_NAMESPACE
	, 'xml:base': XML_NAMESPACE
	, 'xml:id': XML_NAMESPACE
	, 'xml:lang': XML_NAMESPACE
	, 'xml:space': XML_NAMESPACE
	, 'y': DEFAULT_NAMESPACE
	, 'y1': DEFAULT_NAMESPACE
	, 'y2': DEFAULT_NAMESPACE
	, 'yChannelSelector': DEFAULT_NAMESPACE
	, 'z': DEFAULT_NAMESPACE
	, 'zoomAndPan': DEFAULT_NAMESPACE
};

module.exports = namespaces;

},{}],6:[function(require,module,exports){

/**
 * property-map.js
 *
 * Necessary to map dom attributes back to vdom properties
 */

'use strict';

// invert of https://www.npmjs.com/package/html-attributes
var properties = {
	'abbr': 'abbr'
	, 'accept': 'accept'
	, 'accept-charset': 'acceptCharset'
	, 'accesskey': 'accessKey'
	, 'action': 'action'
	, 'allowfullscreen': 'allowFullScreen'
	, 'allowtransparency': 'allowTransparency'
	, 'alt': 'alt'
	, 'async': 'async'
	, 'autocomplete': 'autoComplete'
	, 'autofocus': 'autoFocus'
	, 'autoplay': 'autoPlay'
	, 'cellpadding': 'cellPadding'
	, 'cellspacing': 'cellSpacing'
	, 'challenge': 'challenge'
	, 'charset': 'charset'
	, 'checked': 'checked'
	, 'cite': 'cite'
	, 'class': 'className'
	, 'cols': 'cols'
	, 'colspan': 'colSpan'
	, 'command': 'command'
	, 'content': 'content'
	, 'contenteditable': 'contentEditable'
	, 'contextmenu': 'contextMenu'
	, 'controls': 'controls'
	, 'coords': 'coords'
	, 'crossorigin': 'crossOrigin'
	, 'data': 'data'
	, 'datetime': 'dateTime'
	, 'default': 'default'
	, 'defer': 'defer'
	, 'dir': 'dir'
	, 'disabled': 'disabled'
	, 'download': 'download'
	, 'draggable': 'draggable'
	, 'dropzone': 'dropzone'
	, 'enctype': 'encType'
	, 'for': 'htmlFor'
	, 'form': 'form'
	, 'formaction': 'formAction'
	, 'formenctype': 'formEncType'
	, 'formmethod': 'formMethod'
	, 'formnovalidate': 'formNoValidate'
	, 'formtarget': 'formTarget'
	, 'frameBorder': 'frameBorder'
	, 'headers': 'headers'
	, 'height': 'height'
	, 'hidden': 'hidden'
	, 'high': 'high'
	, 'href': 'href'
	, 'hreflang': 'hrefLang'
	, 'http-equiv': 'httpEquiv'
	, 'icon': 'icon'
	, 'id': 'id'
	, 'inputmode': 'inputMode'
	, 'ismap': 'isMap'
	, 'itemid': 'itemId'
	, 'itemprop': 'itemProp'
	, 'itemref': 'itemRef'
	, 'itemscope': 'itemScope'
	, 'itemtype': 'itemType'
	, 'kind': 'kind'
	, 'label': 'label'
	, 'lang': 'lang'
	, 'list': 'list'
	, 'loop': 'loop'
	, 'manifest': 'manifest'
	, 'max': 'max'
	, 'maxlength': 'maxLength'
	, 'media': 'media'
	, 'mediagroup': 'mediaGroup'
	, 'method': 'method'
	, 'min': 'min'
	, 'minlength': 'minLength'
	, 'multiple': 'multiple'
	, 'muted': 'muted'
	, 'name': 'name'
	, 'novalidate': 'noValidate'
	, 'open': 'open'
	, 'optimum': 'optimum'
	, 'pattern': 'pattern'
	, 'ping': 'ping'
	, 'placeholder': 'placeholder'
	, 'poster': 'poster'
	, 'preload': 'preload'
	, 'radiogroup': 'radioGroup'
	, 'readonly': 'readOnly'
	, 'rel': 'rel'
	, 'required': 'required'
	, 'role': 'role'
	, 'rows': 'rows'
	, 'rowspan': 'rowSpan'
	, 'sandbox': 'sandbox'
	, 'scope': 'scope'
	, 'scoped': 'scoped'
	, 'scrolling': 'scrolling'
	, 'seamless': 'seamless'
	, 'selected': 'selected'
	, 'shape': 'shape'
	, 'size': 'size'
	, 'sizes': 'sizes'
	, 'sortable': 'sortable'
	, 'span': 'span'
	, 'spellcheck': 'spellCheck'
	, 'src': 'src'
	, 'srcdoc': 'srcDoc'
	, 'srcset': 'srcSet'
	, 'start': 'start'
	, 'step': 'step'
	, 'style': 'style'
	, 'tabindex': 'tabIndex'
	, 'target': 'target'
	, 'title': 'title'
	, 'translate': 'translate'
	, 'type': 'type'
	, 'typemustmatch': 'typeMustMatch'
	, 'usemap': 'useMap'
	, 'value': 'value'
	, 'width': 'width'
	, 'wmode': 'wmode'
	, 'wrap': 'wrap'
};

module.exports = properties;

},{}],7:[function(require,module,exports){
var diff = require("./vtree/diff.js")

module.exports = diff

},{"./vtree/diff.js":26}],8:[function(require,module,exports){
var patch = require("./vdom/patch.js")

module.exports = patch

},{"./vdom/patch.js":13}],9:[function(require,module,exports){
var isObject = require("is-object")
var isHook = require("../vnode/is-vhook.js")

module.exports = applyProperties

function applyProperties(node, props, previous) {
    for (var propName in props) {
        var propValue = props[propName]

        if (propValue === undefined) {
            removeProperty(node, propName, propValue, previous);
        } else if (isHook(propValue)) {
            removeProperty(node, propName, propValue, previous)
            if (propValue.hook) {
                propValue.hook(node,
                    propName,
                    previous ? previous[propName] : undefined)
            }
        } else {
            if (isObject(propValue)) {
                patchObject(node, props, previous, propName, propValue);
            } else {
                node[propName] = propValue
            }
        }
    }
}

function removeProperty(node, propName, propValue, previous) {
    if (previous) {
        var previousValue = previous[propName]

        if (!isHook(previousValue)) {
            if (propName === "attributes") {
                for (var attrName in previousValue) {
                    node.removeAttribute(attrName)
                }
            } else if (propName === "style") {
                for (var i in previousValue) {
                    node.style[i] = ""
                }
            } else if (typeof previousValue === "string") {
                node[propName] = ""
            } else {
                node[propName] = null
            }
        } else if (previousValue.unhook) {
            previousValue.unhook(node, propName, propValue)
        }
    }
}

function patchObject(node, props, previous, propName, propValue) {
    var previousValue = previous ? previous[propName] : undefined

    // Set attributes
    if (propName === "attributes") {
        for (var attrName in propValue) {
            var attrValue = propValue[attrName]

            if (attrValue === undefined) {
                node.removeAttribute(attrName)
            } else {
                node.setAttribute(attrName, attrValue)
            }
        }

        return
    }

    if(previousValue && isObject(previousValue) &&
        getPrototype(previousValue) !== getPrototype(propValue)) {
        node[propName] = propValue
        return
    }

    if (!isObject(node[propName])) {
        node[propName] = {}
    }

    var replacer = propName === "style" ? "" : undefined

    for (var k in propValue) {
        var value = propValue[k]
        node[propName][k] = (value === undefined) ? replacer : value
    }
}

function getPrototype(value) {
    if (Object.getPrototypeOf) {
        return Object.getPrototypeOf(value)
    } else if (value.__proto__) {
        return value.__proto__
    } else if (value.constructor) {
        return value.constructor.prototype
    }
}

},{"../vnode/is-vhook.js":17,"is-object":3}],10:[function(require,module,exports){
var document = require("global/document")

var applyProperties = require("./apply-properties")

var isVNode = require("../vnode/is-vnode.js")
var isVText = require("../vnode/is-vtext.js")
var isWidget = require("../vnode/is-widget.js")
var handleThunk = require("../vnode/handle-thunk.js")

module.exports = createElement

function createElement(vnode, opts) {
    var doc = opts ? opts.document || document : document
    var warn = opts ? opts.warn : null

    vnode = handleThunk(vnode).a

    if (isWidget(vnode)) {
        return vnode.init()
    } else if (isVText(vnode)) {
        return doc.createTextNode(vnode.text)
    } else if (!isVNode(vnode)) {
        if (warn) {
            warn("Item is not a valid virtual dom node", vnode)
        }
        return null
    }

    var node = (vnode.namespace === null) ?
        doc.createElement(vnode.tagName) :
        doc.createElementNS(vnode.namespace, vnode.tagName)

    var props = vnode.properties
    applyProperties(node, props)

    var children = vnode.children

    for (var i = 0; i < children.length; i++) {
        var childNode = createElement(children[i], opts)
        if (childNode) {
            node.appendChild(childNode)
        }
    }

    return node
}

},{"../vnode/handle-thunk.js":15,"../vnode/is-vnode.js":18,"../vnode/is-vtext.js":19,"../vnode/is-widget.js":20,"./apply-properties":9,"global/document":2}],11:[function(require,module,exports){
// Maps a virtual DOM tree onto a real DOM tree in an efficient manner.
// We don't want to read all of the DOM nodes in the tree so we use
// the in-order tree indexing to eliminate recursion down certain branches.
// We only recurse into a DOM node if we know that it contains a child of
// interest.

var noChild = {}

module.exports = domIndex

function domIndex(rootNode, tree, indices, nodes) {
    if (!indices || indices.length === 0) {
        return {}
    } else {
        indices.sort(ascending)
        return recurse(rootNode, tree, indices, nodes, 0)
    }
}

function recurse(rootNode, tree, indices, nodes, rootIndex) {
    nodes = nodes || {}


    if (rootNode) {
        if (indexInRange(indices, rootIndex, rootIndex)) {
            nodes[rootIndex] = rootNode
        }

        var vChildren = tree.children

        if (vChildren) {

            var childNodes = rootNode.childNodes

            for (var i = 0; i < tree.children.length; i++) {
                rootIndex += 1

                var vChild = vChildren[i] || noChild
                var nextIndex = rootIndex + (vChild.count || 0)

                // skip recursion down the tree if there are no nodes down here
                if (indexInRange(indices, rootIndex, nextIndex)) {
                    recurse(childNodes[i], vChild, indices, nodes, rootIndex)
                }

                rootIndex = nextIndex
            }
        }
    }

    return nodes
}

// Binary search for an index in the interval [left, right]
function indexInRange(indices, left, right) {
    if (indices.length === 0) {
        return false
    }

    var minIndex = 0
    var maxIndex = indices.length - 1
    var currentIndex
    var currentItem

    while (minIndex <= maxIndex) {
        currentIndex = ((maxIndex + minIndex) / 2) >> 0
        currentItem = indices[currentIndex]

        if (minIndex === maxIndex) {
            return currentItem >= left && currentItem <= right
        } else if (currentItem < left) {
            minIndex = currentIndex + 1
        } else  if (currentItem > right) {
            maxIndex = currentIndex - 1
        } else {
            return true
        }
    }

    return false;
}

function ascending(a, b) {
    return a > b ? 1 : -1
}

},{}],12:[function(require,module,exports){
var applyProperties = require("./apply-properties")

var isWidget = require("../vnode/is-widget.js")
var VPatch = require("../vnode/vpatch.js")

var updateWidget = require("./update-widget")

module.exports = applyPatch

function applyPatch(vpatch, domNode, renderOptions) {
    var type = vpatch.type
    var vNode = vpatch.vNode
    var patch = vpatch.patch

    switch (type) {
        case VPatch.REMOVE:
            return removeNode(domNode, vNode)
        case VPatch.INSERT:
            return insertNode(domNode, patch, renderOptions)
        case VPatch.VTEXT:
            return stringPatch(domNode, vNode, patch, renderOptions)
        case VPatch.WIDGET:
            return widgetPatch(domNode, vNode, patch, renderOptions)
        case VPatch.VNODE:
            return vNodePatch(domNode, vNode, patch, renderOptions)
        case VPatch.ORDER:
            reorderChildren(domNode, patch)
            return domNode
        case VPatch.PROPS:
            applyProperties(domNode, patch, vNode.properties)
            return domNode
        case VPatch.THUNK:
            return replaceRoot(domNode,
                renderOptions.patch(domNode, patch, renderOptions))
        default:
            return domNode
    }
}

function removeNode(domNode, vNode) {
    var parentNode = domNode.parentNode

    if (parentNode) {
        parentNode.removeChild(domNode)
    }

    destroyWidget(domNode, vNode);

    return null
}

function insertNode(parentNode, vNode, renderOptions) {
    var newNode = renderOptions.render(vNode, renderOptions)

    if (parentNode) {
        parentNode.appendChild(newNode)
    }

    return parentNode
}

function stringPatch(domNode, leftVNode, vText, renderOptions) {
    var newNode

    if (domNode.nodeType === 3) {
        domNode.replaceData(0, domNode.length, vText.text)
        newNode = domNode
    } else {
        var parentNode = domNode.parentNode
        newNode = renderOptions.render(vText, renderOptions)

        if (parentNode && newNode !== domNode) {
            parentNode.replaceChild(newNode, domNode)
        }
    }

    return newNode
}

function widgetPatch(domNode, leftVNode, widget, renderOptions) {
    var updating = updateWidget(leftVNode, widget)
    var newNode

    if (updating) {
        newNode = widget.update(leftVNode, domNode) || domNode
    } else {
        newNode = renderOptions.render(widget, renderOptions)
    }

    var parentNode = domNode.parentNode

    if (parentNode && newNode !== domNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    if (!updating) {
        destroyWidget(domNode, leftVNode)
    }

    return newNode
}

function vNodePatch(domNode, leftVNode, vNode, renderOptions) {
    var parentNode = domNode.parentNode
    var newNode = renderOptions.render(vNode, renderOptions)

    if (parentNode && newNode !== domNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    return newNode
}

function destroyWidget(domNode, w) {
    if (typeof w.destroy === "function" && isWidget(w)) {
        w.destroy(domNode)
    }
}

function reorderChildren(domNode, moves) {
    var childNodes = domNode.childNodes
    var keyMap = {}
    var node
    var remove
    var insert

    for (var i = 0; i < moves.removes.length; i++) {
        remove = moves.removes[i]
        node = childNodes[remove.from]
        if (remove.key) {
            keyMap[remove.key] = node
        }
        domNode.removeChild(node)
    }

    var length = childNodes.length
    for (var j = 0; j < moves.inserts.length; j++) {
        insert = moves.inserts[j]
        node = keyMap[insert.key]
        // this is the weirdest bug i've ever seen in webkit
        domNode.insertBefore(node, insert.to >= length++ ? null : childNodes[insert.to])
    }
}

function replaceRoot(oldRoot, newRoot) {
    if (oldRoot && newRoot && oldRoot !== newRoot && oldRoot.parentNode) {
        oldRoot.parentNode.replaceChild(newRoot, oldRoot)
    }

    return newRoot;
}

},{"../vnode/is-widget.js":20,"../vnode/vpatch.js":23,"./apply-properties":9,"./update-widget":14}],13:[function(require,module,exports){
var document = require("global/document")
var isArray = require("x-is-array")

var render = require("./create-element")
var domIndex = require("./dom-index")
var patchOp = require("./patch-op")
module.exports = patch

function patch(rootNode, patches, renderOptions) {
    renderOptions = renderOptions || {}
    renderOptions.patch = renderOptions.patch && renderOptions.patch !== patch
        ? renderOptions.patch
        : patchRecursive
    renderOptions.render = renderOptions.render || render

    return renderOptions.patch(rootNode, patches, renderOptions)
}

function patchRecursive(rootNode, patches, renderOptions) {
    var indices = patchIndices(patches)

    if (indices.length === 0) {
        return rootNode
    }

    var index = domIndex(rootNode, patches.a, indices)
    var ownerDocument = rootNode.ownerDocument

    if (!renderOptions.document && ownerDocument !== document) {
        renderOptions.document = ownerDocument
    }

    for (var i = 0; i < indices.length; i++) {
        var nodeIndex = indices[i]
        rootNode = applyPatch(rootNode,
            index[nodeIndex],
            patches[nodeIndex],
            renderOptions)
    }

    return rootNode
}

function applyPatch(rootNode, domNode, patchList, renderOptions) {
    if (!domNode) {
        return rootNode
    }

    var newNode

    if (isArray(patchList)) {
        for (var i = 0; i < patchList.length; i++) {
            newNode = patchOp(patchList[i], domNode, renderOptions)

            if (domNode === rootNode) {
                rootNode = newNode
            }
        }
    } else {
        newNode = patchOp(patchList, domNode, renderOptions)

        if (domNode === rootNode) {
            rootNode = newNode
        }
    }

    return rootNode
}

function patchIndices(patches) {
    var indices = []

    for (var key in patches) {
        if (key !== "a") {
            indices.push(Number(key))
        }
    }

    return indices
}

},{"./create-element":10,"./dom-index":11,"./patch-op":12,"global/document":2,"x-is-array":27}],14:[function(require,module,exports){
var isWidget = require("../vnode/is-widget.js")

module.exports = updateWidget

function updateWidget(a, b) {
    if (isWidget(a) && isWidget(b)) {
        if ("name" in a && "name" in b) {
            return a.id === b.id
        } else {
            return a.init === b.init
        }
    }

    return false
}

},{"../vnode/is-widget.js":20}],15:[function(require,module,exports){
var isVNode = require("./is-vnode")
var isVText = require("./is-vtext")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")

module.exports = handleThunk

function handleThunk(a, b) {
    var renderedA = a
    var renderedB = b

    if (isThunk(b)) {
        renderedB = renderThunk(b, a)
    }

    if (isThunk(a)) {
        renderedA = renderThunk(a, null)
    }

    return {
        a: renderedA,
        b: renderedB
    }
}

function renderThunk(thunk, previous) {
    var renderedThunk = thunk.vnode

    if (!renderedThunk) {
        renderedThunk = thunk.vnode = thunk.render(previous)
    }

    if (!(isVNode(renderedThunk) ||
            isVText(renderedThunk) ||
            isWidget(renderedThunk))) {
        throw new Error("thunk did not return a valid node");
    }

    return renderedThunk
}

},{"./is-thunk":16,"./is-vnode":18,"./is-vtext":19,"./is-widget":20}],16:[function(require,module,exports){
module.exports = isThunk

function isThunk(t) {
    return t && t.type === "Thunk"
}

},{}],17:[function(require,module,exports){
module.exports = isHook

function isHook(hook) {
    return hook &&
      (typeof hook.hook === "function" && !hook.hasOwnProperty("hook") ||
       typeof hook.unhook === "function" && !hook.hasOwnProperty("unhook"))
}

},{}],18:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualNode

function isVirtualNode(x) {
    return x && x.type === "VirtualNode" && x.version === version
}

},{"./version":21}],19:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualText

function isVirtualText(x) {
    return x && x.type === "VirtualText" && x.version === version
}

},{"./version":21}],20:[function(require,module,exports){
module.exports = isWidget

function isWidget(w) {
    return w && w.type === "Widget"
}

},{}],21:[function(require,module,exports){
module.exports = "2"

},{}],22:[function(require,module,exports){
var version = require("./version")
var isVNode = require("./is-vnode")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")
var isVHook = require("./is-vhook")

module.exports = VirtualNode

var noProperties = {}
var noChildren = []

function VirtualNode(tagName, properties, children, key, namespace) {
    this.tagName = tagName
    this.properties = properties || noProperties
    this.children = children || noChildren
    this.key = key != null ? String(key) : undefined
    this.namespace = (typeof namespace === "string") ? namespace : null

    var count = (children && children.length) || 0
    var descendants = 0
    var hasWidgets = false
    var hasThunks = false
    var descendantHooks = false
    var hooks

    for (var propName in properties) {
        if (properties.hasOwnProperty(propName)) {
            var property = properties[propName]
            if (isVHook(property) && property.unhook) {
                if (!hooks) {
                    hooks = {}
                }

                hooks[propName] = property
            }
        }
    }

    for (var i = 0; i < count; i++) {
        var child = children[i]
        if (isVNode(child)) {
            descendants += child.count || 0

            if (!hasWidgets && child.hasWidgets) {
                hasWidgets = true
            }

            if (!hasThunks && child.hasThunks) {
                hasThunks = true
            }

            if (!descendantHooks && (child.hooks || child.descendantHooks)) {
                descendantHooks = true
            }
        } else if (!hasWidgets && isWidget(child)) {
            if (typeof child.destroy === "function") {
                hasWidgets = true
            }
        } else if (!hasThunks && isThunk(child)) {
            hasThunks = true;
        }
    }

    this.count = count + descendants
    this.hasWidgets = hasWidgets
    this.hasThunks = hasThunks
    this.hooks = hooks
    this.descendantHooks = descendantHooks
}

VirtualNode.prototype.version = version
VirtualNode.prototype.type = "VirtualNode"

},{"./is-thunk":16,"./is-vhook":17,"./is-vnode":18,"./is-widget":20,"./version":21}],23:[function(require,module,exports){
var version = require("./version")

VirtualPatch.NONE = 0
VirtualPatch.VTEXT = 1
VirtualPatch.VNODE = 2
VirtualPatch.WIDGET = 3
VirtualPatch.PROPS = 4
VirtualPatch.ORDER = 5
VirtualPatch.INSERT = 6
VirtualPatch.REMOVE = 7
VirtualPatch.THUNK = 8

module.exports = VirtualPatch

function VirtualPatch(type, vNode, patch) {
    this.type = Number(type)
    this.vNode = vNode
    this.patch = patch
}

VirtualPatch.prototype.version = version
VirtualPatch.prototype.type = "VirtualPatch"

},{"./version":21}],24:[function(require,module,exports){
var version = require("./version")

module.exports = VirtualText

function VirtualText(text) {
    this.text = String(text)
}

VirtualText.prototype.version = version
VirtualText.prototype.type = "VirtualText"

},{"./version":21}],25:[function(require,module,exports){
var isObject = require("is-object")
var isHook = require("../vnode/is-vhook")

module.exports = diffProps

function diffProps(a, b) {
    var diff

    for (var aKey in a) {
        if (!(aKey in b)) {
            diff = diff || {}
            diff[aKey] = undefined
        }

        var aValue = a[aKey]
        var bValue = b[aKey]

        if (aValue === bValue) {
            continue
        } else if (isObject(aValue) && isObject(bValue)) {
            if (getPrototype(bValue) !== getPrototype(aValue)) {
                diff = diff || {}
                diff[aKey] = bValue
            } else if (isHook(bValue)) {
                 diff = diff || {}
                 diff[aKey] = bValue
            } else {
                var objectDiff = diffProps(aValue, bValue)
                if (objectDiff) {
                    diff = diff || {}
                    diff[aKey] = objectDiff
                }
            }
        } else {
            diff = diff || {}
            diff[aKey] = bValue
        }
    }

    for (var bKey in b) {
        if (!(bKey in a)) {
            diff = diff || {}
            diff[bKey] = b[bKey]
        }
    }

    return diff
}

function getPrototype(value) {
  if (Object.getPrototypeOf) {
    return Object.getPrototypeOf(value)
  } else if (value.__proto__) {
    return value.__proto__
  } else if (value.constructor) {
    return value.constructor.prototype
  }
}

},{"../vnode/is-vhook":17,"is-object":3}],26:[function(require,module,exports){
var isArray = require("x-is-array")

var VPatch = require("../vnode/vpatch")
var isVNode = require("../vnode/is-vnode")
var isVText = require("../vnode/is-vtext")
var isWidget = require("../vnode/is-widget")
var isThunk = require("../vnode/is-thunk")
var handleThunk = require("../vnode/handle-thunk")

var diffProps = require("./diff-props")

module.exports = diff

function diff(a, b) {
    var patch = { a: a }
    walk(a, b, patch, 0)
    return patch
}

function walk(a, b, patch, index) {
    if (a === b) {
        return
    }

    var apply = patch[index]
    var applyClear = false

    if (isThunk(a) || isThunk(b)) {
        thunks(a, b, patch, index)
    } else if (b == null) {

        // If a is a widget we will add a remove patch for it
        // Otherwise any child widgets/hooks must be destroyed.
        // This prevents adding two remove patches for a widget.
        if (!isWidget(a)) {
            clearState(a, patch, index)
            apply = patch[index]
        }

        apply = appendPatch(apply, new VPatch(VPatch.REMOVE, a, b))
    } else if (isVNode(b)) {
        if (isVNode(a)) {
            if (a.tagName === b.tagName &&
                a.namespace === b.namespace &&
                a.key === b.key) {
                var propsPatch = diffProps(a.properties, b.properties)
                if (propsPatch) {
                    apply = appendPatch(apply,
                        new VPatch(VPatch.PROPS, a, propsPatch))
                }
                apply = diffChildren(a, b, patch, apply, index)
            } else {
                apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
                applyClear = true
            }
        } else {
            apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
            applyClear = true
        }
    } else if (isVText(b)) {
        if (!isVText(a)) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
            applyClear = true
        } else if (a.text !== b.text) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
        }
    } else if (isWidget(b)) {
        if (!isWidget(a)) {
            applyClear = true
        }

        apply = appendPatch(apply, new VPatch(VPatch.WIDGET, a, b))
    }

    if (apply) {
        patch[index] = apply
    }

    if (applyClear) {
        clearState(a, patch, index)
    }
}

function diffChildren(a, b, patch, apply, index) {
    var aChildren = a.children
    var orderedSet = reorder(aChildren, b.children)
    var bChildren = orderedSet.children

    var aLen = aChildren.length
    var bLen = bChildren.length
    var len = aLen > bLen ? aLen : bLen

    for (var i = 0; i < len; i++) {
        var leftNode = aChildren[i]
        var rightNode = bChildren[i]
        index += 1

        if (!leftNode) {
            if (rightNode) {
                // Excess nodes in b need to be added
                apply = appendPatch(apply,
                    new VPatch(VPatch.INSERT, null, rightNode))
            }
        } else {
            walk(leftNode, rightNode, patch, index)
        }

        if (isVNode(leftNode) && leftNode.count) {
            index += leftNode.count
        }
    }

    if (orderedSet.moves) {
        // Reorder nodes last
        apply = appendPatch(apply, new VPatch(
            VPatch.ORDER,
            a,
            orderedSet.moves
        ))
    }

    return apply
}

function clearState(vNode, patch, index) {
    // TODO: Make this a single walk, not two
    unhook(vNode, patch, index)
    destroyWidgets(vNode, patch, index)
}

// Patch records for all destroyed widgets must be added because we need
// a DOM node reference for the destroy function
function destroyWidgets(vNode, patch, index) {
    if (isWidget(vNode)) {
        if (typeof vNode.destroy === "function") {
            patch[index] = appendPatch(
                patch[index],
                new VPatch(VPatch.REMOVE, vNode, null)
            )
        }
    } else if (isVNode(vNode) && (vNode.hasWidgets || vNode.hasThunks)) {
        var children = vNode.children
        var len = children.length
        for (var i = 0; i < len; i++) {
            var child = children[i]
            index += 1

            destroyWidgets(child, patch, index)

            if (isVNode(child) && child.count) {
                index += child.count
            }
        }
    } else if (isThunk(vNode)) {
        thunks(vNode, null, patch, index)
    }
}

// Create a sub-patch for thunks
function thunks(a, b, patch, index) {
    var nodes = handleThunk(a, b)
    var thunkPatch = diff(nodes.a, nodes.b)
    if (hasPatches(thunkPatch)) {
        patch[index] = new VPatch(VPatch.THUNK, null, thunkPatch)
    }
}

function hasPatches(patch) {
    for (var index in patch) {
        if (index !== "a") {
            return true
        }
    }

    return false
}

// Execute hooks when two nodes are identical
function unhook(vNode, patch, index) {
    if (isVNode(vNode)) {
        if (vNode.hooks) {
            patch[index] = appendPatch(
                patch[index],
                new VPatch(
                    VPatch.PROPS,
                    vNode,
                    undefinedKeys(vNode.hooks)
                )
            )
        }

        if (vNode.descendantHooks || vNode.hasThunks) {
            var children = vNode.children
            var len = children.length
            for (var i = 0; i < len; i++) {
                var child = children[i]
                index += 1

                unhook(child, patch, index)

                if (isVNode(child) && child.count) {
                    index += child.count
                }
            }
        }
    } else if (isThunk(vNode)) {
        thunks(vNode, null, patch, index)
    }
}

function undefinedKeys(obj) {
    var result = {}

    for (var key in obj) {
        result[key] = undefined
    }

    return result
}

// List diff, naive left to right reordering
function reorder(aChildren, bChildren) {
    // O(M) time, O(M) memory
    var bChildIndex = keyIndex(bChildren)
    var bKeys = bChildIndex.keys
    var bFree = bChildIndex.free

    if (bFree.length === bChildren.length) {
        return {
            children: bChildren,
            moves: null
        }
    }

    // O(N) time, O(N) memory
    var aChildIndex = keyIndex(aChildren)
    var aKeys = aChildIndex.keys
    var aFree = aChildIndex.free

    if (aFree.length === aChildren.length) {
        return {
            children: bChildren,
            moves: null
        }
    }

    // O(MAX(N, M)) memory
    var newChildren = []

    var freeIndex = 0
    var freeCount = bFree.length
    var deletedItems = 0

    // Iterate through a and match a node in b
    // O(N) time,
    for (var i = 0 ; i < aChildren.length; i++) {
        var aItem = aChildren[i]
        var itemIndex

        if (aItem.key) {
            if (bKeys.hasOwnProperty(aItem.key)) {
                // Match up the old keys
                itemIndex = bKeys[aItem.key]
                newChildren.push(bChildren[itemIndex])

            } else {
                // Remove old keyed items
                itemIndex = i - deletedItems++
                newChildren.push(null)
            }
        } else {
            // Match the item in a with the next free item in b
            if (freeIndex < freeCount) {
                itemIndex = bFree[freeIndex++]
                newChildren.push(bChildren[itemIndex])
            } else {
                // There are no free items in b to match with
                // the free items in a, so the extra free nodes
                // are deleted.
                itemIndex = i - deletedItems++
                newChildren.push(null)
            }
        }
    }

    var lastFreeIndex = freeIndex >= bFree.length ?
        bChildren.length :
        bFree[freeIndex]

    // Iterate through b and append any new keys
    // O(M) time
    for (var j = 0; j < bChildren.length; j++) {
        var newItem = bChildren[j]

        if (newItem.key) {
            if (!aKeys.hasOwnProperty(newItem.key)) {
                // Add any new keyed items
                // We are adding new items to the end and then sorting them
                // in place. In future we should insert new items in place.
                newChildren.push(newItem)
            }
        } else if (j >= lastFreeIndex) {
            // Add any leftover non-keyed items
            newChildren.push(newItem)
        }
    }

    var simulate = newChildren.slice()
    var simulateIndex = 0
    var removes = []
    var inserts = []
    var simulateItem

    for (var k = 0; k < bChildren.length;) {
        var wantedItem = bChildren[k]
        simulateItem = simulate[simulateIndex]

        // remove items
        while (simulateItem === null && simulate.length) {
            removes.push(remove(simulate, simulateIndex, null))
            simulateItem = simulate[simulateIndex]
        }

        if (!simulateItem || simulateItem.key !== wantedItem.key) {
            // if we need a key in this position...
            if (wantedItem.key) {
                if (simulateItem && simulateItem.key) {
                    // if an insert doesn't put this key in place, it needs to move
                    if (bKeys[simulateItem.key] !== k + 1) {
                        removes.push(remove(simulate, simulateIndex, simulateItem.key))
                        simulateItem = simulate[simulateIndex]
                        // if the remove didn't put the wanted item in place, we need to insert it
                        if (!simulateItem || simulateItem.key !== wantedItem.key) {
                            inserts.push({key: wantedItem.key, to: k})
                        }
                        // items are matching, so skip ahead
                        else {
                            simulateIndex++
                        }
                    }
                    else {
                        inserts.push({key: wantedItem.key, to: k})
                    }
                }
                else {
                    inserts.push({key: wantedItem.key, to: k})
                }
                k++
            }
            // a key in simulate has no matching wanted key, remove it
            else if (simulateItem && simulateItem.key) {
                removes.push(remove(simulate, simulateIndex, simulateItem.key))
            }
        }
        else {
            simulateIndex++
            k++
        }
    }

    // remove all the remaining nodes from simulate
    while(simulateIndex < simulate.length) {
        simulateItem = simulate[simulateIndex]
        removes.push(remove(simulate, simulateIndex, simulateItem && simulateItem.key))
    }

    // If the only moves we have are deletes then we can just
    // let the delete patch remove these items.
    if (removes.length === deletedItems && !inserts.length) {
        return {
            children: newChildren,
            moves: null
        }
    }

    return {
        children: newChildren,
        moves: {
            removes: removes,
            inserts: inserts
        }
    }
}

function remove(arr, index, key) {
    arr.splice(index, 1)

    return {
        from: index,
        key: key
    }
}

function keyIndex(children) {
    var keys = {}
    var free = []
    var length = children.length

    for (var i = 0; i < length; i++) {
        var child = children[i]

        if (child.key) {
            keys[child.key] = i
        } else {
            free.push(i)
        }
    }

    return {
        keys: keys,     // A hash of key name to index
        free: free      // An array of unkeyed item indices
    }
}

function appendPatch(apply, patch) {
    if (apply) {
        if (isArray(apply)) {
            apply.push(patch)
        } else {
            apply = [apply, patch]
        }

        return apply
    } else {
        return patch
    }
}

},{"../vnode/handle-thunk":15,"../vnode/is-thunk":16,"../vnode/is-vnode":18,"../vnode/is-vtext":19,"../vnode/is-widget":20,"../vnode/vpatch":23,"./diff-props":25,"x-is-array":27}],27:[function(require,module,exports){
var nativeIsArray = Array.isArray
var toString = Object.prototype.toString

module.exports = nativeIsArray || isArray

function isArray(obj) {
    return toString.call(obj) === "[object Array]"
}

},{}],28:[function(require,module,exports){
(function (global){
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

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"vdom-parser":4,"virtual-dom/diff":7,"virtual-dom/patch":8}]},{},[28]);
