
define(function(require, exports, module) {
"use strict";

/**
* data structure for resolutions, containing 
* a label (short description, to be displayed in the list of resolutions), 
* an image (to be displayed in the list of resolutions), 
* a description (preview?), 
* a run method (to apply the quickfix -> need editor reference to writeback)
*/
var MarkerResolution = function(label, image, description, appliedContent){
    return {
        label: label,
        image: image,
        descr: description,
        appliedContent: appliedContent
    };
};


exports.MarkerResolution = MarkerResolution;

}); 