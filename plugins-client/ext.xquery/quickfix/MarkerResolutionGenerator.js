
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
    
    this.applyResolution = function(resolution){
        var lang = resolution.lang;
        var resolver = this.resolvers[lang];
        if (!resolver){
            throw "Missing resolver for markerresolution of language: " + lang;
        }
        return resolver.apply(resolution);
    };
    
    this.previewResolution = function(resolution){
        if (!resolution.preview){
            // This resolution has no preview and none can be computed
            return ""; 
        }
        
        if (resolution.preview === ""){
            // Compute the preview
            var lang = resolution.lang;
            var resolver = this.resolvers[lang];
            if (!resolver){
                throw "Missing resolver for markerresolution of language: " + lang;
            }
            resolver.preview(resolution);
        }
     
        return resolution.preview;
    };
        
}; // MarkerResolutionGenerator



exports.MarkerResolutionGenerator = MarkerResolutionGenerator;

});