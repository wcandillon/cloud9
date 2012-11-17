/**
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
define(function(require, exports, module) {
    
  var XQLint = exports.XQLint = function(ast) {

    var ast = ast;
    var markers = [];
    var rootScope = null;
    var currentScope = createScope({});
    /*
xml = http://www.w3.org/XML/1998/namespace
xs = http://www.w3.org/2001/XMLSchema
xsi = http://www.w3.org/2001/XMLSchema-instance
fn = http://www.w3.org/2005/xpath-functions
local = http://www.w3.org/2005/xquery-local-functions
    */
    var declaredPrefixes = [];
    var referencedPrefixes = [];
    
    function createMarker(pos, msg) {
      return {
            pos: pos,
            type: "warning",
            level: "warning",
            message: msg
      };
    }
    
    function createScope(declaredVars){
      return {
        declaredVars: declaredVars,
        referencedVars: {},
        children: [],
        getParent: null
      };
    }
  
    function pushScope(){
      var scope = createScope({});//currentScope.declaredVars);
      if(rootScope === null) {
        rootScope = scope;
        currentScope = scope;
      } else {
        scope.getParent = currentScope;
        currentScope.children.push(scope);
        currentScope = currentScope.children[currentScope.children.length - 1];
      }
    }
    
    function except(obj1, obj2) {
      var except = {};
      for(var key in obj1) {
        var child1 = obj1[key];
        var child2 = obj2[key];
        if(child2 === undefined) {
          except[key] = child1;
        }
      }
      return except;
    }
    
    function concat(obj1, obj2) {
      for(var key in obj2) {
        obj1[key] = obj2;
      }
      return obj1;
    }
    
    function popScope(){
      var declaredVars = currentScope.declaredVars;
      var referencedVars = currentScope.referencedVars;
      for(var name in declaredVars) {
        var declaredVar = declaredVars[name];
        var pos = declaredVar[declaredVar.length - 1];
        if(referencedVars[name] === undefined || declaredVar.length > 1) {
          var idx = referencedVars[name] === undefined ? declaredVar.length : declaredVar.length - 1;
          for(var i = 0; i < idx; i++)
          {
            var pos = declaredVar[i];
            var marker = createMarker(pos, "Unused variable.");
            markers.push(marker);
          }
        }
      }
      
      if(currentScope.getParent !== null) {
        var oldScope = currentScope;
        currentScope = currentScope.getParent;
        currentScope.referencedVars = concat(currentScope.referencedVars, except(oldScope.referencedVars, oldScope.declaredVars));
        for(var i in currentScope.children) {
          delete currentScope.children[i].getParent;
        }
      } else {
        delete currentScope.getParent;
      }
    }
    
    function getNodeValue(node) {
      var value = "";
      if(node.value === undefined) {
        for(var i in node.children)
        {
          var child = node.children[i];
          value += getNodeValue(child);
        }
      } else {
        value += node.value;
      }
      return value;
    }
    
    this.registerVarnames = function(node) {
      for(var i = 0; i<node.children.length; i++) {
        var child = node.children[i];
        if(child.name === "VarName") {
          this.registerVarDecl(child);
        } else {
          this.visit(child);
        }
      }
      return true;
    }
    
    this.registerPrefix = function(node) {
      for(var i = 0; i<node.children.length; i++) {
        var child = node.children[i];
        if(child.name === "NCName") {
          var prefix = getNodeValue(child);
          declaredPrefixes[prefix] = currentSchemaImport === null ? node.pos : currentSchemaImport;
        } else {
          this.visit(child);
        }
      }
      return true;
    }
    
    
    this.visitChildren = function(node) {
      for(var i = 0; i < node.children.length; i++) {
        var child = node.children[i];   
        this.visit(child);
      }
    };
    
    this.registerVarDecl = function(node) {
      var varName = getNodeValue(node);
      if(node.name === "VarName") varName = "$" + varName;
      if(varName.indexOf(":") == -1) {
        if(currentScope.declaredVars[varName] !== undefined)
          currentScope.declaredVars[varName].push(node.pos);
        else
          currentScope.declaredVars[varName] = [node.pos];
      }
    };
    
    this.registerVarRef = function(node) {
      var varName = getNodeValue(node);
      if(varName.indexOf(":") == -1) {
        currentScope.referencedVars[varName] = node.pos;
      }     
    };
    
    this.XQuery = function(node) {
      pushScope();
      this.visitChildren(node);
      popScope();
      for(var i in declaredPrefixes) {
        var prefix = declaredPrefixes[i];
        if(referencedPrefixes[i] === undefined) {
            var marker = createMarker(prefix, "Unused prolog declaration.");
            markers.push(marker);
        }
      };
      return true;
    };
    
    this.NamespaceDecl = function(node) {
      return this.registerPrefix(node);  
    };
    
    var currentSchemaImport = null;
    
    this.SchemaImport = function(node) {
      currentSchemaImport = node.pos;
      this.registerPrefix(node);  
      currentSchemaImport = null;
      return true;
    };
    
    this.SchemaPrefix = function(node) {
      return this.registerPrefix(node);  
    };
    
    this.ModuleImport = function(node) {
      return this.registerPrefix(node);  
    };
    
    this.FLWORExpr = function(node) {
      pushScope();
      this.visitChildren(node);
      popScope();
      return true;
    };
    
    this.BlockExpr = function(node) {
      pushScope();
      this.visitChildren(node);
      popScope();
      return true;
    };
    
    this.FunctionDecl = function(node) {
      pushScope();
      this.visitChildren(node);
      popScope();
      return true;
    };
    
    /*
    this.FunctionBody = function(node) {
      pushScope();
      this.visitChildren(node);
      popScope();
      return true;
    };
    */
    
    this.VarDeclStatement = function(node){
      return this.registerVarnames(node);
    };
    
    this.LetBinding = function(node){
      return this.registerVarnames(node);
    };
    
    this.ForBinding = function(node) {
      return this.registerVarnames(node);
    };
    
    this.PositionalVar = function(node) {
      return this.registerVarnames(node);
    };
    
    this.CountClause = function(node) {
      return this.registerVarnames(node);
    };
    
    this.Param = function(node) {
      this.registerVarDecl(node);
    };
    
    this.VarRef = function(node) {
      this.registerVarRef(node);
    };
    
    this.Wildcard = function(node) {
      var value = getNodeValue(node);
      var prefix = value.substring(0, value.indexOf(":"));
      if(prefix != "*") {
        referencedPrefixes[prefix] = true;
      }
      return true;
    };
    
    this.QName = function(node) {
      var value = getNodeValue(node);
      if(value.indexOf(":") !== -1) {
        var prefix = value.substring(0, value.indexOf(":"));
        referencedPrefixes[prefix] = true;
      }
      return false;
    };
    
    this.EQName = function(node) {
      var value = getNodeValue(node);
      if(value.substring(0, 2) !== "Q{" && value.indexOf(":") !== -1) {
        var prefix = value.substring(0, value.indexOf(":"));
        referencedPrefixes[prefix] = true;
      }
      return false;
    };
    
    this.visit = function(node) {
      var name = node.name;
      var skip = false;
     
     if(typeof this[name] === "function")
       skip = this[name](node) === true ? true : false ;
     
     if(!skip) {
       for(var i = 0; i < node.children.length; i++) {
         var child = node.children[i];   
         this.visit(child);
       }
     }
    };
    
    this.getMarkers = function() {
      this.visit(ast);
      return markers;  
    };
  };
});