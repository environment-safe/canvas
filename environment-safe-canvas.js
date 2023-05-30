import { isBrowser, isJsDom } from 'browser-or-node';
import * as mod from 'module';
let canvas = null;
let newCanvas = null;
const Canvas = function(options={}){
    if(!(isBrowser || isJsDom)){
        if(!canvas){
            const require = mod.createRequire(import.meta.url);
            canvas = require("canvas");
        }
        newCanvas = canvas.createCanvas(options.height, options.width);
        
    }else{
        newCanvas = document.createElement("canvas");
        const ctx = newCanvas.getContext('2d');
        ctx.canvas.width  = options.width;
        ctx.canvas.height = options.height;
        document.body.appendChild(newCanvas);
    }
    if(options.className) newCanvas.className  = options.className;
    if(options.id) newCanvas.id  = options.id;
    return newCanvas;
}

export { Canvas };