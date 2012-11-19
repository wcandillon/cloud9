/**
 * Cloud9 Language Foundation
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
define(function(require, exports, module) {

var completeUtil = require("ext/codecomplete/complete_util");

var uriRegex = /[a-zA-Z_0-9\/\.:\-#]/;
var qnameRegex = /\$?[a-zA-Z_0-9:\-#]/;

module.exports.completeURI = function completeURI(line, pos, builtin) {
    var identifier = completeUtil.retrievePreceedingIdentifier(line, pos.column, uriRegex);
    var matches = completeUtil.findCompletions(identifier, Object.keys(builtin));
    return matches.map(function(uri) {
      var module = builtin[uri];
      return {
          doc: module.doc,
          docUrl: module.docUrl,
          icon: "property",
          isFunction: false,
          name: uri,
          priority: 4,
          replaceText: uri,
          identifierRegex: uriRegex
      };
    });
};

module.exports.completeVariable = function completeVariable(line, pos, builtin, stcx) {
  var markers = [];
  return markers;
};

module.exports.completeFunction = function completeFunction(line, pos, builtin, stcx) {
  var markers = [];
  return markers;
};

module.exports.complete = function(line, pos, builtin, stcx) {
  var markers = [];
  var identifier = completeUtil.retrievePreceedingIdentifier(line, pos.column, qnameRegex);
  var isVar = identifier.substring(0, 1) === "$";
  console.log(identifier);
  if(isVar) {
    markers = completeVariable(line, pos, builtin, fullAst.sctx);
  } else {
    markers = completeFunction(line, pos, builtin, fullAst.sctx);
  }
  return markers;
};



});
