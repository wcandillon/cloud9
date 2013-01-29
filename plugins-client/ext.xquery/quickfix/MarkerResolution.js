
define(function(require, exports, module) {
"use strict";

/**
* data structure for resolutions, containing 
* a label (short description, to be displayed in the list of resolutions), 
* an image (to be displayed in the list of resolutions), 
* a preview (undefined if none is available, "" if it must be computed
* by the resolver first),
* the arguments to be sent to the Resolver to apply the resolution
*/
var MarkerResolution = function(label, image, preview, args){
    return {
        label: label,
        image: image,
        preview: preview,
        args: args
    };
};


exports.MarkerResolution = MarkerResolution;

}); 