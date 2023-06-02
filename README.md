environment-safe-canvas
=======================


There's a great node canvas and a great browser canvas, but there's not a great way to write 1 script that works in the browser and in node. This sorts out the rough edges.

Usage
-----

```javascript
import { Canvas } from 'environment-safe-canvas';
//...
const myCanvas = new Canvas({ height: 200, width: 200 });
// use canvas
```
when you run in the browser(without a build), you'll need your head to have:
<script src="
    /node_modules/file-saver/dist/FileSaver.js
"></script>
<script type="importmap">
    {
        "imports": {
            "chai": "/node_modules/chai/chai.js",
            "environment-safe-chai": "/node_modules/environment-safe-chai/environment-safe-chai.js",
            "module": "/node_modules/browser-or-node/src/index.js",
            "browser-or-node": "/node_modules/browser-or-node/src/index.js"
        }
    }
</script>

Nonstandard Methods
-------------------

**Canvas.save(location, canvas);**

**Canvas.load(location[, canvas])**

**Canvas.delete(location)**

Testing
-------

```bash
npm run test
```

To run the same in a browser

```bash
npm run browser-test
```

To run the same in a container

```bash
npm run container-test
```
