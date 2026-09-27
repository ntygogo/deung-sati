import type * as Three from 'three';
import type { CompanionElement } from './companionElements';

/** Authored in the GLB's rest space, then attached to its verified joints. */
export function addElementSilhouette(T: typeof Three, model: Three.Object3D, element: CompanionElement, accent: string, tip: string) {
  const moving: {group:Three.Group; phase:number; amount:number}[]=[];
  const base=new T.Color(accent), end=new T.Color(tip);
  const material=new T.MeshPhysicalMaterial({color:0xffffff,vertexColors:true,side:T.DoubleSide,
    emissive:tip,emissiveIntensity:.11,roughness:element==='earth'?.32:.26,metalness:.08,clearcoat:.8,clearcoatRoughness:.23,
    iridescence:element==='water'||element==='wind'?.55:.2,iridescenceIOR:1.3,iridescenceThicknessRange:[120,340]});
  const pearl=new T.MeshStandardMaterial({color:tip,emissive:tip,emissiveIntensity:.08,roughness:.32,metalness:.15});
  const dark=new T.MeshStandardMaterial({color:accent,roughness:.4,metalness:.12});
  const add=(g:Three.BufferGeometry,m:Three.Material,parent:Three.Object3D)=>{const mesh=new T.Mesh(g,m);parent.add(mesh);return mesh;};
  const frame=(name:string,offset:Three.Vector3,orientation=new T.Quaternion())=>{
    const bone=model.getObjectByName(name);if(!bone)return null;
    const group=new T.Group();const position=bone.getWorldPosition(new T.Vector3()).add(offset);
    group.position.copy(bone.worldToLocal(position));
    group.quaternion.copy(bone.getWorldQuaternion(new T.Quaternion()).invert()).multiply(orientation);
    bone.add(group);return group;
  };
  // Curved, thin surfaces with a saturated root and pearlescent tips, not flat decals.
  const petal=(parent:Three.Object3D,length:number,width:number,angle:number,phase:number,kind=element)=>{
    const pivot=new T.Group();pivot.rotation.z=angle;parent.add(pivot);
    const flex=new T.Group();pivot.add(flex);moving.push({group:flex,phase,amount:kind==='earth'?.012:.065});
    const vertices:number[]=[],colors:number[]=[],indices:number[]=[];const rows=20,cols=8;
    for(let i=0;i<=rows;i++){
      const u=i/rows;
      const fullness=kind==='flower'?.48:kind==='leaf'?.65:.85;
      const w=width*Math.pow(Math.sin(Math.PI*u),fullness);
      for(let j=0;j<=cols;j++){
        const v=j/cols*2-1;
        const sweep=kind==='wind'?Math.sin(u*Math.PI*1.8)*length*.13:kind==='fire'?u*u*length*.14:0;
        const x=v*w+sweep,y=u*length;
        const z=Math.sin(u*Math.PI)*length*.13+(v*v)*width*.2+(kind==='wind'?u*u*u*length*.16:0);
        vertices.push(x,y,z);
        const blend=T.MathUtils.smoothstep(u,.12,.96)*.88;
        const c=base.clone().lerp(end,blend).multiplyScalar(.9+.1*(1-Math.abs(v)));
        colors.push(c.r,c.g,c.b);
      }
    }
    for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=i*(cols+1)+j,b=a+cols+1;indices.push(a,b,a+1,b,b+1,a+1);}
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    add(geometry,material,flex);
    if(kind==='leaf'||kind==='flower'||kind==='water'){
      const curve=new T.CatmullRomCurve3([new T.Vector3(0,.015,.004),new T.Vector3(0,length*.45,length*.135),new T.Vector3(0,length*.86,length*.06)]);
      add(new T.TubeGeometry(curve,14,.004,5,false),pearl,flex);
    }
    return flex;
  };
  model.updateMatrixWorld(true);
  const tail=model.getObjectByName('Bone_017'),previous=model.getObjectByName('Bone_018');
  if(tail&&previous){
    const direction=tail.getWorldPosition(new T.Vector3()).sub(previous.getWorldPosition(new T.Vector3())).normalize();
    const normal=new T.Vector3(0,1,0).cross(direction).normalize();
    const across=direction.clone().cross(normal).normalize();
    const basis=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(across,direction,normal));
    const fan=frame('Bone_017',direction.clone().multiplyScalar(.025),basis)!;
    fan.rotateY(.25);
    fan.scale.set(1.7,1.4,1.15);
    if(element==='earth'){
      for(let i=0;i<5;i++){
        const angle=(i-2)*.29;const pivot=new T.Group();pivot.rotation.z=angle;fan.add(pivot);
        const stem=add(new T.CylinderGeometry(.018,.027,.20,8),dark,pivot);stem.position.y=.09;
        const crystal=add(new T.OctahedronGeometry(1,0),pearl,pivot);crystal.scale.set(.083,.21-Math.abs(i-2)*.025,.066);crystal.position.y=.23;
      }
    }else{
      const count=element==='flower'?7:element==='wind'?3:5;
      for(let i=0;i<count;i++){
        const center=i-(count-1)/2;
        const length=(element==='wind'?.62:element==='water'?.54:.46)-Math.abs(center)*.035;
        const width=element==='wind'?.065:element==='flower'?.125:element==='leaf'?.145:.10;
        petal(fan,length,width,center*(element==='flower'?.27:.36),i*.8);
      }
      const jewel=add(new T.SphereGeometry(.055,18,12),pearl,fan);jewel.scale.set(1,1.3,.7);jewel.position.set(0,.075,.028);
    }
  }
  // Jewelry-sized stalk details keep the face and expressive eye line unobstructed.
  const stalk=frame('Bone_040',new T.Vector3());
  if(stalk){
    if(element==='leaf'||element==='flower'){
      petal(stalk,.105,.038,.95,1,'leaf');
      if(element==='flower'){const bud=add(new T.SphereGeometry(.035,16,10),pearl,stalk);bud.position.set(.075,.03,0);}
    }else if(element==='earth'){
      const ring=add(new T.TorusGeometry(.033,.009,6,16),pearl,stalk);ring.rotation.x=Math.PI/2;
    }else{
      for(let i=0;i<3;i++){const bead=add(new T.SphereGeometry(.014-i*.002,12,8),pearl,stalk);bead.position.set(.026, i*.035, .012);}
    }
  }
  // Materials may be unused for a particular element; include explicit cleanup for those.
  const used=new Set<Three.Material>();model.traverse(o=>{if((o as Three.Mesh).isMesh){const m=(o as Three.Mesh).material;for(const x of Array.isArray(m)?m:[m])used.add(x);}});
  for(const m of [material,pearl,dark])if(!used.has(m))m.dispose();
  return (time:number)=>{for(const {group,phase,amount} of moving){group.rotation.x=Math.sin(time*1.45-phase)*amount;group.rotation.y=Math.sin(time*.85-phase)*amount*.45;}};
}
