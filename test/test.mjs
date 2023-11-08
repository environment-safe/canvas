/* global describe : false */
import { isClient } from '@environment-safe/runtime-context';
import { it, configure } from '@open-automaton/moka';
import { chai } from '@environment-safe/chai';
import { Download, Path } from '@environment-safe/file';
const should = chai.should();
import { Canvas, ImageFile, pixelSimilarity } from '../src/index.mjs';
import * as fs from 'fs';

const nonEmpty = (array)=>{
    return Array.prototype.filter.call(
        array, 
        (value) => !(value === 0 || value === 255) 
    );
};

describe('environment-safe-canvas', ()=>{
    const download = new Download();
    configure({
        downloads: (dl)=>{
            download.observe(dl);
        }
    });
    describe('canvas interface', ()=>{
        it('can draw a rect on an empty canvas', ()=>{
            should.exist(Canvas);
            const canvas = new Canvas({ width: 200, height: 200 });
            const ctx = canvas.getContext('2d');
            
            ctx.fillStyle = 'green';
            ctx.fillRect(10, 10, 150, 100);
            
            const { data } = ctx.getImageData(0, 0, 200, 200);
            let lcv=0;
            let numEmpty = 0;
            let numNonEmpty = 0;
            for(;lcv < data.length; lcv += 4){
                if(data[lcv] !== 0 || data[lcv+1] !== 0 || data[lcv+2] !== 0){
                    numNonEmpty++;
                }else{
                    numEmpty++;
                }
            }
            numNonEmpty.should.equal(15000);
            numEmpty.should.equal(25000);
        });
    });
    
    describe('canvas interface', ()=>{
        it('reads as expected', async ()=>{
            const canvas = await Canvas.load('racoon.png');
            const context = canvas.getContext('2d');
            const { data: pixels } = context.getImageData(0, 0, canvas.width, canvas.height);
            const nonEmptyValues = nonEmpty(pixels);
            nonEmptyValues.length.should.be.above(0);
        });
        
        it('writes local as expected', async function(){
            this.timeout(8000);
            const canvas = await Canvas.load('racoon.png');
            const context = canvas.getContext('2d');
            const { data: pixels } = context.getImageData(0, 0, canvas.width, canvas.height);
            const anticipatedDownload = download.expect();
            await Canvas.save('racoon-copy.png', canvas);
            if(!isClient){
                const canvas2 = await Canvas.load('racoon-copy.png');
                const context2 = canvas2.getContext('2d');
                const { data: pixels2 } = context2.getImageData(
                    0, 0, canvas2.width, canvas2.height
                );
                nonEmpty(pixels).should.deep.equal(nonEmpty(pixels2));
                await Canvas.delete('racoon-copy.png');
            }else{
                await anticipatedDownload;
            }
        });
        
        it('writes remote as expected', async function(){
            this.timeout(8000);
            const canvas = await Canvas.load('https://i.imgur.com/zydglXB.jpeg');
            const context = canvas.getContext('2d');
            const { data: pixels } = context.getImageData(0, 0, canvas.width, canvas.height);
            const anticipatedDownload = download.expect();
            await Canvas.save('imagur-copy.png', canvas);
            if(!isClient){
                const canvas2 = await Canvas.load('imagur-copy.png');
                const context2 = canvas2.getContext('2d');
                const { data: pixels2 } = context2.getImageData(
                    0, 0, canvas2.width, canvas2.height
                );
                nonEmpty(pixels).should.deep.equal(nonEmpty(pixels2));
                await Canvas.delete('imagur-copy.png');
            }else{
                await anticipatedDownload;
            }
        });
    });
    
    describe('works with the file interface', ()=>{
        it('can load a canvas, then save a file', async function(){
            this.timeout(8000);
            Canvas.legacyMode = true;
            const canvas = await Canvas.load('https://i.imgur.com/zydglXB.jpeg');
            const file = await ImageFile.from(canvas);
            // no file path means auto-save to tmp in node
            const anticipatedDownload = download.expect();
            await file.save();
            if(isClient) await anticipatedDownload;
        });
        
        it('canvas saves PNG correctly', async function(){
            this.timeout(8000);
            
            const originPath = './racoon.png';
            const destinationPath = Path.join(
                Path.location('downloads'), 
                'sampleDownload.png'
            );
            
            const canvas = await Canvas.load(originPath);
            // no file path means auto-save to tmp in node
            const anticipatedDownload = download.expect();
            await Canvas.save(destinationPath, canvas);
            let destinationBuffer = null;
            let originBuffer = null;
            if(isClient){
                const dl = await anticipatedDownload;
                destinationBuffer = dl.arrayBuffer();
                const response = await fetch(originPath);
                originBuffer = await response.arrayBuffer();
            }else{
                originBuffer = await new Promise((resolve, reject)=>{
                    fs.readFile(originPath, (err, buffer)=>{
                        if(err) return reject(err);
                        resolve(buffer);
                    });
                });
                destinationBuffer = await new Promise((resolve, reject)=>{
                    fs.readFile(destinationPath, (err, buffer)=>{
                        if(err) return reject(err);
                        resolve(buffer);
                    });
                });
            }
            const similarity = await pixelSimilarity(
                originBuffer, 
                destinationBuffer,
                { 
                    notBlank: true,
                    notEmpty: true,
                    notIdentity: true
                }
            );
            similarity.should.equal(1);
        });
    });
});
