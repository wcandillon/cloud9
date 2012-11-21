/**
 * Cloud9 Language Foundation
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
define(function(require, exports, module) {
    
var ide = require("core/ide");
var ext = require("core/ext");
var editors = require("ext/editors/editors");
var language = require("ext/language/language");

module.exports = ext.register("ext/28msec/28msec", {
    name    : "28msec Support",
    dev     : "28msec",
    type    : ext.GENERAL,
    deps    : [editors, language],
    nodes   : [],
    alone   : true,
    
    hook: function() {

        var that = this;
        ide.addEventListener("init.ext/language/language", function() {
          //ide.addEventListener("afterfilesave", that.onFileSave.bind(that));
          language.registerLanguageHandler('ext/28msec/compiler');
        }); 
    },
    /*
    onFileSave: function(event) {
      language.worker.emit("afterfilesave", {data: {
        path: event.oldpath
      }});
    },*/  

    enable : function() {
    },

    disable : function() {
    },

    destroy : function() {
    }
});

});
