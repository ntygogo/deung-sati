import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import * as THREE from 'three';
import { trimGillTopology } from './companionGillTopology';

test('actual companion gill cuts close every seam and retain valid skin weights',()=>{
  const file=readFileSync(new URL('../../public/models/deung-sati-axolotl-water-textured.glb',import.meta.url));
  const jsonSize=file.readUInt32LE(12),gltf=JSON.parse(file.subarray(20,20+jsonSize).toString());
  const binary=file.subarray(28+jsonSize);
  const sizes:Record<string,number>={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
  const read=(id:number)=>{
    const a=gltf.accessors[id],v=gltf.bufferViews[a.bufferView],n=sizes[a.type];
    const bytes=a.componentType===5126||a.componentType===5125?4:a.componentType===5123?2:1;
    const data:number[]=[];
    for(let i=0;i<a.count;i++)for(let j=0;j<n;j++){
      const offset=(v.byteOffset??0)+(a.byteOffset??0)+i*(v.byteStride??n*bytes)+j*bytes;
      data.push(a.componentType===5126?binary.readFloatLE(offset):bytes===4?binary.readUInt32LE(offset):bytes===2?binary.readUInt16LE(offset):binary.readUInt8(offset));
    }
    return {data,n};
  };
  const primitive=gltf.meshes[0].primitives[0],geometry=new THREE.BufferGeometry();
  for(const [semantic,name] of [['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv'],['JOINTS_0','skinIndex'],['WEIGHTS_0','skinWeight']]){
    const {data,n}=read(primitive.attributes[semantic]);geometry.setAttribute(name,name==='skinIndex'?new THREE.Uint16BufferAttribute(data,n):new THREE.Float32BufferAttribute(data,n));
  }
  geometry.setIndex(read(primitive.indices).data);
  const bones=gltf.skins[0].joints.map((i:number)=>{const b=new THREE.Bone();b.name=gltf.nodes[i].name;return b;});
  const mesh=new THREE.SkinnedMesh(geometry,new THREE.MeshStandardMaterial());mesh.bind(new THREE.Skeleton(bones));mesh.normalizeSkinWeights();
  const gills=new Set(Array.from({length:14},(_,i)=>`Bone_${String(i+43).padStart(3,'0')}`));
  const sourcePosition=geometry.getAttribute('position');
  const frontFace=Array.from({length:sourcePosition.count},(_,i)=>[sourcePosition.getX(i),sourcePosition.getY(i),sourcePosition.getZ(i)])
    .filter(([x,y,z])=>Math.abs(x)<.4&&y>.6&&y<1.2&&z>1.75);
  trimGillTopology(THREE,mesh,gills);
  assert.equal(mesh.geometry.userData.gillTopology.openLoops,0);
  assert.ok(mesh.geometry.userData.gillTopology.closedLoops>=4);
  const weights=mesh.geometry.getAttribute('skinWeight'),position=mesh.geometry.getAttribute('position');
  for(let i=0;i<position.count;i++){
    assert.ok(Number.isFinite(position.getX(i)+position.getY(i)+position.getZ(i)));
    const sum=weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i);
    assert.ok(Math.abs(sum-1)<1e-5);
  }
  const retained=new Set(Array.from({length:position.count},(_,i)=>[position.getX(i),position.getY(i),position.getZ(i)].join(',')));
  assert.ok(frontFace.length>100);
  for(const vertex of frontFace)assert.ok(retained.has(vertex.join(',')),'front face vertices must not change');
  mesh.geometry.dispose();mesh.skeleton.dispose();(mesh.material as THREE.Material).dispose();
});
