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
var Outliner = require('ext/xquery/visitors/outliner').Outliner;

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

handler.handlesLanguage = function(language) {
    return language === 'xquery';
};

handler.parse = function(code, callback) {
    var h = new JSONParseTreeHandler(code);
    var parser = new XQueryParser(code, h);
    var ast = null;
    try {
      parser.parse_XQuery();
      ast = h.getParseTree();
    } catch(e) {
      if(e.getBegin !== undefined) {
        var pos = handler.convertPosition(code, e.getBegin(), e.getEnd());
        var message = parser.getErrorMessage(e);
        ast = ast === null ? { name: "XQuery" } : ast;
        ast.error = {
          pos: pos,
          type: "error",
          level: "error",
          message: message
        };
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
   //if(typeof ast.findNode === 'function') {
   //  callback(ast.findNode(pos));  
   //}
   callback();
};

handler.getPos = function(node, callback) {
    callback(node.pos);
}; 

handler.analyze = function(doc, ast, callback) {
    callback(handler.analyzeSync(doc, ast));
};

handler.analyzeSync = function(doc, ast) {
  var markers = [];
  var error = ast.error;
  if (error) {      
    markers.push(error);
  } else {
    var xqlint = new XQLint(ast);
    markers = xqlint.getMarkers();
  }
  return markers;
};

handler.outline = function(doc, ast, callback) {
    if (!ast)
        return callback();
    callback({ body : extractOutline(doc, ast) });
};

// This is where the fun stuff happens
function extractOutline(doc, node) {
    var outliner = new Outliner(node);
    return outliner.getOutline();
};


});
