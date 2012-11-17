/**
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
define(function(require, exports, module) {
    
  var Outliner = exports.Outliner = function(ast) {

    var outline = [];
    var params = [];
    
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
    
    this.FunctionDecl = function(node) {
        var displayPos = null;
        var name = "name";
        params = [];
        for(var i = 0; i<node.children.length; i++) {
          var child = node.children[i];
          if(child.name === "EQName") {
            displayPos = child.pos;
            name = getNodeValue(child) + "(";
          } else if(child.name === "ParamList") {
            this.visit(child);
          }
        }
        outline.push({
            displayPos: displayPos,
            icon: "method",
            name: name + params.join(", ") + ")",
            pos: node.pos,
            items: []
        });  
        return true;
    };
    
    this.Param = function(node){
      for(var i = 0; i<node.children.length; i++) {
        var child = node.children[i];
        if(child.name === "EQName") {
            params.push("$" + getNodeValue(child));
        }
      }
      return true;
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
    
    this.getOutline = function() {
      this.visit(ast);
      return outline;  
    };
  };
});