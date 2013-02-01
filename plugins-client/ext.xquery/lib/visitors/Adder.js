/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 *
 * Copyright (c) 2010, Ajax.org B.V.
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of Ajax.org B.V. nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL AJAX.ORG B.V. BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * ***** END LICENSE BLOCK ***** */

define(function(require, exports, module){

  var Positioner = require('Positioner.js').Positioner;


  var Adder = exports.Adder = function(ast)
{

  this.add = {};

  function containsPos(a, b){
    var slDiff = b.sl - a.sl;
    var elDiff = a.el - b.el;
    var scDiff = b.sc - a.sc;
    var ecDiff = a.ec - b.ec;

    return (slDiff > 0 || !slDiff && scDiff >= 0) 
  && (elDiff > 0 || !elDiff && ecDiff >= 0);
  }

  function emptyNode(){
    return {
      name: "WS",
      value: "",
      children: []
    };
  }

  function isWS(str){
    return !(/\S/.test(str));
  }


  this.Prolog = function(node){
    var _self = this;

    if (_self.add.NamespaceDecl /* || _self.add.otherprologstuff... */ ){
      // We have to add something to the Prolog

      if (_self.add.NamespaceDecl){
        var prevItem;
        var haveNewLine = false;
        for (var insertIdx = 0; insertIdx < node.children.length; insertIdx++){
          var curChild = node.children[insertIdx];
          var startItems = ['DefaultNamespaceDecl', 'Setter', 'NamespaceDecl',
              'Import', 'FTOptionDecl'];
          var endItems = ['ContextItemDecl', 'AnnotatedDecl', 'OptionDecl'];
          var prologItems = startItems.concat(endItems);
          if (prevItem === 'NamespaceDecl' && 
              curChild.name !== prevItem
              && prologItems.indexOf(curChild.name) !== -1){
            // Insert as last NamespaceDecl
            break;
          }else if (endItems.indexOf(curChild.name) !== -1){
            // Insert before first endItem
            break;
          }else if (curChild.name !== 'Separator' && curChild.name !== 'WS'){
            prevItem = curChild.name;
            haveNewLine = false;
          }else if (curChild.name == 'Separator'){
            haveNewLine = false;
          }else if (curChild.name === 'WS'
            && curChild.value.split('\n').length > 1){
            haveNewLine = true;
          }else{
            haveNewLine = false;
          }
        }

        haveNewLine |= !insertIdx;

        // namespaceDecl.NCName, namespaceDecl.URILiteral
        var newNode = _self.nodeNamespaceDecl(); 

        if (!haveNewLine){
          _self.pushChild(node, _self.nodeWS("\n"), insertIdx);
          insertIdx++;
        }
        // Add NamespaceDecl to Prolog
        _self.pushChild(node, newNode, insertIdx);

        // Add NamespaceDecl children
        _self.pushChild(newNode, _self.nodeTOKEN("declare"));
        _self.pushChild(newNode, _self.nodeWS(" "));
        _self.pushChild(newNode, _self.nodeTOKEN("namespace"));
        _self.pushChild(newNode, _self.nodeWS(" "));
        _self.pushChild(newNode, _self.nodeNCName(
              _self.add.NamespaceDecl.NCName));
        _self.pushChild(newNode, _self.nodeWS(" "));
        _self.pushChild(newNode, _self.nodeTOKEN("="));
        _self.pushChild(newNode, _self.nodeWS(" "));
        _self.pushChild(newNode, _self.nodeURILiteral(
              "\"" + _self.add.NamespaceDecl.URILiteral + "\""));

        // Add Separator to Prolog
        _self.pushChild(node, _self.nodeSeparator(), insertIdx + 1);

        if (!insertIdx){
          _self.pushChild(node, _self.nodeWS("\n"));
        }

      }



    }

    return this.everythingElse(node);
  };


  this.pushChild = function(dst, child, idx){
    dst.children = dst.children || [];
    idx = idx || dst.children.length;
    dst.children.splice(idx, 0, child);
  };
  
  this.nodeWithValue = function(name, value){
    return {
      name: name,
      value: value,
      children: []
    };
  };

  this.nodeTOKEN = function(val){
    return this.nodeWithValue("TOKEN", val);
  };

  this.nodeNCName = function(val){
    return this.nodeWithValue("NCName", val);
  };
 
  this.nodeWS = function(val){
    return this.nodeWithValue("WS", val);
  }; 
  
  this.nodeURILiteral = function(val){
    return this.nodeWithValue("URILiteral", val);
  };

  this.nodeSeparator = function(){
    return this.nodeWithValue("Separator", ";");
  };

  this.nodeNamespaceDecl = function(){
    return {
      name: "NamespaceDecl",
      children: []
    };
  };

  this.fromNode = function(node, handler){
    var ret = {};
    ret.name = node.name;
    ret.children = this.visitChildren(node, handler);
    ret.value = node.value;
    ret.pos = node.pos;
    return ret;
  };

  this.everythingElse = function(node)
  {
    return this.fromNode(node);
  };
  
  this.visit = function(node) {
    var name = node.name;
    if(typeof this[name] === "function")
      return this[name](node);
    else
      return this.everythingElse(node);
  };


  this.visitChildren = function(node, handler) {
    var ret = [];
    for (var i = 0; i < node.children.length; i++) {
      var child = node.children[i];
      if (handler !== undefined && typeof handler[child.name] === "function") {
        ret.push(handler[child.name](child));
      } else {
        ret.push(this.visit(child));
      }
    }
    return ret;
  };

  /**
   * NamespaceDecl ::= 'declare' 'namespace' NCName '=' URILiteral
   */
  this.addNamespaceDecl = function(namespaceDecl){
    this.add.NamespaceDecl = namespaceDecl;
    var addedAst = this.visit(ast);
    var positioner = new Positioner(addedAst);
    return positioner.computePos();
  };

};

});
