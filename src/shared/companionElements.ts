import type * as Three from 'three';
import { addElementSilhouette } from './companionElementSilhouette';
export type CompanionElement = 'earth' | 'water' | 'wind' | 'fire' | 'leaf' | 'flower';

/** Small rig-attached forms: motion is inherited from the existing living skeleton. */
export function addElementParts(T: typeof Three, model: Three.Object3D, lamp: Three.Group, surface: Three.MeshPhysicalMaterial, element: CompanionElement, accent: string, tip: string, decorateLamp = true) {
  const detail = new T.MeshPhysicalMaterial({color:accent, roughness:.38, clearcoat:.65, metalness:.06});
  const soft = new T.MeshPhysicalMaterial({color:tip, roughness:.3, clearcoat:.8, metalness:.03});
  const mesh = (geometry: Three.BufferGeometry, material: Three.Material, parent: Three.Object3D, x=0,y=0,z=0) => {
    const m=new T.Mesh(geometry,material); m.position.set(x,y,z);parent.add(m);return m;
  };
  const oval=(parent:Three.Object3D,material:Three.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>{
    const m=mesh(new T.SphereGeometry(1,20,14),material,parent,x,y,z);m.scale.set(sx,sy,sz);return m;
  };
  const leaf=(parent:Three.Object3D,material:Three.Material,length:number,width:number,angle:number)=>{
    const shape=new T.Shape();shape.moveTo(0,0);shape.bezierCurveTo(-width,length*.35,-width,length*.75,0,length);shape.bezierCurveTo(width,length*.75,width,length*.35,0,0);
    const g=new T.ExtrudeGeometry(shape,{depth:.012,bevelEnabled:true,bevelThickness:.008,bevelSize:.007,bevelSegments:2,steps:1,curveSegments:14});
    const m=mesh(g,material,parent);m.rotation.z=angle;return m;
  };
  if(decorateLamp && element!=='water') {
    for(const child of [...lamp.children]) {lamp.remove(child);if((child as Three.Mesh).isMesh)(child as Three.Mesh).geometry.dispose();}
    if(element==='earth') {
      mesh(new T.DodecahedronGeometry(.112,0),surface,lamp,0,.14,0);
      const ring=mesh(new T.TorusGeometry(.113,.014,8,40),detail,lamp,0,.14,0);ring.rotation.x=Math.PI/2;
    } else if(element==='wind') {
      oval(lamp,surface,0,.13,0,.11,.085,.09);
      oval(lamp,surface,-.08,.155,0,.065,.052,.065);oval(lamp,surface,.08,.15,0,.064,.057,.065);
      oval(lamp,soft,.035,.24,0,.021,.032,.021);
    } else if(element==='fire') {
      const points=[[.022,0],[.074,.07],[.09,.14],[.065,.21],[.028,.265],[0,.32]].map(([r,y])=>new T.Vector2(r,y));
      const g=new T.LatheGeometry(points,40);const pos=g.getAttribute('position');
      for(let i=0;i<pos.count;i++)pos.setX(i,pos.getX(i)+Math.pow(pos.getY(i)/.32,2)*.065);
      g.computeVertexNormals();mesh(g,surface,lamp);
      oval(lamp,soft,0,.15,.069,.031,.07,.024);
    } else if(element==='leaf') {
      oval(lamp,surface,0,.12,0,.055,.08,.055);
      const a=leaf(lamp,detail,.20,.073,-.72);a.position.y=.05;
      const b=leaf(lamp,soft,.17,.064,.72);b.position.y=.065;
    } else {
      oval(lamp,surface,0,.15,0,.052,.055,.052);
      for(let i=0;i<5;i++) {const a=i*Math.PI*2/5;const p=oval(lamp,i%2?soft:detail,Math.sin(a)*.068,.15+Math.cos(a)*.068,0,.044,.075,.028);p.rotation.z=-a;}
      oval(lamp,surface,0,.15,.041,.041,.041,.026);
    }
  } else if(decorateLamp) {
    for(let i=0;i<3;i++)oval(lamp,soft,Math.cos(i*2.1)*.105,.12+i*.035,Math.sin(i*2.1)*.105,.016,.021,.016);
  }
  for(const [i,name] of ['Bone_049','Bone_053','Bone_043','Bone_046'].entries()) {
    const bone=model.getObjectByName(name);if(!bone)continue;
    const group=new T.Group();bone.add(group);
    if(element==='earth') {const gem=mesh(new T.OctahedronGeometry(.068,0),i%2?soft:detail,group);gem.scale.y=1.5;}
    else if(element==='leaf') {leaf(group,detail,.16,.045,(i%2?1:-1)*.35);leaf(group,soft,.105,.035,(i%2?-1:1)*.65);}
    else if(element==='flower') {for(let j=0;j<5;j++){const a=j*Math.PI*2/5;const p=oval(group,soft,Math.cos(a)*.045,Math.sin(a)*.045,0,.038,.023,.018);p.rotation.z=a;}oval(group,surface,0,0,.015,.025,.025,.021);}
    else if(element==='water') {oval(group,soft,0,.025,0,.034,.085,.024);}
    else if(element==='wind') {const curl=mesh(new T.TorusGeometry(.05,.012,7,24,Math.PI*1.65),soft,group);curl.rotation.z=i*.7;}
    else {const p=leaf(group,i%2?soft:detail,.13,.035,(i%2?1:-1)*.3);p.rotation.x=.35;}
  }
  return addElementSilhouette(T,model,element,accent,tip);
}
