import type * as Three from 'three';

/** Cut only projecting gill tissue, then close the actual cut loops. UV seams
 * are welded for loop discovery only; all original render attributes survive. */
export function trimGillTopology(T:typeof Three,mesh:Three.SkinnedMesh,gillNames:Set<string>) {
  const source=mesh.geometry,position=source.getAttribute('position');
  const si=source.getAttribute('skinIndex'),sw=source.getAttribute('skinWeight');
  const fields=Object.entries(source.attributes).filter(([name])=>name!=='axolotlGillCap');
  const data=new Map(fields.map(([name])=>[name,[] as number[]]));
  const cap:number[]=[],triangles:number[]=[],cuts:[number,number][]=[];
  const old=new Map<number,number>(),edges=new Map<string,number>();
  const score=new Float32Array(position.count);
  for(let i=0;i<position.count;i++){
    let weight=0;for(let j=0;j<4;j++)if(gillNames.has(mesh.skeleton.bones[si.getComponent(i,j)]?.name))weight+=sw.getComponent(i,j);
    const x=position.getX(i)-.10,y=position.getY(i)-.87,z=position.getZ(i)-1.49;
    const envelope=Math.hypot((x*.932+z*.363)/.64,y/.48,(-x*.363+z*.932)/.57);
    score[i]=Math.min(weight-.35,envelope-1.06);
  }
  const append=(a:number,b=a,t=0)=>{
    const id=cap.length;cap.push(0);
    for(const [name,attr] of fields){
      const target=data.get(name)!;
      if(name==='skinIndex'||name==='skinWeight')continue;
      for(let j=0;j<attr.itemSize;j++)target.push(T.MathUtils.lerp(attr.getComponent(a,j),attr.getComponent(b,j),t));
    }
    const combined=new Map<number,number>();
    for(const [v,factor] of [[a,1-t],[b,t]])for(let j=0;j<4;j++){
      const bone=si.getComponent(v,j),weight=sw.getComponent(v,j)*factor;
      combined.set(bone,(combined.get(bone)??0)+weight);
    }
    const influences=[...combined].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=influences.reduce((n,p)=>n+p[1],0)||1;
    for(let j=0;j<4;j++){data.get('skinIndex')!.push(influences[j]?.[0]??0);data.get('skinWeight')!.push((influences[j]?.[1]??0)/sum);}
    return id;
  };
  const original=(i:number)=>{let id=old.get(i);if(id===undefined){id=append(i);old.set(i,id);}return id;};
  const intersection=(a:number,b:number)=>{
    const key=a<b?`${a}:${b}`:`${b}:${a}`;let id=edges.get(key);
    if(id===undefined){id=append(a,b,score[a]/(score[a]-score[b]));edges.set(key,id);}return id;
  };
  const count=source.index?.count??position.count;
  for(let i=0;i<count;i+=3){
    const ids=[0,1,2].map(j=>source.index?source.index.getX(i+j):i+j),polygon:number[]=[],boundary:number[]=[];
    for(let j=0;j<3;j++){
      const a=ids[j],b=ids[(j+1)%3],inside=score[a]<=0,nextInside=score[b]<=0;
      if(inside)polygon.push(original(a));
      if(inside!==nextInside){const point=intersection(a,b);polygon.push(point);boundary.push(point);}
    }
    for(let j=1;j<polygon.length-1;j++)triangles.push(polygon[0],polygon[j],polygon[j+1]);
    if(boundary.length===2)cuts.push([boundary[0],boundary[1]]);
  }
  const p=data.get('position')!;
  const point=(id:number)=>new T.Vector3(p[id*3],p[id*3+1],p[id*3+2]);
  const welded=new Map<string,number>();
  const weld=(id:number)=>{const key=[p[id*3],p[id*3+1],p[id*3+2]].map(v=>Math.round(v*10000)).join(',');const found=welded.get(key);if(found!==undefined)return found;welded.set(key,id);return id;};
  const adjacency=new Map<number,Set<number>>(),remaining=new Set<string>();
  const edgeKey=(a:number,b:number)=>a<b?`${a}:${b}`:`${b}:${a}`;
  for(const [x,y] of cuts){const a=weld(x),b=weld(y);if(a===b)continue;remaining.add(edgeKey(a,b));if(!adjacency.has(a))adjacency.set(a,new Set());if(!adjacency.has(b))adjacency.set(b,new Set());adjacency.get(a)!.add(b);adjacency.get(b)!.add(a);}
  // The authored GLB has two tiny open seams through the gill roots. Bridge
  // only nearby odd endpoints; never connect separate anatomical regions.
  const odd=[...adjacency].filter(([,v])=>v.size%2).map(([id])=>id);
  while(odd.length>1){
    const a=odd.pop()!;let nearest=-1,distance=.025*.025;
    for(let i=0;i<odd.length;i++){const d=point(a).distanceToSquared(point(odd[i]));if(d<distance){distance=d;nearest=i;}}
    if(nearest<0)continue;
    const b=odd.splice(nearest,1)[0];adjacency.get(a)!.add(b);adjacency.get(b)!.add(a);remaining.add(edgeKey(a,b));
  }
  let closedLoops=0,openLoops=0;
  while(remaining.size){
    const first=remaining.values().next().value!;const [start,next]=first.split(':').map(Number);remaining.delete(first);
    const loop=[start,next];let current=next;
    while(current!==start&&loop.length<=cuts.length+2){
      const candidate=[...(adjacency.get(current)??[])].find(n=>remaining.has(edgeKey(current,n)));
      if(candidate===undefined)break;
      remaining.delete(edgeKey(current,candidate));current=candidate;if(current!==start)loop.push(current);
    }
    if(current!==start||loop.length<3){openLoops++;continue;}
    const center=loop.reduce((v,i)=>v.add(point(i)),new T.Vector3()).multiplyScalar(1/loop.length);
    const normal=center.clone().sub(new T.Vector3(.10,.87,1.49)).normalize();
    const tangent=new T.Vector3(0,1,0).cross(normal).normalize();
    if(tangent.lengthSq()<.1)tangent.set(1,0,0);
    const up=normal.clone().cross(tangent).normalize();
    const contour=loop.map(i=>{const v=point(i).sub(center);return new T.Vector2(v.dot(tangent),v.dot(up));});
    const faces=T.ShapeUtils.triangulateShape(contour,[]);
    const duplicates=loop.map(i=>{
      const id=cap.length;cap.push(1);
      for(const [name,attr]of fields){const a=data.get(name)!;for(let j=0;j<attr.itemSize;j++)a.push(a[i*attr.itemSize+j]);}
      return id;
    });
    for(const [a,b,c]of faces){
      const va=point(duplicates[a]),vb=point(duplicates[b]),vc=point(duplicates[c]);
      const forward=vb.sub(va).cross(vc.sub(va)).dot(normal)>0;
      triangles.push(duplicates[a],duplicates[forward?b:c],duplicates[forward?c:b]);
    }
    closedLoops++;
  }
  const geometry=new T.BufferGeometry();
  for(const [name,attr]of fields){const values=data.get(name)!;geometry.setAttribute(name,name==='skinIndex'?new T.Uint16BufferAttribute(values,attr.itemSize):new T.Float32BufferAttribute(values,attr.itemSize));}
  geometry.setAttribute('axolotlGillCap',new T.Float32BufferAttribute(cap,1));geometry.setIndex(triangles);geometry.computeVertexNormals();
  geometry.userData.gillTopology={closedLoops,openLoops};
  // Refuse a partial operation: an open cut must never be shown to the user.
  if(openLoops){geometry.dispose();throw new Error(`Gill topology has ${openLoops} unclosed cuts`);}
  source.dispose();mesh.geometry=geometry;
}
