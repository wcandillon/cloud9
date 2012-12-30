/**
 * XQuery linter worker.
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
define("ext/xquery/compiler", ["require", "exports", "module"], function(require, exports, module) {

    var completeUtil = require("ext/codecomplete/complete_util");
    var xqCompletion = require('ext/xquery/xquery_completion');
    var baseLanguageHandler = require('ext/language/base_handler');
    var XQueryParser = require('ext/xquery/lib/XQueryParser').XQueryParser;
    var JSONParseTreeHandler = require('ext/xquery/lib/JSONParseTreeHandler').JSONParseTreeHandler;
    var CodeFormatter = require('ext/xquery/lib/visitors/CodeFormatter').CodeFormatter;
    var Compiler = require('ext/xquery/lib/Compiler').Compiler;
    var Utils = require('ext/xquery/lib/utils').Utils;
    var handler = module.exports = Object.create(baseLanguageHandler);

    var builtin = null;
    
    var nsDecls = ["NamespaceDecl", "ModuleDecl", "SchemaPrefix", "ModuleImport"];
    
    function findPrefixDeclaration(prefix, node) {
      if(node.name === "NCName" && node.value === prefix && node.getParent && node.getParent.getParent && nsDecls.indexOf(node.getParent.getParent.name) !== -1) {
        return node.pos;      
      }
      for(var i in node.children) {
        var child = node.children[i];
        var pos = findPrefixDeclaration(prefix, child);
        if(pos !== undefined) {
          return pos;        
        }
      }
    }
    
    function findPrefixReferences(prefix, node) {
      var references = [];
      if(["QName", "Wildcard"].indexOf(node.name) !== -1 && node.value.indexOf(":") !== -1 && node.value.substring(0, node.value.indexOf(":")) === prefix) {
        var idx = node.value.indexOf(":");
        var pos = node.pos;
        references.push({ sl: pos.sl, sc: pos.sc, el: pos.el, ec: pos.sc + idx });  
      } else if(node.name === "EQName" && node.value && node.value.substring(0, 2) !== "Q{" && node.value.indexOf(":") !== -1 && 
        node.value.substring(0, node.value.indexOf(":")) === prefix) {
        var idx = node.value.indexOf(":");
        var pos = node.pos;
        references.push({ sl: pos.sl, sc: pos.sc, el: pos.el, ec: pos.sc + idx });  
      }
      for(var i in node.children) {
        var child = node.children[i];
        references = references.concat(findPrefixReferences(prefix, child));
      }
      return references;
    }

    handler.handlesLanguage = function(language) {
        return language === 'xquery';
    };

    handler.parse = function(code, callback) {
        var compiler = new Compiler();
        var ast = compiler.compile(code);
        callback(ast);
    };

    handler.isParsingSupported = function() {
        return true;
    };

    handler.findNode = function(ast, pos, callback) {
        callback(Utils.findNode(ast, pos));
    };

    handler.getPos = function(node, callback) {
        callback(node.pos);
    };

    handler.analyze = function(doc, ast, callback) {
        callback(handler.analyzeSync(doc, ast));
    };

    handler.analyzeSync = function(doc, ast) {
        var markers = ast.markers;
        var error = ast.error;
        //If syntax error, don't show warnings.
        return markers;
    };

    handler.outline = function(doc, ast, callback) {
        if (!ast) return callback();
        callback({
            body: ast.outline
        });
    };

    handler.complete = function(doc, fullAst, pos, currentNode, callback) {
        if (builtin === null) {
            var text = completeUtil.fetchText(this.staticPrefix, 'ext/xquery/lib/builtin.json');
            builtin = JSON.parse(text);
        }

        var line = doc.getLine(pos.row);

        //TODO: propose URI completion non ast based
        if (currentNode !== undefined && currentNode.name === "URILiteral") {
            callback(xqCompletion.completeURI(line, pos, builtin));
        }
        else {
            callback(xqCompletion.completeExpr(line, pos, builtin, fullAst.sctx));
        }
    };

    /**
     * Invoked when an automatic code formating is wanted
     * @param doc the Document object repersenting the source
     * @return a string value representing the new source code after formatting or null if not supported
     */
    handler.codeFormat = function(doc, callback) {
        var code = doc.getValue();
        var h = new JSONParseTreeHandler(code);
        var parser = new XQueryParser(code, h);
        parser.parse_XQuery();
        var ast = h.getParseTree();
        var codeFormatter = new CodeFormatter(ast);
        var formatted = codeFormatter.format();
        callback(formatted);
    };

    handler.onCursorMovedNode = function(doc, fullAst, cursorPos, currentNode, callback) {
        if (!currentNode) return callback();

        var markers = [];
        var enableRefactorings = [];
        
        if (["EQName", "QName"].indexOf(currentNode.name) !== -1
          && currentNode.value.indexOf(":") !== -1
          && (currentNode.pos.sc + currentNode.value.indexOf(":") >= cursorPos.column)
        ) {
            enableRefactorings.push("renameVariable");
            var prefix = currentNode.value.indexOf(":");
            var decl = findPrefixDeclaration(currentNode.value.substring(0, prefix), fullAst);
            if(decl !== undefined) {
              markers.push({
                pos: decl,
                type: "occurrence_main"
              });
            }
            var refs = findPrefixReferences(currentNode.value.substring(0, prefix), fullAst);
            for(var i in refs) {
              var ref = refs[i];
              markers.push({
                pos: ref,
                type: "occurrence_other"
              });
            }
        }
        else if (currentNode.name === "EQName" && currentNode.getParent && currentNode.getParent.name === "FunctionName" && currentNode.getParent.getParent && currentNode.getParent.getParent.name === "EQName" && currentNode.getParent.getParent.getParent && currentNode.getParent.getParent.getParent.name === "FunctionDecl") {

            enableRefactorings.push("renameVariable");

            markers.push({
                pos: currentNode.pos,
                type: "occurrence_main"
            });
            var references = fullAst.sctx.functionReferences[currentNode.value][currentNode.getParent.getParent.getParent.arity];
            for (var i in references) {
                var pos = references[i];
                markers.push({
                    pos: pos,
                    type: "occurrence_other"
                });
            }
        }
        else if (currentNode.name === "EQName" && currentNode.getParent && currentNode.getParent.name === "FunctionName" && currentNode.getParent.getParent.getParent && currentNode.getParent.getParent.name === "FunctionCall") {
            enableRefactorings.push("renameVariable");
            var decl = fullAst.sctx.declaredFunctions[currentNode.value][currentNode.getParent.getParent.arity];
            markers.push({
                pos: decl,
                type: "occurrence_main"
            });
            var references = fullAst.sctx.functionReferences[currentNode.value][currentNode.getParent.getParent.arity];
            for (var i in references) {
                var pos = references[i];
                markers.push({
                    pos: pos,
                    type: "occurrence_other"
                });
            }

        }
        else if (currentNode.name === "QName" && currentNode.getParent && currentNode.getParent.name === "DirElemConstructor") {
            enableRefactorings.push("renameVariable");
            var dirElemConstructor = currentNode.getParent;
            for (var i in dirElemConstructor.children) {
                var child = dirElemConstructor.children[i];
                if (child.name === "QName") {
                    if (markers.length > 1) {
                        markers.push({
                            pos: child.pos,
                            type: "occurrence_other"
                        });
                    }
                    else {
                        markers.push({
                            pos: child.pos,
                            type: "occurrence_main"
                        });
                    }
                }
            }
        }
        else if (currentNode.name === "NCName" && currentNode.getParent && currentNode.getParent.getParent && nsDecls.indexOf(currentNode.getParent.getParent.name) !== -1) {
          enableRefactorings.push("renameVariable");
          markers.push({
            pos: currentNode.pos,
            type: "occurrence_main"
          });
          var refs = findPrefixReferences(currentNode.value, fullAst);
          for(var i in refs) {
            var ref = refs[i];
            markers.push({
              pos: ref,
              type: "occurrence_other"
            });
          }
        }
        else if (currentNode.name === "EQName") {
            enableRefactorings.push("renameVariable");
            var name = currentNode.value;
            console.log(name);
            var sctx = fullAst.sctx;
            console.log(cursorPos);
            var currentSctx = Utils.findNode(sctx, {
                line: cursorPos.row,
                col: cursorPos.column
            });

            var varRefs = currentSctx.getVarRefs(name);
            for (var i in varRefs) {
                var varRef = varRefs[i];
                markers.push({
                    pos: varRef.pos,
                    type: "occurrence_other"
                });
            }

            var varDecl = currentSctx.getVarDecl(name);
            markers.push({
                pos: varDecl.pos,
                type: "occurrence_main"
            });
        }

        callback({
            markers: markers,
            enableRefactorings: enableRefactorings
        });
    };

    handler.getVariablePositions = function(doc, fullAst, pos, currentNode, callback) {
        if (!fullAst) return callback();
        
        if (["EQName", "QName"].indexOf(currentNode.name) !== -1
          && currentNode.value.indexOf(":") !== -1
          && (currentNode.pos.sc + currentNode.value.indexOf(":") >= pos.column)
        ) {
            var prefix = currentNode.value.indexOf(":");
            var decl = findPrefixDeclaration(currentNode.value.substring(0, prefix), fullAst);
            var refs = findPrefixReferences(currentNode.value.substring(0, prefix), fullAst);

            var declarations = [];
            var uses = [];
            if(decl !== undefined) {
              declarations.push({ row: decl.sl, column: decl.sc });
            }
            for(var i in refs) {
              var ref = refs[i];
              uses.push({ row: ref.sl, column: ref.sc });
            }
            callback({
                length: currentNode.value.indexOf(":"),
                pos: {
                    row: currentNode.pos.sl,
                    column: currentNode.pos.sc
                },
                others: declarations.concat(uses),
                declarations: declarations,
                uses: uses
            });
        }
        else if (currentNode.name === "EQName" && currentNode.getParent && currentNode.getParent.name === "FunctionName" && currentNode.getParent.getParent && currentNode.getParent.getParent.name === "EQName" && currentNode.getParent.getParent.getParent && currentNode.getParent.getParent.getParent.name === "FunctionDecl") {

            var declarations = [{
                row: currentNode.pos.sl,
                column: currentNode.pos.sc
            }];
            var uses = [];
            var references = fullAst.sctx.functionReferences[currentNode.value][currentNode.getParent.getParent.getParent.arity];
            for (var i in references) {
                var pos = references[i];
                uses.push({
                    row: pos.sl,
                    column: pos.sc
                });
            }
            callback({
                length: currentNode.pos.ec - currentNode.pos.sc,
                pos: {
                    row: currentNode.pos.sl,
                    column: currentNode.pos.sc
                },
                others: declarations.concat(uses),
                declarations: declarations,
                uses: uses
            });

        }
        else if (currentNode.name === "EQName" && currentNode.getParent && currentNode.getParent.name === "FunctionName" && currentNode.getParent.getParent.getParent && currentNode.getParent.getParent.name === "FunctionCall") {
            var decl = fullAst.sctx.declaredFunctions[currentNode.value][currentNode.getParent.getParent.arity];
            var declarations = [{
                row: decl.sl,
                column: decl.sc
            }];
            var uses = [];
            var references = fullAst.sctx.functionReferences[currentNode.value][currentNode.getParent.getParent.arity];
            for (var i in references) {
                var pos = references[i];
                uses.push({
                    row: pos.sl,
                    column: pos.sc
                });
            }
            callback({
                length: currentNode.pos.ec - currentNode.pos.sc,
                pos: {
                    row: currentNode.pos.sl,
                    column: currentNode.pos.sc
                },
                others: declarations.concat(uses),
                declarations: declarations,
                uses: uses
            });

        }
        else if (currentNode.name === "QName" && currentNode.getParent && currentNode.getParent.name === "DirElemConstructor") {
            var dirElemConstructor = currentNode.getParent;
            var declarations = [];
            var uses = [];
            for (var i in dirElemConstructor.children) {
                var child = dirElemConstructor.children[i];
                if (child.name === "QName") {
                    if (declarations.length > 0) {
                        uses.push({
                            row: child.pos.sl,
                            column: child.pos.sc
                        });
                    }
                    else {
                        declarations.push({
                            row: child.pos.sl,
                            column: child.pos.sc
                        });
                    }
                }
            }

            callback({
                length: currentNode.pos.ec - currentNode.pos.sc,
                pos: {
                    row: currentNode.pos.sl,
                    column: currentNode.pos.sc
                },
                others: declarations.concat(uses),
                declarations: declarations,
                uses: uses
            });

        }
        else if (currentNode.name === "NCName" && currentNode.getParent && currentNode.getParent.getParent && nsDecls.indexOf(currentNode.getParent.getParent.name) !== -1) {
          
          var declarations = [{ row: currentNode.pos.sl, column: currentNode.pos.sc }];
          var uses = [];
    
          var refs = findPrefixReferences(currentNode.value, fullAst);
          for(var i in refs) {
            var ref = refs[i];
            uses.push({
              row: ref.sl,
              column: ref.sc
            });
          }
          callback({
                length: currentNode.pos.ec - currentNode.pos.sc,
                pos: {
                    row: currentNode.pos.sl,
                    column: currentNode.pos.sc
                },
                others: declarations.concat(uses),
                declarations: declarations,
                uses: uses
            });

        }
        else if (currentNode.name === "EQName") {
            var name = currentNode.value;
            var sctx = fullAst.sctx;
            console.log(name);
            var currentSctx = Utils.findNode(sctx, {
                line: pos.row,
                col: pos.column
            });

            var varRefs = currentSctx.getVarRefs(name);
            var uses = [];

            for (var i in varRefs) {
                var varRef = varRefs[i];
                uses.push({
                    row: varRef.pos.sl,
                    column: varRef.pos.sc
                });
            }

            var varDecl = currentSctx.getVarDecl(name);
            var declarations = [{
                row: varDecl.pos.sl,
                column: varDecl.pos.sc
            }];

            callback({
                length: currentNode.pos.ec - currentNode.pos.sc,
                pos: {
                    row: currentNode.pos.sl,
                    column: currentNode.pos.sc
                },
                others: declarations.concat(uses),
                declarations: declarations,
                uses: uses
            });
        }

    };

});
