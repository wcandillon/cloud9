/**
 * XQuery linter worker.
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
 
define("ext/28msec/compiler", ["require", "exports", "module"], function(require, exports, module) {

var baseLanguageHandler = require('ext/language/base_handler');
var handler = module.exports = Object.create(baseLanguageHandler);

handler.filesReadyToCompile = {};

handler.init = function(callback) {
  //handler.sender.on("afterfilesave", function(event) {
  //    handler.filesReadyToCompile[event.data.path.replace(/^\/workspace/, handler.workspaceDir)] = true;
  //});
  callback();  
};

handler.handlesLanguage = function(language) {
    return language === 'xquery';
};

handler.analyze = function(doc, ast, callback) {
    callback(handler.analyzeSync(doc, ast));
};

handler.analyzeSync = function(doc, ast) {
  var markers = [];
  
  if(path === null) return markers;
  
  var path = handler.path.replace(/^\/workspace/, handler.workspaceDir);
  
  //if(handler.filesReadyToCompile[path] !== true) return markers;
  //delete handler.filesReadyToCompile[path];
  
  var xhr = new XMLHttpRequest();
  xhr.open('GET', "/api/compile?path=" + path, false);
  
  try { 
    xhr.send();
  } catch(e) {
    return markers;
  }
  
  if(xhr.status === 200) {
    return JSON.parse(xhr.responseText);
  }
  
  return markers;
};

});