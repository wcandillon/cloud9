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
var lang = require("ace/lib/lang");

var xquery;


var oldCommandKey, oldOnTextInput;

var CLASS_SELECTED = "cc_complete_option selected";
var CLASS_UNSELECTED = "cc_complete_option";
var SHOW_DOC_DELAY = 1500;
var SHOW_DOC_DELAY_MOUSE_OVER = 100;
var HIDE_DOC_DELAY = 1000;
var AUTO_OPEN_DELAY = 200;
var AUTO_UPDATE_DELAY = 200;
var CRASHED_COMPLETION_TIMEOUT = 6000;
var MENU_WIDTH = 330;
var MENU_SHOWN_ITEMS = 9;
var EXTRA_LINE_HEIGHT = 3;
var QFBOX_MINTIME = 500;


var ignoreMouseOnce = false;


var isDocShown;
var isDrawDocInvokeScheduled = false;

var drawDocInvoke = lang.deferredCall(function() {
    if (isPopupVisible() && xquery.quickFixes[xquery.selectedIdx].doc) {
        isDocShown = true;
        txtQuickfixDoc.parentNode.show();
    }
    isDrawDocInvokeScheduled = false;
});

var undrawDocInvoke = lang.deferredCall(function() {
    if (!isPopupVisible()) {
        isDocShown = false;
        txtQuickfixDoc.parentNode.hide();
    }
});

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
        var _self = xquery = this;
        
        language.registerLanguageHandler('ext/xquery/compiler');
        
        
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
            
            !annos.length || _self.showQuickfixBox(e.x, e.y-1, annos);
            
            //if (annos.length > 0)
            //    alert("guttermousedown on row " + row + ", Annotations:\n" + annos);

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
        this.quickFixes = [];
        this.quickfixElement = txtQuickfix.$ext;
        this.docElement = txtQuickfixDoc.$ext;
        this.cursorConfig = ace.renderer.$cursorLayer.config;
        this.lineHeight = this.cursorConfig.lineHeight + EXTRA_LINE_HEIGHT;
        var style = dom.computedStyle(this.editor.amlEditor.$ext);
        this.quickfixElement.style.fontSize = style.fontSize;
        
        barQuickfixCont.setAttribute('visible', true);


        // Monkey patch
        if(!oldCommandKey) {
            oldCommandKey = ace.keyBinding.onCommandKey;
            ace.keyBinding.onCommandKey = this.onKeyPress.bind(this);
            oldOnTextInput = ace.keyBinding.onTextInput;
            ace.keyBinding.onTextInput = this.onTextInput.bind(this);
        }

        
        // Collect all quickfixes for the given annotations
        annos.forEach(function(anno, idx){
           _self.quickFixes = _self.quickFixes.concat(_self.getQuickFixes(anno));
        });
        
        this.populateQuickfixBox(this.quickFixes);

        
                
        apf.popup.setContent("quickfixBox", barQuickfixCont.$ext);
        var boxLength = this.quickFixes.length || 1;
        var quickfixBoxHeight = 11 + Math.min(10 * this.lineHeight, boxLength * (this.lineHeight));
        var cursorLayer = ace.renderer.$cursorLayer;
        
        var innerBoxLength = this.quickFixes.length || 1;
        var innerQuickfixBoxHeight = Math.min(10 * this.lineHeight, innerBoxLength * (this.lineHeight));
        txtQuickfixHolder.$ext.style.height = innerQuickfixBoxHeight + "px";
        
        ignoreMouseOnce = !isPopupVisible();
        
    
        apf.popup.show("quickfixBox", {
            x        : x, 
            y        : y, 
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
        
        this.popupTime = new Date().getTime();
        document.addEventListener("click", this.closeQuickfixBox, false);
        ace.container.addEventListener("DOMMouseScroll", this.closeQuickfixBox, false);
        ace.container.addEventListener("mousewheel", this.closeQuickfixBox, false);
    },

    closeQuickfixBox : function(event) {
        var qfBoxTime = new Date().getTime() - xquery.popupTime;
        if (qfBoxTime < QFBOX_MINTIME){
            return;
        }
        
        barQuickfixCont.$ext.style.display = "none";
        if (!editors.currentEditor.amlEditor) // no editor, try again later
            return;
        var ace = editors.currentEditor.amlEditor.$editor;
        
        // TODO these calls don't work.
        document.removeEventListener("click", this.closeQuickfixBox, false);
        ace.container.removeEventListener("DOMMouseScroll", this.closeQuickfixBox, false);
        ace.container.removeEventListener("mousewheel", this.closeQuickfixBox, false);
        
        
        if(oldCommandKey) {
            ace.keyBinding.onCommandKey = oldCommandKey;
            ace.keyBinding.onTextInput = oldOnTextInput;
        }
        oldCommandKey = oldOnTextInput = null;
        undrawDocInvoke.schedule(HIDE_DOC_DELAY);
    },
    
    /* TODO this returns a dummy quickfix array */
    getQuickFixes: function(annotation){
        var q1 = {
            text: annotation.text + ": Quickfix 1",
            doc: "Preview of Quickfix 1"  
        };
        var q2 = {
            text: annotation.text + ": Quickfix 2",
            doc: "Preview of Quickfix 2"  
        };
        return [q1, q2];
    },
        
    populateQuickfixBox: function(quickFixes) {
        
        var _self = this;
        _self.quickfixElement.innerHTML = "";
        var cursorConfig = code.amlEditor.$editor.renderer.$cursorLayer.config;
        var hasIcons = false;
        
        
        quickFixes.forEach(function(anno) {
            if (anno.icon)
                hasIcons = true;
        });
        
        
        var editor = editors.currentEditor.amlEditor.$editor;
        var pos = editor.getCursorPosition();
        var line = editor.getSession().getLine(pos.row);
        var isInferAvailable = language.isInferAvailable();

        // For each quickfix, create a list entry
        quickFixes.forEach(function(qfix, qfidx){

            var annoEl = dom.createElement("div");
            annoEl.className = qfidx === _self.selectedIdx ? CLASS_SELECTED : CLASS_UNSELECTED;
            var html = "";
            
            
            // TODO: replace this with actual quickfix icons
            qfix.icon = "method";
            if (qfix.icon)
                html = "<img src='" + ide.staticPrefix + "/ext/language/img/" + qfix.icon + ".png'/>";

/*
            var docHead;
            if (qfix.type) {
                var shortType = _self.$guidToShortString(qfix.type);
                if (shortType) {
                    qfix.meta = shortType;
                    docHead = qfix.name + " : " + _self.$guidToLongString(qfix.type) + "</div>";
                }
            }
            var prefix = completeUtil.retrievePrecedingIdentifier(line, pos.column, qfix.identifierRegex);
*/
            
            html += '<span class="main">' + qfix.text + '</span>';

            
            // "<span class="main maintrim"><u></u>fn</span><span class="meta">snippet</span>"

            annoEl.innerHTML = html;     
            
            annoEl.addEventListener("mouseover", function() {
                if (ignoreMouseOnce) {
                    ignoreMouseOnce = false;
                    return;
                }
                _self.quickfixEls[_self.selectedIdx].className = CLASS_UNSELECTED;
                _self.selectedIdx = qfidx;
                _self.quickfixEls[_self.selectedIdx].className = CLASS_SELECTED;
                _self.updateDoc();
                if (!isDrawDocInvokeScheduled)
                    drawDocInvoke.schedule(SHOW_DOC_DELAY_MOUSE_OVER);
            });
            
            
            // TODO: add click event listener that applies the quickfix
            /*
            annoEl.addEventListener("click", function() {
                var amlEditor = editors.currentEditor.amlEditor;
                replaceText(amlEditor.$editor, qfix);
                amlEditor.focus();
            });
            */
            
            annoEl.style.height = cursorConfig.lineHeight + EXTRA_LINE_HEIGHT +  "px";
            annoEl.style.width = (MENU_WIDTH - 10) + "px";
            _self.quickfixElement.appendChild(annoEl);
            _self.quickfixEls.push(annoEl);
        });

        _self.updateDoc(true);
        
    },
    
    updateDoc : function(delayPopup) {
        this.docElement.innerHTML = '<span class="code_complete_doc_body">';
        var selected = this.quickFixes[this.selectedIdx];

        if (selected && selected.doc) {
            if (isDocShown) {
                txtQuickfixDoc.parentNode.show();
            }
            else {
                txtQuickfixDoc.parentNode.hide();
                if (!isDrawDocInvokeScheduled || delayPopup)
                    drawDocInvoke.schedule(SHOW_DOC_DELAY);
            }
            this.docElement.innerHTML += selected.doc + '</span>';
        }
        else {
            txtQuickfixDoc.parentNode.hide();
        }

        this.docElement.innerHTML += '</span>';
    },

    enable : function() {
    },

    disable : function() {
    },

    destroy : function() {
    },
    
    
    
    onTextInput : function(text, pasted) {
        this.closeQuickfixBox();
    },

    onKeyPress : function(e, hashKey, keyCode) {
        var _self = this;
        
        if(e.metaKey || e.ctrlKey || e.altKey) {
            this.closeQuickfixBox();
            return;
        }
        
        var keyBinding = editors.currentEditor.amlEditor.$editor.keyBinding;

        switch(keyCode) {
            case 0: break;
            case 32: // Space
                this.closeQuickfixBox();
                break;
            case 27: // Esc
                this.closeQuickfixBox();
                e.preventDefault();
                break;
            case 8: // Backspace
                this.closeQuickfixBox();
                e.preventDefault();
                break;
            case 37:
            case 39:
                oldCommandKey.apply(keyBinding, arguments);
                this.closeQuickfixBox();
                e.preventDefault();
                break;
            case 13: // Enter
            case 9: // Tab
                // TODO: apply quickfix
                this.closeQuickfixBox();
                e.preventDefault();
                break;
            case 40: // Down
                if (this.quickfixEls.length === 1) {
                    this.closeQuickfixBox();
                    break;
                }
                e.stopPropagation();
                e.preventDefault();
                this.quickfixEls[this.selectedIdx].className = CLASS_UNSELECTED;
                if(this.selectedIdx < this.quickFixes.length-1)
                    this.selectedIdx++;
                this.quickfixEls[this.selectedIdx].className = CLASS_SELECTED;
                if(this.selectedIdx - this.scrollIdx > MENU_SHOWN_ITEMS) {
                    this.scrollIdx++;
                    this.quickfixEls[this.scrollIdx].scrollIntoView(true);
                }
                this.updateDoc();
                break;
            case 38: // Up
                if (this.quickfixEls.length === 1) {
                this.closeQuickfixBox();
                    break;
                }
                e.stopPropagation();
                e.preventDefault();
                if (this.selectedIdx <= 0)
                    return;
                this.quickfixEls[this.selectedIdx].className = CLASS_UNSELECTED;
                this.selectedIdx--;
                this.quickfixEls[this.selectedIdx].className = CLASS_SELECTED;
                if(this.selectedIdx < this.scrollIdx) {
                    this.scrollIdx--;
                    this.quickfixEls[this.scrollIdx].scrollIntoView(true);
                }
                this.updateDoc();
                break;
        }
    }
    
    
    
});

});
