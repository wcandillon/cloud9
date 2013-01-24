
define(function(require, exports, module) {
"use strict";

var MarkerResolution = require('ext/xquery/quickfix/MarkerResolution').MarkerResolution;

var IMG_DELETE = '/ext/xquery/images/delete_obj.gif';
var IMG_ADD = '/ext/xquery/images/add_obj.gif';
var IMG_CHANGE = '/ext/xquery/images/correction_change.gif';

/**
 * Resolver for xquery markers. getResolutions(marker) generates
 * MarkerResolutions for the given marker and returns them in a list
 */
var XQueryResolver = function(ast){
    
    
    
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
        var label = "Remove variable";
        var image = IMG_DELETE;
        var desc = "Preview of variable removal";
        
        var appliedContent = "";
        return [MarkerResolution(label,image,desc,appliedContent)];
    };
    
    
    
    
    
    this.getType = function(marker){
        var msg = marker.message;
        if (msg[0] === '$' && msg.indexOf('unused variable.') === 
            msg.length - 'unused variable.'.length){
            return "unusedVar";
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