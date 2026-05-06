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
  
  const meshNames = json.nodes.map(n => n.name).filter(Boolean);
  console.log('Nodes with names:');
  console.log(meshNames.join('\n'));
}

readGlbNodes('public/models/floatingIsland.glb');
