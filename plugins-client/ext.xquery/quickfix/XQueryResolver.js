
define(function(require, exports, module) {
"use strict";

var markerResolution = require('ext/xquery/quickfix/MarkerResolution').MarkerResolution;

// Visitors
var VariableRemover = require('ext/xquery/lib/visitors/VariableRemover').VariableRemover;
var NamespaceRemover = require('ext/xquery/lib/visitors/NamespaceRemover').NamespaceRemover;
var Renamer = require('ext/xquery/lib/visitors/Renamer').Renamer;
var Adder = require('ext/xquery/lib/visitors/Adder').Adder;


var IMG_DELETE = '/ext/xquery/images/delete_obj.gif';
var IMG_ADD = '/ext/xquery/images/add_obj.gif';
var IMG_CHANGE = '/ext/xquery/images/correction_change.gif';

var NUM_NSRENAME_SUGGESTIONS = 5;

var RENAME = {
    name: 0,
    prefix: 1
};

var ADD = {
    NamespaceDecl: 0
};

/**
 * Resolver for xquery markers. getResolutions(marker) generates
 * MarkerResolutions for the given marker and returns them in a list
 */
var XQueryResolver = function(ast){
    
    //-----------------------------------
    // UTILITY FUNCTIONS
    //-----------------------------------
    
    var memo = [];
    function levenshteinDistance(str1, i, len1, str2, j, len2) {
       var key = [i,len1,j,len2].join(',');
       if(memo[key] !== undefined) return memo[key];
       
       if(len1 === 0) return len2;
       if(len2 === 0) return len1;
       var cost = 0;
       if(str1[i] != str2[j]) cost = 1;
       
       var dist = Math.min(
           levenshteinDistance(str1, i+1,len1-1, str2,j,len2)+1, 
           levenshteinDistance(str1,i,len1,str2,j+1,len2-1)+1,
           levenshteinDistance(str1,i+1,len1-1,str2,j+1,len2-1)+cost);
       memo[key] = dist;
       return dist;
    }   
    
    function lDistance(str1, str2){
        memo = [];
        return levenshteinDistance(str1, 0, str1.length, str2, 0, str2.length);
    }
    
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

    function endsWith(str, end){
        if (str.length < end.length)
            return false;
        return str.substring(str.length - end.length) === end;
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
    
    
    //-----------------------------------
    // MARKER HANDLERS
    //-----------------------------------
    
    this.unusedVar = function(marker){
        var label = "Remove unused variable";
        var image = IMG_DELETE;
        
        var remover = new VariableRemover(ast);
        var removedAst = remover.removeVar(marker.pos);
          
        var appliedContent = astToText(removedAst);
        var preview = appliedContent;
        return [markerResolution(label,image,preview,appliedContent)];
    };
    
    this.unusedNamespace = function(marker){
        // TODO if there is a XPST0081 somewhere (prefix not found), also
        // suggest to rename the unused namespace prefix to that prefix
        
        var label = "Remove unused namespace prefix";
        var image = IMG_DELETE;
        
        var remover = new NamespaceRemover(ast);
        var removedAst = remover.removeNs(marker.pos);
          
        var appliedContent = astToText(removedAst);
        var preview = appliedContent;
        return [markerResolution(label,image,preview,appliedContent)];
    };
    
    this.duplicateNamespace = function(marker){
        var label = "Remove duplicate namespace prefix";
        var image = IMG_DELETE;
        
        var remover = new NamespaceRemover(ast);
        var removedAst = remover.removeNs(marker.pos);
          
        var appliedContent = astToText(removedAst);
        var preview = appliedContent;
        return [markerResolution(label,image,preview,appliedContent)];
    };
    
    /** Can not expand namespace prefix to URI */
    this.XPST0081 = function(marker){
        var _self = this;
        
        var prefix = marker.message.split('"')[1];


        // Resolution family 1: Change prefix to declared prefix
        var renames = [];
        var localRenames = [];
        var currentNamespaces = [];
        for (var ns in ast.sctx.namespaces){
            if (ast.sctx.namespaces.hasOwnProperty(ns)){
                currentNamespaces.push(ns);
            }
        }
         for (var ns in ast.sctx.declaredNS){
            if (ast.sctx.declaredNS.hasOwnProperty(ns)){
                currentNamespaces.push(ns);
            }
        }

        currentNamespaces.forEach(function(ns){
            if (!localRenames[ns]){
                localRenames[ns] = true;
                renames.push({
                   marker: marker,
                   label: "Change prefix to " + ns,
                   toName: ns,
                   renameType: RENAME.prefix
                });
            }
        });        
        
        // Resolution family 2: Rename existing import / namespacedecl
        var nsRenames = [];
        ast.markers.forEach(function(mrk){
            if (_self.getType(mrk) == "unusedNamespace"){
                var unusedPrefix = mrk.message.split('"')[1];
                if (!nsRenames[ns]){
                    nsRenames[ns] = true;
                    renames.push({
                       marker: mrk,
                       label: 'Change unused namespace prefix "' + unusedPrefix +'" to '
                        + prefix,
                       toName: prefix,
                       fromName: unusedPrefix,
                       renameType: RENAME.name
                    });
                }                
            }
        });
        
        renames.sort(
            function(a,b){
                var compareA = a.fromName || a.toName;
                var compareB = b.fromName || b.toName;
                return lDistance(compareA,prefix) - lDistance(compareB,prefix);
            }
        );
        
        var renameResolutions = [];
        for (var i = 0; i < NUM_NSRENAME_SUGGESTIONS && i < renames.length; i++){
            var rename = renames[i];
            var resolution = this.resRename(rename.marker, rename.label, 
                                            rename.toName, rename.renameType);
            renameResolutions.push(resolution);
        }
        
                
        // Resolution family 3: Add import / namespacedecl
        var addResolution = this.resAddNamespaceDecl(prefix,"");
        
        var ret = [];
        
        ret.push(addResolution);
        
        for (var i = 0; 
             i < NUM_NSRENAME_SUGGESTIONS && i < renameResolutions.length; i++){
                 ret.push(renameResolutions[i]);
             }
        return ret;
    };
    
    
        
    //-----------------------------------
    // MarkerResolutions
    //-----------------------------------
    
    this.resRename = function(marker, label, toName, renameType){
        var image = IMG_CHANGE;
        var renamer = new Renamer(ast);
        var newAst;

        switch (renameType){
            case RENAME.name:
                newAst = renamer.rename(marker.pos, toName);    
                break;
            case RENAME.prefix:
                newAst = renamer.renamePrefix(marker.pos, toName);
                break;
            default:
                throw "Illegal renameType";
        }
          
        var appliedContent = astToText(newAst);
        var preview = appliedContent;
        //var preview = JSON.stringify(marker);
        var ret = markerResolution(label,image,preview,appliedContent);
        ret.toName = toName;
        ret.renameType = renameType;
        return ret;
    };
    
    this.resAdd = function(label, node, addType){
        var image = IMG_ADD;
        var adder = new Adder(ast);
        var newAst;
        
        switch(addType){
            case ADD.NamespaceDecl:
                newAst = adder.addNamespaceDecl(node);
                break;
            default:
                throw "Illegal addType";
        }
        
        var appliedContent = astToText(newAst);
        var preview = appliedContent + ", targetPos: " + JSON.stringify(newAst.cursorTarget);
        var ret = markerResolution(label,image,preview,appliedContent,newAst.cursorTarget);
        ret.addType = addType;
        return ret;
    };
    
    this.resAddNamespaceDecl = function(ncName, uriLiteral){
      var label = 'Add namespace declaration "' + ncName + '"';
      uriLiteral = uriLiteral || "";
      var node = {
          NCName: ncName,
          URILiteral: uriLiteral
      };
      return this.resAdd(label, node, ADD.NamespaceDecl);
    };
 
    
};


exports.XQueryResolver = XQueryResolver;

}); 