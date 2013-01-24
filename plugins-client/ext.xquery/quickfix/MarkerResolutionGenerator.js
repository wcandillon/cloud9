
define(function(require, exports, module) {
"use strict";

var XQueryResolver = require('ext/xquery/quickfix/XQueryResolver').XQueryResolver;

/**
 * Generic resolution generator on which specific resolvers can be registered
 * and depending on the marker type (xquery, js, ...) the corresponding
 * resolver will be assigned with the task of generating resolutions for it.
 * 
 */
var MarkerResolutionGenerator = function(ast) {
    this.resolvers = {
        xquery: new XQueryResolver(ast)
    };
    
    this.getResolutions = function(marker){
        var lang = marker.lang;
        var resolver = this.resolvers[lang];
        if (!resolver){
            return [];
        }
        return resolver.getResolutions(marker);
    };
    
    this.registerResolver = function(lang, resolver){
        this.resolvers.lang = resolver;
    };
        
}; // MarkerResolutionGenerator


exports.MarkerResolutionGenerator = MarkerResolutionGenerator;

});