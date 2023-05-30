import { chai } from 'environment-safe-chai';
const should = chai.should();
import { Canvas } from '../environment-safe-canvas.js';

describe('environment-safe-canvas', ()=>{
   describe('performs a simple test suite', ()=>{
        it('works as expected', ()=>{
            const canvas = new Canvas({ width: 200, height: 200 });
            const ctx = canvas.getContext("2d");
            
            ctx.fillStyle = "green";
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
});
