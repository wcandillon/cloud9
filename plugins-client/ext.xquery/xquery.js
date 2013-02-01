/**
 * Cloud9 Language Foundation
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
define(function(require, exports, module) {

var ext = require("core/ext");
var ide = require("core/ide");
var editors = require("ext/editors/editors");
var language = require("ext/language/language");
var filelist = require("ext/filelist/filelist");

module.exports = ext.register("ext/xquery/xquery", {
    name    : "XQuery Language Support",
    dev     : "28msec",
    type    : ext.GENERAL,
    deps    : [editors, language],
    nodes   : [],
    alone   : true,
    
    hook: function() {
      var that = this;
      language.registerLanguageHandler('ext/xquery/compiler');
      
      ide.addEventListener("extload", this.$extLoad = function(){
        that.updateFileCache();
      });
      
      ide.addEventListener("newfile", this.$newFile = function() {
        that.updateFileCache(true);
      });

      ide.addEventListener("removefile", this.$removeFile = function() {
        that.updateFileCache(true);
      });
    },

    updateFileCache : function(isDirty){
        filelist.getFileList(isDirty, function(data, state){
            if (state != apf.SUCCESS)
                return;
            language.worker.emit("updateFileCache", { data: data });
        });
    },
    
    enable : function() {
    },

    disable : function() {
    },

    destroy : function() {
    }
});

});
