const { isBrowser, isJsDom } = require('browser-or-node');
const { saveAs } = require('./file-saver.cjs');
const mod = require('module');
const canvas = require("canvas");
const fs = require("fs");
let Readable = null;
let finished = null;
let newCanvas = null;
const ensureRequire = ()=> {};
const ensureCanvas = ()=> {};
const ensureFilesystem = ()=> {};

function longestCommonSubstring(str1, str2) {
    if (str1 === str2) return str2;
    if (!str2.split('').some(ele => str1.includes(ele))) return '';
    let commonSubStr = '';
    let storage = [];
    const strLength = str2.length;

    for (let i = 0; i < strLength; i++) {

        let ind = str1.indexOf(str2[i]);
        if (ind === -1) continue;

        for (let j = i, k = ind; j < strLength; j++, k++) {
            if (str2[j] === str1[k])
                commonSubStr += str2[j];
            else {
                storage.push(commonSubStr);
                commonSubStr = '';
            }
        }
        storage.push(commonSubStr);
        commonSubStr = '';
    }
    return storage.sort((a, b) => b.length - a.length)[0];
}

const Canvas = function(options={}){
    if(!(isBrowser || isJsDom)){
        ensureCanvas();
        newCanvas = canvas.createCanvas(options.width, options.height);
        
    }else{
        newCanvas = document.createElement("canvas");
        const ctx = newCanvas.getContext('2d');
        ctx.canvas.width  = options.width;
        ctx.canvas.height = options.height;
        document.body.appendChild(newCanvas);
    }
    if(options.className) newCanvas.className  = options.className;
    if(options.id) newCanvas.id  = options.id;
    newCanvas.hidden = true;
    return newCanvas;
}
let Image = null;

//env safe save fn
Canvas.save = async (location, canvas, type='image/png')=>{
    await new Promise((resolve, reject)=>{
        if(!(isBrowser || isJsDom)){
            canvas.toDataURL(type, function(err, dataURL){
                if(err) return reject(err);
                var base64 = dataURL.substring(dataURL.indexOf(','));
                var buffer = new Buffer(base64, 'base64');
                ensureRequire();
                if(!fs) fs = require('fs');
                fs.writeFile(location, buffer, function(err2){
                    if(err2) return reject(err2);
                    resolve(buffer);
                })
            });
        }else{
            canvas.toBlob((blob)=>{
                saveAs(blob, location);
                resolve(blob);
            }, type);
        }
    });
}

Canvas.url = (location, metaUrl)=>{
    if(
        typeof process === 'object' && 
        typeof process.versions === 'object' && 
        typeof process.versions.node !== 'undefined'
    ){
        return new URL('../node_modules/'+location, __dirname)
    }
    if(location.toString().indexOf('://') !== -1){
        return location;
    }
    return '../node_modules/'+location;
}

Canvas.delete = async (location)=>{
    if(!(isBrowser || isJsDom)){
        ensureRequire();
        if(!fs) fs = require('fs');
        await fs.promises.unlink(location);
    }else{
        console.log('Browser created files must be deleted by hand.');
    }
}

Canvas.load = async (location, incomingCanvas)=>{
    const image = await Image.load(location);
    const canvas = incomingCanvas || new Canvas({ 
        height: image.height, 
        width: image.width
    });
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, image.width, image.height);
    return canvas;
}
//env safe save fn

//env safe Image reference
if(!(isBrowser || isJsDom)){
    ensureCanvas();
    Image = canvas.Image;
}else{
    Image = window.Image;
}
let download = null;
Image.load = async (loc, canvas)=>{
    let location = typeof loc === 'string'?loc:loc+'';
    let localLocation = null;
    return await new Promise((resolve, reject)=>{
        var img = new Image();
        img.onload = function(){
            resolve(img)
        };
        img.onerror = function(err){
            reject(err);
        };
        if(!(isBrowser || isJsDom)){
            var src = '';
            ensureRequire();
            if(!fs) fs = require('fs');
            if(location.indexOf('://') !== -1 ){
                img.src = location;
            }else{
                fs.readFile(location, function(err, data){
                    if(err) return reject(err);
                    img.src = data;
                });
            }
        }else{
            if(location.toLowerCase().indexOf('file://') === 0) location = location.substring(7);
            if(location.indexOf('://') !== -1){
                img.crossOrigin = "Anonymous";
                img.src = location;
            }else{
                //this feels suspect/unoptimized. audit.
                const parts1 = window.location.pathname.split('/');
                parts1.pop(); //throw away script name
                const parts2 = (location.pathname || location).toString().split('/');
                while(parts2[parts2.length-1] === '.' || parts2[parts2.length-1] === '..'){
                    if(parts2[parts2.length-1] === '.'){
                        parts2.pop(); // toss current dir marker
                    }
                    if(parts2[parts2.length-1] === '..'){
                        parts2.pop(); // toss current dir marker
                        parts1.pop(); // go up one dir
                    }
                }
                //find longest common chain
                let path1 = parts1.join('/');
                let path2 = parts2.join('/');
                const common = longestCommonSubstring(path1, path2);
                if(path1.endsWith(common) && path2.startsWith(common)){
                    path1 = path1.substring(0, path1.length - common.length);
                    if(path1 === '/') path1 = '';
                    //path2 = path2.substring(common.length+1);
                }
                const thePath = path1.split('/').concat(path2.split('/')).join('/');
                
                img.src = thePath;
            }
        }
    });
}

module.exports = { Canvas, Image };