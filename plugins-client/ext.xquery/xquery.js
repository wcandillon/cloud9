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
var markup = require("text!ext/xquery/xquery.xml");

var quickfix = require("ext/xquery/quickfix");

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
        
        ide.addEventListener("afteropenfile", function(event){
            ext.initExtension(_self);
        });        
        
        // XQuery features
        quickfix.hook(_self);
           
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
