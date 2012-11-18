/**
 * XQuery linter worker.
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
define("ext/xquery/compiler", ["require", "exports", "module"], function(require, exports, module) {

var baseLanguageHandler = require('ext/language/base_handler');
var Compiler = require('ext/xquery/lib/Compiler').Compiler;
var handler = module.exports = Object.create(baseLanguageHandler);

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
    markers = ast.markers;
  }
  return markers;
};

handler.outline = function(doc, ast, callback) {
    if (!ast)
        return callback();
    callback({ body: ast.outline });
};

});
