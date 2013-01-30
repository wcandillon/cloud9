
define(function(require, exports, module) {
"use strict";

var MarkerResolution = require('ext/xquery/quickfix/MarkerResolution').MarkerResolution;

// Visitors
var VariableRemover = require('ext/xquery/lib/visitors/VariableRemover').VariableRemover;
var NamespaceRemover = require('ext/xquery/lib/visitors/NamespaceRemover').NamespaceRemover;

var IMG_DELETE = '/ext/xquery/images/delete_obj.gif';
var IMG_ADD = '/ext/xquery/images/add_obj.gif';
var IMG_CHANGE = '/ext/xquery/images/correction_change.gif';

/**
 * Resolver for xquery markers. getResolutions(marker) generates
 * MarkerResolutions for the given marker and returns them in a list
 */
var XQueryResolver = function(ast){
    
    function astToText(node){
        if (node !== undefined){
            var resText = "";
            if (node.value !== undefined) {
                resText += node.value;
            }
            for (var i = 0; i < node.children.length; i++){
                resText += astToText(node.children[i]);
            }
            return resText;
        }else{
            return "";
        }
    }
    
    this.getResolutions = function(marker){
        var type = this.getType(marker);
        if (type){
            if (typeof this[type] === 'function'){
                return this[type](marker);
            }
        }
    
       return [];
    };
    
    this.unusedVar = function(marker){
        var label = "Remove unused variable";
        var image = IMG_DELETE;
        
        var remover = new VariableRemover(ast);
        var removedAst = remover.removeVar(marker.pos);
          
        var appliedContent = astToText(removedAst);
        var preview = appliedContent;
        return [MarkerResolution(label,image,preview,appliedContent)];
    };
    
    this.unusedNamespace = function(marker){
        var label = "Remove unused namespace prefix";
        var image = IMG_DELETE;
        
        var remover = new NamespaceRemover(ast);
        var removedAst = remover.removeNs(marker.pos);
          
        var appliedContent = astToText(removedAst);
        var preview = appliedContent;
        return [MarkerResolution(label,image,preview,appliedContent)];
    };
    
    this.duplicateNamespace = function(marker){
        var label = "Remove duplicate namespace prefix";
        var image = IMG_DELETE;
        
        var remover = new NamespaceRemover(ast);
        var removedAst = remover.removeNs(marker.pos);
          
        var appliedContent = astToText(removedAst);
        var preview = appliedContent;
        return [MarkerResolution(label,image,preview,appliedContent)];
    };
    
    
    function endsWith(str, end){
        if (str.length < end.length)
            return false;
        return str.substring(str.length - end.length) === end;
    }
    
    this.getType = function(marker){
        var msg = marker.message;
        if (msg[0] === '$' && endsWith(msg, ': unused variable.')){
            return "unusedVar";
        }
        
        if (msg[0] === '"'){
            if (endsWith(msg, ': unused namespace prefix.')){
                return "unusedNamespace";
            } else if (endsWith(msg, '".')
            && msg.indexOf('": is already available with the prefix "') != -1){
                 return "duplicateNamespace";
            }
        }
        
        var errCode = marker.message.substring(1, 9);
        if (errCode.length < 8){
            return;
        }
        
        return errCode;
    };
    
};


exports.XQueryResolver = XQueryResolver;

}); 