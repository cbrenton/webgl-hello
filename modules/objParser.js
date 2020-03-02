'use strict';

function addModel(context) {
  if (context.faces) {
    const {faces, modelName, materialName} = context;
    context.models.push({
      faces,
      modelName,
      materialName,
    });
    context.faces = undefined;
  }
}

function addDataFn(name) {
  return function(context, args) {
    addModel(context);
    const {data} = context;
    if (!data[name]) {
      data[name] = {
        numComponents: args.length,
        data: [],
      };
    }
    data[name].data.push(...args.map(parseFloat));
  };
}

function addPropFn(name) {
  return function(context, args) {
    context[name] = args.join(' ');
  };
}

function addFace(context, args) {
  if (!context.faces) {
    context.faces = [];
  }
  context.faces.push(args.map((vert) => {
    return vert.split('/').map(v => v.length ? parseInt(v) : undefined);
  }));
}

function noop() {}

const objHandlers = {
  mtllib: addPropFn('mtllib'),
  v: addDataFn('position'),
  vn: addDataFn('normal'),
  vt: addDataFn('texcoord'),
  g: addPropFn('modelName'),
  o: addPropFn('modelName'),
  usemtl: addPropFn('materialName'),
  s: noop,
  f: addFace,
};

export function parseObj(objText) {
  const context = {
    data: {},
    models: [],
  };
  objText.split('\n').forEach((origLine, lineNo) => {
    const noCommentLine = origLine.replace(/#.*/, '');
    const line = noCommentLine.trim();
    if (line === '') {
      return;
    }
    const parts = line.split(/\s+/);
    const code = parts.shift();
    const fn = objHandlers[code];
    if (!fn) {
      console.error('unknown code:', code, 'at line', lineNo + 1, ':', line);
    } else {
      fn(context, parts);
    }
  });
  addModel(context);

  const arrays = {};
  const indices = [];
  let numVerts = 0;
  const vertIds = {};
  const arrayNames = Object.keys(context.data);
  for (const [name, src] of Object.entries(context.data)) {
    arrays[name] = {
      numComponents: src.numComponents,
      data: [],
    };
  }

  // for the f statement
  // f v/vt/vn -> position/texcoord/normal
  const channelNames = [
    'position',
    'texcoord',
    'normal',
  ];

  function addVertex(vertexPartIndices) {
    const parts = [];
    vertexPartIndices.forEach((partNdx, ndx) => {
      if (partNdx !== undefined) {
        parts.push(ndx, partNdx);
      }
    });
    const vId = parts.join(',');
    let vertNdx = vertIds[vId];
    if (vertNdx === undefined) {
      vertNdx = numVerts++;
      vertIds[vId] = vertNdx;
      vertexPartIndices.forEach((partNdx, ndx) => {
        if (partNdx === undefined) {
          return;
        }
        const name = channelNames[ndx];
        const data = context.data[name];
        const start = (partNdx - 1) * data.numComponents;
        const end = start + data.numComponents;
        if (end > data.data.length) {
          debugger;
        }
        const values = data.data.slice(start, end);
        if (values.length !== 3) {
          debugger;
        }
        arrays[name].data.push(...values);
      });
    }
    return vertNdx;
  }

  for (const model of context.models) {
    for (const face of model.faces) {
      const numVerts = face.length;
      if (numVerts < 3) {
        throw new Error('numVerts for face not at least 3');
      }
      if (numVerts > 4) {
        debugger;
      }
      const vNdx0 = addVertex(face[0]);
      for (let i = 1; i < numVerts - 1; ++i) {
        indices.push(vNdx0);
        indices.push(addVertex(face[i]));
        indices.push(addVertex(face[i + 1]));
      }
    }
  }

  arrays.indices = {
    data: new (indices.length > 65535 ? Uint32Array : Uint16Array)(indices),
  };

  return arrays;
}