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
var WorkerClient = require("ace/worker/worker_client").WorkerClient;
var UIWorkerClient = require("ace/worker/worker_client").UIWorkerClient;
var useUIWorker = window.location && /[?&]noworker=1/.test(window.location.search);


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

        var Worker = useUIWorker ? UIWorkerClient : WorkerClient;
        var worker = _self.worker = new Worker(["treehugger", "ext", "ace", "c9"], "ext/xquery/worker", "XQueryWorker");
        quickfix.setWorker(worker);
        
        
        // XQuery features
        quickfix.hook(_self, worker);
           
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
