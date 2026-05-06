const fs = require('fs');

function readGlbNodes(filePath) {
  const buffer = fs.readFileSync(filePath);
  const magic = buffer.toString('utf8', 0, 4);
  if (magic !== 'glTF') throw new Error('Not a glTF file');
  
  const version = buffer.readUInt32LE(4);
  const length = buffer.readUInt32LE(8);
  
  const chunkLength = buffer.readUInt32LE(12);
  const chunkType = buffer.toString('utf8', 16, 20);
  if (chunkType !== 'JSON') throw new Error('First chunk is not JSON');
  
  const jsonString = buffer.toString('utf8', 20, 20 + chunkLength);
  const json = JSON.parse(jsonString);

  const targetNodes = ['node_0', 'node_0.001', 'node_0.002', 'node_0.004'];
  
  json.nodes.forEach((node, idx) => {
    if (targetNodes.includes(node.name)) {
      console.log(`\n=== ${node.name} (index ${idx}) ===`);
      console.log('Children:', node.children);
      if (node.mesh !== undefined) {
        console.log('Direct mesh index:', node.mesh);
        const mesh = json.meshes[node.mesh];
        if (mesh) {
          console.log('Mesh primitives:', mesh.primitives?.length);
        }
      }
    }
  });
  
  console.log('\n=== All meshes ===');
  json.meshes.forEach((mesh, idx) => {
    console.log(`Mesh ${idx}:`, mesh.name, '- primitives:', mesh.primitives?.length);
  });
}

readGlbNodes('public/models/floatingIsland.glb');