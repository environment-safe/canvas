/* global Buffer : false */
import {
    isBrowser, 
    isJsDom,
    variables
} from '@environment-safe/runtime-context';
import { File, FileBuffer } from '@environment-safe/file';
import { saveAs } from './file-saver.mjs';
import * as mod from 'module';
let canvas = null;
let require = null;
let fs = null;
let newCanvas = null;
const ensureRequire = ()=> (!require) && (require = mod.createRequire(import.meta.url));
const ensureCanvas = ()=> (!canvas) && ensureRequire() && (canvas = require('canvas'));
function longestCommonSubstring(str1, str2){
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

export const pixelSimilarity = async (a, b, options={})=>{
    if(a === b){
        if(options.notIdentity) throw new Error('Image compared to self');
        return 1;
    }
    if(Canvas.is(a) && Canvas.is(b)){
        const actx = a.getContext('2d');
        const bctx = b.getContext('2d');
        return pixelSimilarity(
            actx.getImageData(0, 0, a.width, a.height ),
            bctx.getImageData(0, 0, b.width, b.height),
            options
        );
    }
    if(ImageFile.is(a) && ImageFile.is(b)){
        return pixelSimilarity(
            a.toCanvas(),
            b.toCanvas(),
            options
        );
    }
    if(FileBuffer.is(a) && FileBuffer.is(b)){
        const ac = await Canvas.from(a);
        const bc = await Canvas.from(b);
        return pixelSimilarity(
            ac,
            bc,
            options
        );
    }
    
    if( //ImageData
        a.data && a.width && a.height &&
        b.data && b.width && b.height
    ){
        if(
            (a.width !== b.width) ||
            (a.height !== b.height)
        )throw new Error('dimensions do not match!');
        if(options.notEmpty){
            if(a.width === 0) throw new Error('Empty images compared(no width)');
            if(a.height === 0) throw new Error('Empty images compared(no height)');
        }
        let avgRatio = 0;
        let count = 0;
        let thisRatio = null;
        let sawSomething = false;
        // here we're computing the ratio of pixel difference
        // where the max of 1 represents a change from opaque
        // white to transparent black
        for(let lcv=0; lcv < a.data.length; lcv += 4){
            thisRatio = (
                Math.abs(a.data[lcv] - b.data[lcv])/255 + 
                Math.abs(a.data[lcv+1] - b.data[lcv+1])/255 + 
                Math.abs(a.data[lcv+2] - b.data[lcv+2])/255 + 
                Math.abs(a.data[lcv+3] - b.data[lcv+3])/255
            ) / 4;
            if((!sawSomething) && (
                a.data[lcv] ||
                a.data[lcv+1] ||
                a.data[lcv+2] ||
                a.data[lcv+3] ||
                b.data[lcv] ||
                b.data[lcv+1] ||
                b.data[lcv+2] ||
                b.data[lcv+3]
            )){
                sawSomething = true;
            }
            count++;
            //a little drift from float math, but good enough
            avgRatio = (avgRatio + thisRatio)/count;
        }
        if(options.notBlank && !sawSomething) throw new Error('Blank images compared');
        return 1 - avgRatio; //invert the ratio for similarity
    }
};

const Canvas = function(options={}){
    if(!(isBrowser || isJsDom)){
        ensureCanvas();
        newCanvas = canvas.createCanvas(options.width, options.height);
    }else{
        newCanvas = document.createElement('canvas');
        const ctx = newCanvas.getContext('2d');
        ctx.canvas.width  = options.width;
        ctx.canvas.height = options.height;
        document.body.appendChild(newCanvas);
    }
    if(options.className) newCanvas.className  = options.className;
    if(options.id) newCanvas.id  = options.id;
    newCanvas.hidden = true;
    return newCanvas;
};
let Image = null;

Canvas.is = (canvas)=>{
    //return !!(canvas.getContext && canvas.toBuffer && canvas.toDataURL);
    if(!(isBrowser || isJsDom)){
        // class instance not exposed :P 
        return !!(canvas.getContext && canvas.toBuffer && canvas.toDataURL);
    }else{
        return canvas instanceof variables.HTMLCanvasElement;
    }
};

//env safe save fn
//if we're in an older browser we can rely on filesaver.js
Canvas.legacyMode = false;
Canvas.save = async (location, canvas, type='image/png')=>{
    // eslint-disable-next-line no-async-promise-executor
    await new Promise( async (resolve, reject)=>{
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
                });
            });
        }else{
            if(Canvas.legacyMode){
                canvas.toBlob((blob)=>{
                    saveAs(blob, location);
                    resolve(blob);
                }, type);
            }else{
                const file = await Canvas.toFile(location, canvas);
                await file.save();
                resolve(file.buffer);
            }
        }
    });
};

const imageFromSrc = (src)=>{
    return new Promise((resolve, reject)=>{
        const img = new Image();
        img.onload = () =>{
            resolve(img);
        };
        img.onerror = err => { reject(err); };
        img.src = src;
    });
};

/*const encode = (input)=>{
    let array = new Uint8Array(input);
    const chars = array.reduce((data, byte)=> {
        return data + String.fromCharCode(byte);
    }, '');
    return btoa(chars);
};*/

Canvas.from = async (ob)=>{
    if(!(isBrowser || isJsDom)){
        ensureCanvas();
        if(ob instanceof ImageFile){
            return await new Promise((resolve, reject)=>{
                const size = ob.size();
                const newCanvas = new Canvas(size);
                const context = newCanvas.getContext('2d');
                const img = new Image();
                img.onload = () =>{
                    context.drawImage(img, 0, 0);
                    resolve(newCanvas);
                };
                img.onerror = err => { throw err; };
                img.src = ob.buffer;
            });
        }

        if(FileBuffer.is(ob)){
            const image = await imageFromSrc(ob);
            const newCanvas = new Canvas({
                width: image.width, 
                height: image.height 
            });
            const ctx = newCanvas.getContext('2d');
            ctx.drawImage(image, 0, 0, image.width, image.height );
            return newCanvas;
        }
    }else{
        if(ob instanceof ImageFile){
            const { height, width } = ob.size();
            const imageData = new ImageData(new Uint8ClampedArray(ob.buffer), width, height);
            const canvas = new Canvas({ height, width });
            const context = canvas.getContext('2d');
            context.putImageData(imageData, 0, 0);
            return canvas;
        }
        if(FileBuffer.is(ob)){
            return await new Promise((resolve, reject)=>{
                const bytes = new Uint8Array(ob);
                let blob1 = new Blob([bytes],{type:'image/png'});
                //var bytes = ob;
                var image = new Image();
                var reader = new FileReader();
                image.onload = () =>{
                    const newCanvas = new Canvas({
                        width: image.width, 
                        height: image.height 
                    });
                    const ctx = newCanvas.getContext('2d');
                    ctx.drawImage(image, 0, 0);
                    resolve(newCanvas);
                };
                reader.onload = (e)=>{
                    image.src = e.target.result;
                };
                reader.readAsDataURL(blob1);
            });
        }
    }
};

Canvas.toFile = async (location, canvas)=>{
    const file = new ImageFile(location, {
        height: canvas.height, 
        width: canvas.width
    });
    try{
        file.body(await Canvas.toBuffer(canvas));
    }catch(ex){
        console.log('ER', ex);
    }
    return file;
};

const mimeTypes = [
    {
        check: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
        mime: 'image/png'
    },
    {
        check: [0xff, 0xd8, 0xff],
        mime: 'image/jpeg'
    },
    {
        check: [0x47, 0x49, 0x46, 0x38],
        mime: 'image/gif'
    }
];

const checkOne = (headers)=>{
    return (buffers, options = { offset: 0 }) =>
        headers.every(
            (header, index) => header === buffers[options.offset + index]
        );
};

const mimeFromBuffer = (buffer)=>{
    return mimeTypes.reduce((agg, type)=> agg || (checkOne(type.check) && type.mime), false);
};

Canvas.toBuffer = async (canvas)=>{
    let type = 'image/png';
    return await new Promise((resolve, reject)=>{
        if(!(isBrowser || isJsDom)){
            canvas.toDataURL(type, function(err, dataURL){
                if(err) return reject(err);
                var base64 = dataURL.substring(dataURL.indexOf(','));
                var buffer = new Buffer(base64, 'base64');
                resolve(buffer);
            });
        }else{
            canvas.toBlob( async (blob)=>{
                const reader = new FileReader();
                reader.addEventListener('loadend', () => {
                    resolve(reader.result);
                });
                reader.readAsArrayBuffer(blob);
            }, type);
        }
    });
};

Canvas.url = (location, metaUrl)=>{
    if(
        typeof process === 'object' && 
        typeof process.versions === 'object' && 
        typeof process.versions.node !== 'undefined'
    ){
        return new URL('../node_modules/'+location, import.meta.url);
    }
    if(location.toString().indexOf('://') !== -1){
        return location;
    }
    return '../node_modules/'+location;
};

Canvas.delete = async (location)=>{
    if(!(isBrowser || isJsDom)){
        ensureRequire();
        if(!fs) fs = require('fs');
        await fs.promises.unlink(location);
    }else{
        console.log('Browser created files must be deleted by hand.');
    }
};

Canvas.load = async (location, incomingCanvas)=>{
    const image = await Image.load(location);
    const canvas = incomingCanvas || new Canvas({ 
        height: image.height, 
        width: image.width
    });
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, image.width, image.height);
    return canvas;
};
//env safe save fn

export class ImageFile extends File{
    constructor(path, options={}){
        super(path, options);
    }
    
    toCanvas(){
        return Canvas.from(this);
    }
    
    mime(){
        return mimeFromBuffer(this.buffer);
    }
    
    size(){
        //todo: detect type and size from bytes, if not present
        return {
            height: this.options.height,
            width: this.options.width
        };
    }
    
    static async from(ob, options={}){
        if(Canvas.is(ob)){
            return Canvas.toFile(this.path, ob);
        }
    }
    
    static is(ob){
        return ob instanceof ImageFile;
    }
}

//env safe Image reference
if(!(isBrowser || isJsDom)){
    ensureCanvas();
    Image = canvas.Image;
}else{
    Image = window.Image;
}
//let download = null;
Image.load = async (loc, canvas)=>{
    let location = typeof loc === 'string'?loc:loc+'';
    //let localLocation = null;
    return await new Promise((resolve, reject)=>{
        var img = new Image();
        img.onload = function(){
            resolve(img);
        };
        img.onerror = function(err){
            reject(err);
        };
        if(!(isBrowser || isJsDom)){
            //var src = '';
            ensureRequire();
            if(!fs) fs = require('fs');
            if(location.toLowerCase().indexOf('file://') === 0) location = location.substring(7);
            if(location.indexOf('://') !== -1 ){
                img.src = location;
            }else{
                fs.readFile(location, function(err, data){
                    if(err) return reject(err);
                    img.src = data;
                });
            }
        }else{
            if(location.indexOf('://') !== -1){
                img.crossOrigin = 'Anonymous';
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
};

export { Canvas, Image };