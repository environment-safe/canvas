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
when you run in the browser, you'll need your importmap to look like

```json
{
    "imports": {
        "module": "<any module location, this is a dummy that just needs to load>",
        "browser-or-node": "/node_modules/browser-or-node/src/index.js"
    }
}

```

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
