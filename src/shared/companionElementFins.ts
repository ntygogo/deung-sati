import type * as Three from 'three';
import type { CompanionElement } from './companionElements';

/** Replacement gill silhouettes and a continuous dorsal sail, skinned to the original rig. */
export function addElementFins(T:typeof Three,model:Three.Object3D,element:CompanionElement,accent:string,tip:string) {
  model.updateMatrixWorld(true);
  const bones:Three.Bone[]=[];
  model.traverse(o=>{if((o as Three.Bone).isBone)bones.push(o as Three.Bone);});
  const skeleton=new T.Skeleton(bones);
  const boneIndex=new Map(bones.map((b,i)=>[b.name,i]));
  const base=new T.Color(accent),end=new T.Color(tip);
  const material=new T.MeshPhysicalMaterial({vertexColors:true,side:T.DoubleSide,roughness:.32,metalness:.06,
    clearcoat:.75,clearcoatRoughness:.25,emissive:tip,emissiveIntensity:.065,
    iridescence:element==='water'||element==='wind'?.45:.12,iridescenceThicknessRange:[140,340],flatShading:element==='earth'});
  const positions:number[]=[],colors:number[]=[],indices:number[]=[],joints:number[]=[],weights:number[]=[];
  const locate=(name:string)=>model.getObjectByName(name)!.getWorldPosition(new T.Vector3());
  const vertex=(point:Three.Vector3,color:Three.Color,chain:string[],u:number)=>{
    positions.push(point.x,point.y,point.z);colors.push(color.r,color.g,color.b);
    const along=T.MathUtils.clamp(u,0,1)*(chain.length-1),lo=Math.min(Math.floor(along),chain.length-2),blend=along-lo;
    joints.push(boneIndex.get(chain[lo])!,boneIndex.get(chain[lo+1])!,0,0);weights.push(1-blend,blend,0,0);
  };
  const grid=(rows:number,cols:number,sample:(u:number,v:number)=>{point:Three.Vector3;color:Three.Color;chain:string[];skinU:number})=>{
    const start=positions.length/3;
    for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){const p=sample(i/rows,j/cols*2-1);vertex(p.point,p.color,p.chain,p.skinU);}
    for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=start+i*(cols+1)+j,b=a+cols+1;indices.push(a,b,a+1,b,b+1,a+1);}
  };
  const front=new T.Vector3(-.363,0,.932);
  const chains=[['Bone_052','Bone_051','Bone_050','Bone_049'],['Bone_056','Bone_055','Bone_054','Bone_053'],['Bone_045','Bone_044','Bone_043'],['Bone_048','Bone_047','Bone_046']];
  for(const [index,chain] of chains.entries()){
    const points=chain.map(locate),direction=points.at(-1)!.clone().sub(points[0]).normalize();
    const across=front.clone().cross(direction).normalize();
    const curve=new T.CatmullRomCurve3(points);const isLower=index>=2;
    const leafMode=element==='leaf';
    const lobes=leafMode?7:3;
    for(let j=0;j<lobes;j++){
      // Fern leaves branch along a stem; other forms open into three clearly separated lobes.
      const branch=leafMode?(j===6?0:j%2?1:-1):j-1;
      const startU=leafMode?(j===6?.58:.15+Math.floor(j/2)*.22):0;
      const endU=leafMode?Math.min(1,startU+.34):1;
      const width=(element==='flower'?.105:element==='water'?.080:element==='leaf'?.065:element==='earth'?.075:element==='wind'?.045:.063)*(isLower?.85:1);
      grid(element==='earth'?10:24,element==='earth'?2:8,(u,v)=>{
        const pathU=startU+(endU-startU)*u;
        const point=curve.getPoint(pathU);
        const spread=leafMode?branch*.18*Math.sin(u*Math.PI*.65):branch*(element==='flower'?.17:element==='wind'?.13:.14)*Math.pow(u,1.2);
        const extra=(isLower?.06:.12)*u*(leafMode?.3:1);
        const fullness=element==='flower'?.45:element==='earth'?1:element==='water'?.65:.8;
        let profile=Math.pow(Math.max(0,Math.sin(Math.PI*u)),fullness);
        if(element==='earth')profile=1-Math.abs(2*u-1);
        const curl=element==='wind'?Math.sin(u*Math.PI*1.5)*.06:element==='fire'?Math.sin(u*Math.PI)*.065:0;
        point.addScaledVector(direction,extra).addScaledVector(across,spread+v*width*profile+curl);
        // A shallow cup gives the membranes a real rim and readable highlights.
        point.addScaledVector(front,Math.sin(u*Math.PI)*(.018+v*v*.018));
        const c=base.clone().lerp(end,T.MathUtils.smoothstep(u,.1,.97)*.86);
        if(Math.abs(v)>.75)c.lerp(end,.3);
        if(leafMode&&Math.abs(v)<.2)c.lerp(end,.4);
        return {point,color:c,chain,skinU:pathU};
      });
    }
    // A small tapered center membrane closes the root seam and supports fern branches.
    grid(16,4,(u,v)=>{
      const point=curve.getPoint(u).addScaledVector(across,v*.035*(1-u*.85));
      return {point,color:base.clone().lerp(end,u*.5),chain,skinU:u};
    });
  }
  // One continuous, low-rooted sail follows the back into the tail base.
  const spine=['Bone_004','Bone_005','Bone_006','Bone_003','Bone_022','Bone_021'];
  const dorsalPoints=spine.map((name,i)=>locate(name).add(new T.Vector3(0,i<4?.265:i<6?.22:.17,0)));
  const dorsalCurve=new T.CatmullRomCurve3(dorsalPoints);
  grid(48,10,(u,v)=>{
    const heightCoord=(v+1)/2;
    const point=dorsalCurve.getPoint(u);
    const taper=Math.pow(Math.sin(Math.PI*u),.75);
    let silhouette=.21;
    if(element==='water')silhouette=.21+.055*Math.sin(u*Math.PI*4);
    if(element==='wind')silhouette=.16+.10*Math.sin(u*Math.PI*2-.4);
    if(element==='fire')silhouette=.18+.12*Math.pow(.5+.5*Math.sin(u*Math.PI*6),2);
    if(element==='earth')silhouette=.15+.09*(1-Math.abs((u*4%1)*2-1));
    if(element==='leaf')silhouette=.23+.035*Math.cos(u*Math.PI*6);
    if(element==='flower')silhouette=.17+.07*Math.pow(Math.sin(u*Math.PI*4),2);
    point.y+=Math.max(.025,silhouette)*taper*heightCoord;
    point.x+=Math.sin(heightCoord*Math.PI*.8)*.035*taper;
    const edge=T.MathUtils.smoothstep(.62,.97,heightCoord);
    const color=base.clone().lerp(end,heightCoord*.68+edge*.23);
    // Leaf veins and petal ribs are part of the surface, not separate protrusions.
    if(element==='leaf'||element==='flower')color.lerp(end,Math.pow(Math.max(0,Math.cos(u*Math.PI*12)),16)*.22*heightCoord);
    return {point,color,chain:spine,skinU:u};
  });
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(joints,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new T.SkinnedMesh(geometry,material);mesh.name='element-gills-and-dorsal';mesh.userData.elementFin=true;mesh.frustumCulled=false;
  model.add(mesh);mesh.bind(skeleton,new T.Matrix4());
}
