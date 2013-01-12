/**
 * Cloud9 Language Foundation
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
define(function(require, exports, module) {

var completeUtil = require("ext/codecomplete/complete_util");
var Utils = require('ext/xquery/lib/utils').Utils;

var uriRegex = /[a-zA-Z_0-9\/\.:\-#]/;
var qnameRegex = /\$?[a-zA-Z_0-9:\-#]*/;

function completeURI(line, pos, builtin) {
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

function completeVariable(identifier, pos, builtin, ast) {
  var sctx = Utils.findNode(ast.sctx, { line: pos.row, col: pos.column});
  var decls = sctx.getVarDecls();
  var names = Object.keys(decls);
  var matches = completeUtil.findCompletions(identifier, names);
  return matches.map(function(name) {
      return {
          icon: "property",
          isFunction: false,
          name: identifier,
          priority: 4,
          replaceText: "$" + identifier,
          identifierRegex: qnameRegex
      };
    });
};

function completeNSFunctions(pfx, local, pos, builtin, sctx) {
    var ns = sctx.namespaces[pfx];
    //console.log(ns);
    var names = Object.keys(builtin[ns].functions);
    for(var i in names) {
        names[i] = pfx + ":" + names[i];
    }
    
    var matches = completeUtil.findCompletions(pfx+local, names);
    return matches.map(function(name) {
      //console.log(name);
      //TODO support multiple arities
      var local = name.substring(name.indexOf(":") + 1);
      //console.log(local);
      var fn = builtin[ns].functions[local][0];
      var args = "(" +  fn.params.join(", ") + ")";
      return {
          doc: fn.doc,
          docUrl: fn.docUrl,
          icon: "method",
          isFunction: true,
          name: name + args,
          priority: 4,
          replaceText: name + args,
          identifierRegex: uriRegex
      };
    });
}

function completeDefaultFunctions(identifier, pos, builtin, sctx) {
    var ns = sctx.defaultFnNs;
    var matches = completeUtil.findCompletions(identifier, Object.keys(builtin[ns].functions));
    return matches.map(function(name) {
      //TODO support multiple arities
      var fn = builtin[ns].functions[name][0];
      var args = "(" +  fn.params.join(", ") + ")";
      return {
          doc: fn.doc,
          docUrl: fn.docUrl,
          icon: "method",
          isFunction: true,
          name: name + args,
          priority: 4,
          replaceText:  name + args,
          identifierRegex: uriRegex
      };
    });
}

function completeFunction(identifier, pos, builtin, sctx) {
  var markers = [];
  var pfx = identifier.substring(0, identifier.indexOf(":"));
  var local = identifier.substring(identifier.indexOf(":") + 1);
  
  //console.log("Prefix" + pfx);
  //console.log("Local: " + local);
  if(pfx === "") {
    return completeDefaultFunctions(identifier, pos, builtin, sctx);
  } else {
    return completeNSFunctions(pfx, local, pos, builtin, sctx);
  }
  return markers;
};

function completeExpr(line, pos, builtin, sctx) {
  var markers = [];
  var identifier = completeUtil.retrievePreceedingIdentifier(line, pos.column, qnameRegex);
  var isVar = identifier.substring(0, 1) === "$";
  //console.log(identifier);
  if(isVar) {
    markers = completeVariable(identifier, pos, builtin, sctx);
  } else {
    markers = completeFunction(identifier, pos, builtin, sctx);
  }
  return markers;
};

module.exports.completeURI = completeURI;
module.exports.completeExpr = completeExpr;
module.exports.completeVariable = completeVariable;
module.exports.completeFunction = completeFunction;

});
