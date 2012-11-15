/**
 * XQuery linter worker.
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
define("ext/xquery/parser", ["require", "exports", "module"], function(require, exports, module) {

var baseLanguageHandler = require('ext/language/base_handler');
var XQueryParser = require('ext/xquery/XQueryParser').XQueryParser;
var XQLint = require('ext/xquery/xqlint').XQLint;
var JSONParseTreeHandler = require('ext/xquery/JSONParseTreeHandler').JSONParseTreeHandler;
var handler = module.exports = Object.create(baseLanguageHandler);
var traverse = require("treehugger/traverse");
var tree = require("treehugger/tree");
var completeUtil = require("ext/codecomplete/complete_util");

handler.handlesLanguage = function(language) {
    return language === 'xquery';
};

handler.convertPosition = function(code, begin, end)
{
  var before = code.substring(0, begin);
  var after  = code.substring(0, end);
  var startline = before.split("\n").length;
  var startcolumn = begin - before.lastIndexOf("\n");
  var endline = after.split("\n").length;
  var endcolumn = end - after.lastIndexOf("\n");
  return {sl: startline - 1, sc: startcolumn - 1, el: endline - 1, ec: endcolumn - 1};
};

handler.toTreeHugger = function(code, ast) {
  var name = ast.name;
  var children = [];
  for(var i in ast.children) {
    var child = ast.children[i];
    var n = handler.toTreeHugger(code, child);
    children.push(n);
  }
  var pos = handler.convertPosition(code, ast.begin, ast.end);
  var node = tree.cons(name, children);
  node.setAnnotation("pos", pos);
  return node;
};

handler.parse = function(code, callback) {
    var h = new JSONParseTreeHandler();
    var parser = new XQueryParser(code, h);
    var ast = null;
    try {
      parser.parse_XQuery();
      ast = h.getParseTree();
      ast = handler.toTreeHugger(code, ast);
      traverse.addParentPointers(ast);
    } catch(e) {
      if(e.getBegin !== undefined) {
        var pos = handler.convertPosition(code, e.getBegin(), e.getEnd());
        var message = parser.getErrorMessage(e);
        ast = ast === null ? tree.cons("XQuery", []) : ast;
        ast.setAnnotation("error", {
          pos: pos,
          type: "error",
          level: "error",
          message: message
        });
      } else {
        throw e;   
      }
    }
    callback(ast);
};

handler.isParsingSupported = function() {
    return true;
}; 

handler.findNode = function(ast, pos, callback) {
    if(typeof ast.findNode === 'function') {
      callback(ast.findNode(pos));  
    }
};

handler.getPos = function(node, callback) {
    callback(node.getPos());
};

handler.analyze = function(doc, ast, callback) {
    callback(handler.analyzeSync(doc, ast));
};

handler.analyzeSync = function(doc, ast) {
  var markers = [];
  var error = ast.getAnnotation("error");
  if (error) {      
    markers.push(error);
  } else {
    xqlint = new XQLint(doc.getValue(), ast);
    markers = xqlint.getMarkers();
  }
  return markers;
};

});
