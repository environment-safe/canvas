/* global describe : false */
import { isBrowser, isJsDom } from '@environment-safe/runtime-context';
import { it, configure } from '@open-automaton/moka';
import { chai } from '@environment-safe/chai';
import { Download } from '@environment-safe/file';
const should = chai.should();
import { Canvas, ImageFile } from '../src/index.mjs';

const nonEmpty = (array)=>{
    return Array.prototype.filter.call(
        array, 
        (value) => !(value === 0 || value === 255) 
    );
};

describe('environment-safe-canvas', ()=>{
    const download = new Download();
    /*const filesystemImageName = Path.join(
        Path.location('images'), 
        `image${Math.floor( Math.random() * 1000000)}.png`
    );*/
    configure({
        // dialog : async (context, actions)=> await actions.confirm(), // OK everything,
        //wantsInput : async (context, actions)=> await actions.click('#mocha'), // click everything
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
            const canvas = await Canvas.load('test/racoon.png');
            const context = canvas.getContext('2d');
            const { data: pixels } = context.getImageData(0, 0, canvas.width, canvas.height);
            const nonEmptyValues = nonEmpty(pixels);
            nonEmptyValues.length.should.be.above(0);
        });
        
        it('writes local as expected', async function(){
            this.timeout(8000);
            const canvas = await Canvas.load('test/racoon.png');
            const context = canvas.getContext('2d');
            const { data: pixels } = context.getImageData(0, 0, canvas.width, canvas.height);
            const anticipatedDownload = download.expect();
            await Canvas.save('test/racoon-copy.png', canvas);
            if(!(isBrowser || isJsDom)){
                const canvas2 = await Canvas.load('test/racoon-copy.png');
                const context2 = canvas2.getContext('2d');
                const { data: pixels2 } = context2.getImageData(
                    0, 0, canvas2.width, canvas2.height
                );
                nonEmpty(pixels).should.deep.equal(nonEmpty(pixels2));
                await Canvas.delete('test/racoon-copy.png');
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
            await Canvas.save('test/imagur-copy.png', canvas);
            if(!(isBrowser || isJsDom)){
                const canvas2 = await Canvas.load('test/imagur-copy.png');
                const context2 = canvas2.getContext('2d');
                const { data: pixels2 } = context2.getImageData(
                    0, 0, canvas2.width, canvas2.height
                );
                nonEmpty(pixels).should.deep.equal(nonEmpty(pixels2));
                await Canvas.delete('test/imagur-copy.png');
            }else{
                await anticipatedDownload;
            }
        });
    });
    
    describe('works with the file interface', ()=>{
        it('can load a canvas, then save a file', async function(){
            this.timeout(8000);
            const canvas = await Canvas.load('https://i.imgur.com/zydglXB.jpeg');
            const file = await ImageFile.from(canvas);
            // no file path means auto-save to tmp in node
            const anticipatedDownload = download.expect();
            await file.save();
            if(isBrowser || isJsDom) await anticipatedDownload;
        });
    });
});
