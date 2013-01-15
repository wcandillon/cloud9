/**
 * Cloud9 Language Foundation
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
define(function(require, exports, module) {
    
/*global barQuickfixCont sbQuickfix txtQuickfixHolder txtQuickfix txtQuickfixDoc */

var ide = require("core/ide");
var dom = require("ace/lib/dom");
var code = require("ext/code/code");
var ext = require("core/ext");
var editors = require("ext/editors/editors");
var language = require("ext/language/language");
var markup = require("text!ext/xquery/xquery.xml");


var MENU_WIDTH = 330;
var EXTRA_LINE_HEIGHT = 3;

var CLASS_SELECTED = "cc_complete_option selected";
var CLASS_UNSELECTED = "cc_complete_option";
var ignoreMouseOnce = false;

function isPopupVisible() {
    return barQuickfixCont.$ext.style.display !== "none";
}


module.exports = ext.register("ext/xquery/xquery", {
    name    : "XQuery Language Support",
    dev     : "28msec",
    type    : ext.GENERAL,
    deps    : [editors, language],
    nodes   : [],
    markup  : markup,
    alone   : true,
    
    hook: function() {
        language.registerLanguageHandler('ext/xquery/compiler');
        
        var _self = this;
        
        ide.addEventListener("afteropenfile", function(event){
            ext.initExtension(_self);
        });
            
        ide.addEventListener("tab.afterswitch", function(e) {
            var page = e.nextPage;
            if (!page || !page.$editor || page.$editor.path != "ext/code/code")
                return;
            var ace = page.$editor.amlEditor.$editor;
            
            if (!ace.$markerListener)
                _self.initEditor(ace);           
        });
          
           
    },
    
    init: function(amlNode) {
    },
    
    initEditor : function(editor){
        var _self = this;
        
        editor.on("guttermousedown", editor.$markerListener = function(e) {
            if (e.getButton()) // !editor.isFocused()
                return;
            var gutterRegion = editor.renderer.$gutterLayer.getRegion(e);
            if (gutterRegion != "markers")
                return;
            
            var row = e.getDocumentPosition().row;
            var annos = editor.session.languageAnnos;

            annos = annos.filter(function(a){
                return a.row === row;
            } );
            
            _self.showQuickfixBox(e.x, e.y, annos);
            
            if (annos.length > 0)
                alert("guttermousedown on row " + row + ", Annotations:\n" + annos);

        });
    },
    
    
    
  showQuickfixBox: function(x, y, annos) {
        var _self = this;
        this.editor = editors.currentEditor;
        var ace = this.editor.amlEditor.$editor;
        this.selectedIdx = 0;
        this.scrollIdx = 0;
        this.quickfixEls = [];
        this.annos = annos;        
        this.quickfixElement = txtQuickfix.$ext;
        this.docElement = txtQuickfixDoc.$ext;
        this.cursorConfig = ace.renderer.$cursorLayer.config;
        this.lineHeight = this.cursorConfig.lineHeight;
        var style = dom.computedStyle(this.editor.amlEditor.$ext);
        this.quickfixElement.style.fontSize = style.fontSize;
        
        barQuickfixCont.setAttribute('visible', true);

/*
        // Monkey patch
        if(!oldCommandKey) {
            oldCommandKey = ace.keyBinding.onCommandKey;
            ace.keyBinding.onCommandKey = this.onKeyPress.bind(this);
            oldOnTextInput = ace.keyBinding.onTextInput;
            ace.keyBinding.onTextInput = this.onTextInput.bind(this);
        }
*/
        
        
        
        
        this.populateQuickfixBox(annos);
        document.addEventListener("click", this.closeQuickfixBox);
        ace.container.addEventListener("DOMMouseScroll", this.closeQuickfixBox);
        ace.container.addEventListener("mousewheel", this.closeQuickfixBox);
        
        
        
        
        apf.popup.setContent("quickfixBox", barQuickfixCont.$ext);
        var boxLength = this.annos.length || 1;
        var quickfixBoxHeight = 11 + Math.min(10 * this.lineHeight, boxLength * (this.lineHeight));
        var cursorLayer = ace.renderer.$cursorLayer;
        
        var innerBoxLength = this.annos.length || 1;
        var innerQuickfixBoxHeight = Math.min(10 * this.lineHeight, innerBoxLength * (this.lineHeight));
        txtQuickfixHolder.$ext.style.height = innerQuickfixBoxHeight + "px";
        
        ignoreMouseOnce = !isPopupVisible();
        
        apf.popup.show("quickfixBox", {
            x        : x, //(prefix.length * -_self.cursorConfig.characterWidth) - 11,
            y        : y, //_self.cursorConfig.lineHeight,
            height   : quickfixBoxHeight,
            width    : MENU_WIDTH,
            animate  : false,
            //ref      : cursorLayer.cursor,
            callback : function() {
                barQuickfixCont.setHeight(quickfixBoxHeight);
                barQuickfixCont.$ext.style.height = quickfixBoxHeight + "px";
                sbQuickfix.$resize();
                // HACK: Need to set with non-falsy value first
                _self.quickfixElement.scrollTop = 1;
                _self.quickfixElement.scrollTop = 0;
            }
        });
    },

    closeQuickfixBox : function(event) {
        
        barQuickfixCont.$ext.style.display = "none";
        if (!editors.currentEditor.amlEditor) // no editor, try again later
            return;
        var ace = editors.currentEditor.amlEditor.$editor;
        document.removeEventListener("click", this.closeQuickfixBox);
        ace.container.removeEventListener("DOMMouseScroll", this.closeQuickfixBox);
        ace.container.removeEventListener("mousewheel", this.closeQuickfixBox);
        
        /*
        if(oldCommandKey) {
            ace.keyBinding.onCommandKey = oldCommandKey;
            ace.keyBinding.onTextInput = oldOnTextInput;
        }
        oldCommandKey = oldOnTextInput = null;
        undrawDocInvoke.schedule(HIDE_DOC_DELAY);
        */
        
    },
        
    populateQuickfixBox: function(annotations) {
        
        var _self = this;
        _self.quickfixElement.innerHTML = "";
        var cursorConfig = code.amlEditor.$editor.renderer.$cursorLayer.config;
        var hasIcons = false;
        
        /*
        annotations.forEach(function(anno) {
            if (anno.icon)
                hasIcons = true;
        });
        */
        
        var editor = editors.currentEditor.amlEditor.$editor;
        var pos = editor.getCursorPosition();
        var line = editor.getSession().getLine(pos.row);
        var isInferAvailable = language.isInferAvailable();
        annotations.forEach(function(anno, idx) {
            var annoEl = dom.createElement("div");
            annoEl.className = idx === _self.selectedIdx ? CLASS_SELECTED : CLASS_UNSELECTED;
            var html = "";
            
            /*
            if (anno.icon)
                html = "<img src='" + ide.staticPrefix + "/ext/language/img/" + anno.icon + ".png'/>";
            
            var docHead;
            if (anno.type) {
                var shortType = _self.$guidToShortString(anno.type);
                if (shortType) {
                    anno.meta = shortType;
                    docHead = anno.name + " : " + _self.$guidToLongString(anno.type) + "</div>";
                }
            }
            var prefix = completeUtil.retrievePrecedingIdentifier(line, pos.column, anno.identifierRegex);
            var trim = anno.meta ? " maintrim" : "";
            if (!isInferAvailable || anno.icon) {
                html += '<span class="main' + trim + '"><u>' + prefix + "</u>" + anno.name.substring(prefix.length) + '</span>';
            }
            else if (hasIcons) {
                html += '<span class="main' + trim + '"><span class="deferred">' + anno.name + '</span></span>';
            }
            else {
                html += '<span class="main' + trim + '"><span class="deferred"><u>' + prefix + "</u>" + anno.name.substring(prefix.length) + '</span></span>';
            }
            
            if (anno.meta)
                html += '<span class="meta">' + anno.meta + '</span>';
            
            if (anno.doc)
                anno.doc = '<p>' + anno.doc + '</p>';
                
            if (anno.icon || anno.type)
                anno.doc = '<div class="code_complete_doc_head">' + (docHead || anno.name) + '</div>' + (anno.doc || "");
            */
            
            
            html = "<p>Annotation at row " + anno.row + ": " + anno.text + "</p>";
                
            annoEl.innerHTML = html;
            
            
            /*
            annoEl.addEventListener("mouseover", function() {
                if (ignoreMouseOnce) {
                    ignoreMouseOnce = false;
                    return;
                }
                _self.matchEls[_self.selectedIdx].className = CLASS_UNSELECTED;
                _self.selectedIdx = idx;
                _self.matchEls[_self.selectedIdx].className = CLASS_SELECTED;
                _self.updateDoc();
                if (!isDrawDocInvokeScheduled)
                    drawDocInvoke.schedule(SHOW_DOC_DELAY_MOUSE_OVER);
            });
            */
            
            /*
            annoEl.addEventListener("click", function() {
                var amlEditor = editors.currentEditor.amlEditor;
                replaceText(amlEditor.$editor, anno);
                amlEditor.focus();
            });
            */
            
            annoEl.style.height = cursorConfig.lineHeight + EXTRA_LINE_HEIGHT + "px";
            annoEl.style.width = (MENU_WIDTH - 10) + "px";
            _self.quickfixElement.appendChild(annoEl);
            _self.quickfixEls.push(annoEl);
        });
        _self.updateDoc(true);
        
    },
    
    updateDoc : function(delayPopup) {

    },

    enable : function() {
    },

    disable : function() {
    },

    destroy : function() {
    }
});

});
