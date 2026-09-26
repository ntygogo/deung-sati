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
  const vertex=(point:Three.Vector3,color:Three.Color,chain:string[],u:number,secondaryChain?:string[])=>{
    positions.push(point.x,point.y,point.z);colors.push(color.r,color.g,color.b);
    const influences:number[]=[],amounts:number[]=[];
    for(const current of secondaryChain?[chain,secondaryChain]:[chain]){
      const along=T.MathUtils.clamp(u,0,1)*(current.length-1),lo=Math.min(Math.floor(along),current.length-2),blend=along-lo;
      const share=secondaryChain ? 0.5 : 1;
      influences.push(boneIndex.get(current[lo])!,boneIndex.get(current[lo+1])!);
      amounts.push((1-blend)*share,blend*share);
    }
    for(let i=0;i<4;i++){joints.push(influences[i]??0);weights.push(amounts[i]??0);}
  };
  const grid=(rows:number,cols:number,sample:(u:number,v:number)=>{point:Three.Vector3;color:Three.Color;chain:string[];skinU:number;secondaryChain?:string[]})=>{
    const start=positions.length/3;
    for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){const p=sample(i/rows,j/cols*2-1);vertex(p.point,p.color,p.chain,p.skinU,p.secondaryChain);}
    for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=start+i*(cols+1)+j,b=a+cols+1;indices.push(a,b,a+1,b,b+1,a+1);}
  };
  const front=new T.Vector3(-.363,0,.932);
  const chains=[['Bone_052','Bone_051','Bone_050','Bone_049'],['Bone_056','Bone_055','Bone_054','Bone_053'],['Bone_045','Bone_044','Bone_043'],['Bone_048','Bone_047','Bone_046']];
  // This export has four bone chains, but the anatomy has THREE gill fans
  // on each side. The middle fan interpolates its neighboring chains.
  const branches=[
    {name:'left-upper',chain:chains[0],tier:'upper'},
    {name:'left-middle',chain:chains[0],secondaryChain:chains[2],tier:'middle'},
    {name:'left-lower',chain:chains[2],tier:'lower'},
    {name:'right-upper',chain:chains[1],tier:'upper'},
    {name:'right-middle',chain:chains[1],secondaryChain:chains[3],tier:'middle'},
    {name:'right-lower',chain:chains[3],tier:'lower'},
  ];
  for(const {chain,secondaryChain,tier} of branches){
    const originalCurve=new T.CatmullRomCurve3(chain.map(locate));
    const neighbor=secondaryChain?new T.CatmullRomCurve3(secondaryChain.map(locate)):null;
    const points=Array.from({length:5},(_,i)=>{
      const u=i/4,point=originalCurve.getPoint(u);
      if(neighbor)point.lerp(neighbor.getPoint(u),.5);
      point.y+=(tier==='upper'?.07:tier==='lower'?-.05:0)*u*u;
      return point;
    });
    const direction=points.at(-1)!.clone().sub(points[0]).normalize();
    const across=front.clone().cross(direction).normalize();
    const curve=new T.CatmullRomCurve3(points);const isLower=tier==='lower';
    const leafMode=element==='leaf';
    const lobes=leafMode?7:3;
    for(let j=0;j<lobes;j++){
      // Fern leaves branch along a stem; other forms open into three clearly separated lobes.
      const branch=leafMode?(j===6?0:j%2?1:-1):j-1;
      const startU=leafMode?(j===6?.58:.15+Math.floor(j/2)*.22):0;
      const endU=leafMode?Math.min(1,startU+.34):1;
      const width=(element==='flower'?.105:element==='water'?.080:element==='leaf'?.065:element==='earth'?.075:element==='wind'?.045:.063)*(isLower?.85:tier==='middle'?.85:1);
      grid(element==='earth'?10:24,element==='earth'?2:8,(u,v)=>{
        const pathU=startU+(endU-startU)*u;
        const point=curve.getPoint(pathU);
        const spread=leafMode?branch*.18*Math.sin(u*Math.PI*.65):branch*(element==='flower'?.17:element==='wind'?.13:.14)*Math.pow(u,1.2);
        const extra=(tier==='middle'?.20:isLower?.06:.12)*u*(leafMode?.3:1);
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
        return {point,color:c,chain,skinU:pathU,secondaryChain};
      });
    }
    // A small tapered center membrane closes the root seam and supports fern branches.
    grid(16,4,(u,v)=>{
      const point=curve.getPoint(u).addScaledVector(across,v*.035*(1-u*.85));
      return {point,color:base.clone().lerp(end,u*.5),chain,skinU:u,secondaryChain};
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
  const mesh=new T.SkinnedMesh(geometry,material);mesh.name='element-gills-and-dorsal';mesh.userData.elementFin=true;mesh.userData.gillBranches=branches.map(b=>b.name);mesh.frustumCulled=false;
  model.add(mesh);mesh.bind(skeleton,new T.Matrix4());
}
