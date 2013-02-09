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
var markup = require("text!ext/xquery/xquery.xml");

var quickfix = require("ext/xquery/quickfix");
var filelist = require("ext/filelist/filelist");

var commands = require("ext/commands/commands");
var XQueryParser = require('ext/xquery/lib/XQueryParser').XQueryParser;
var JSONParseTreeHandler = require('ext/xquery/lib/JSONParseTreeHandler').JSONParseTreeHandler;
var CodeFormatter = require('ext/xquery/lib/visitors/CodeFormatter').CodeFormatter;

module.exports = ext.register("ext/xquery/xquery", {
    name    : "XQuery Language Support",
    dev     : "28msec",
    type    : ext.GENERAL,
    deps    : [editors, language],
    nodes   : [],
    markup  : markup,
    alone   : true,
    
    hook: function() {
      var _self = this;
        
      language.registerLanguageHandler('ext/xquery/compiler');
      
      ide.addEventListener("extload", this.$extLoad = function(){
        _self.updateFileCache();
      });
      
      ide.addEventListener("newfile", this.$newFile = function() {
        _self.updateFileCache(true);
      });

      ide.addEventListener("removefile", this.$removeFile = function() {
        _self.updateFileCache(true);
      });

      ide.addEventListener("afteropenfile", function(event){
        ext.initExtension(_self);
      });        
      
      commands.addCommand({
            name: "beautify",
            hint: "reformat selected XQuery code in the editor",
            msg: "Beautifying selection.",
            bindKey: {mac: "Command-Shift-X", win: "Shift-Ctrl-X"},
            isAvailable : function(editor){
                if (editor && editor.path == "ext/code/code") {
                    return true;
                }
                return false;
            },
            exec: function (editor) {
                _self.beautify(editor);
            }
      });

      // XQuery features
      quickfix.hook(_self);
    },

    updateFileCache : function(isDirty){
        filelist.getFileList(isDirty, function(data, state){
            if (state != apf.SUCCESS)
                return;
            language.worker.emit("updateFileCache", { data: data });
        });       
    },
    
    beautify: function(editor) {
      var code = editor.getDocument().getValue();
      var h = new JSONParseTreeHandler(code);
      var parser = new XQueryParser(code, h); 
      parser.parse_XQuery();
      var ast = h.getParseTree();
      var codeFormatter = new CodeFormatter(ast);
      var formatted = codeFormatter.format();
      editor.getDocument().setValue(formatted);
    },

    
    init: function(amlNode) {

    },
    
    enable : function() {
    },

    disable : function() {
    },

    destroy : function() {
    }
    
    
});

});
