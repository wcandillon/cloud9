/**
 * XQuery linter worker.
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
define("ext/xquery/compiler", ["require", "exports", "module"], function(require, exports, module) {

var completeUtil = require("ext/codecomplete/complete_util");
var xqCompletion = require('ext/xquery/xquery_completion');
var baseLanguageHandler = require('ext/language/base_handler');
var Compiler = require('ext/xquery/lib/Compiler').Compiler;
var Utils = require('ext/xquery/lib/utils').Utils;
var handler = module.exports = Object.create(baseLanguageHandler);

var builtin = null;

handler.handlesLanguage = function(language) {
    return language === 'xquery';
};

handler.parse = function(code, callback) {
    var compiler = new Compiler();
    var ast = compiler.compile(code);
    callback(ast);
};

handler.isParsingSupported = function() {
    return true;
}; 

handler.findNode = function(ast, pos, callback) {
   callback(Utils.findNode(ast, pos));
};

handler.getPos = function(node, callback) {
    callback(node.pos);
}; 

handler.analyze = function(doc, ast, callback) {
    callback(handler.analyzeSync(doc, ast));
};

handler.analyzeSync = function(doc, ast) {
  var markers = ast.markers;
  var error = ast.error;
  //If syntax error, don't show warnings.
  return markers;
};

handler.outline = function(doc, ast, callback) {
    if (!ast)
        return callback();
    callback({ body: ast.outline });
};

handler.complete = function(doc, fullAst, pos, currentNode, callback) {
    if(builtin === null) {
      var text = completeUtil.fetchText(this.staticPrefix, 'ext/xquery/lib/builtin.json');
      builtin = JSON.parse(text);
    }
    
    var line = doc.getLine(pos.row);
    
    //TODO: propose URI completion non ast based
    if(currentNode !== undefined && currentNode.name === "URILiteral") {
      callback(xqCompletion.completeURI(line, pos, builtin));
    } else {
      callback(xqCompletion.completeExpr(line, pos, builtin, fullAst.sctx));
    }
};

  /*
handler.getVariablePositions = function(doc, fullAst, pos, currentNode, callback) {
    console.log(currentNode);
    callback();

  callback({
    length: c,
        pos: {
            row: pos.sl,
            column: pos.sc
        },  
        others: declarations.concat(uses),
        declarations: declarations,
        uses: uses
  }); 
};

  */

});
