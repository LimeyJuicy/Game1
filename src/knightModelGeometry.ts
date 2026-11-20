import * as THREE from 'three';

type Ring = [number, number, number, number];
interface ModelTools {
  bones: THREE.Bone[];
  add: (geometry: THREE.BufferGeometry, bone: THREE.Bone, material: string) => void;
  joint: (name: string, parent: THREE.Object3D, x?: number, y?: number, z?: number) => THREE.Bone;
}

/** Static reference-driven armor surfaces. Coordinates follow the existing native rig (-Z front). */
export function buildKnightModel({ bones, add, joint }: ModelTools) {
  const bone = (name: string) => bones.find(bone => bone.name === name)!;
  const pelvis = bone('Pelvis'), chest = bone('Chest'), neck = bone('Neck'), head = bone('Head');
  function surface(owner: THREE.Bone, material: string, rows: number, columns: number, sample: (u: number, v: number) => THREE.Vector3) {
    const points: number[] = [], uv: number[] = [], indices: number[] = [];
    for (let row=0;row<=rows;row++) for(let col=0;col<=columns;col++) {
      const u=col/columns,v=row/rows,p=sample(u,v);points.push(p.x,p.y,p.z);uv.push(u,v);
      if(row<rows&&col<columns){const a=row*(columns+1)+col,b=a+columns+1;indices.push(a,a+1,b,b,a+1,b+1);}
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();add(geometry,owner,material);
  }
  function at(profile: Ring[], t: number): Ring {
    const f=t*(profile.length-1),i=Math.min(profile.length-2,Math.floor(f)),v=f-i;
    return profile[i].map((x,k)=>THREE.MathUtils.lerp(x,profile[i+1][k],v)) as Ring;
  }
  function loft(owner: THREE.Bone, material: string, profile: Ring[], crease=0, start=0, sweep=Math.PI*2) {
    surface(owner,material,(profile.length-1)*4,40,(u,v)=>{
      const [y,w,d,z]=at(profile,v),a=start+u*sweep,c=Math.cos(a);
      return new THREE.Vector3(Math.sin(a)*w*(material==='mail'?.88:1),y,c*d*(material==='mail'?.88:1)+z-crease*Math.max(0,-c)**8);
    });
  }
  function line(owner: THREE.Bone, material: string, points: THREE.Vector3[], radius=.0018) {
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.max(12,points.length*4),radius,5,false),owner,material);
  }
  function rivet(owner: THREE.Bone,x:number,y:number,z:number,r=.0035) {
    const geometry=new THREE.SphereGeometry(r,8,6);geometry.scale(1,1,.45);geometry.translate(x,y,z);add(geometry,owner,'edge');
  }
  function buckle(owner: THREE.Bone,x:number,y:number,z:number,w:number,h:number) {
    const frame=new THREE.Shape();frame.moveTo(-w/2,-h/2);frame.lineTo(w/2,-h/2);frame.lineTo(w/2,h/2);frame.lineTo(-w/2,h/2);frame.closePath();
    const hole=new THREE.Path();hole.moveTo(-w/2+.005,-h/2+.005);hole.lineTo(-w/2+.005,h/2-.005);hole.lineTo(w/2-.005,h/2-.005);hole.lineTo(w/2-.005,-h/2+.005);hole.closePath();frame.holes.push(hole);
    const g=new THREE.ExtrudeGeometry(frame,{depth:.004,bevelEnabled:true,bevelThickness:.0015,bevelSize:.0015,bevelSegments:1,steps:1});g.translate(x,y,z);add(g,owner,'edge');
    const pin=new THREE.BoxGeometry(w*.65,.003,.004);pin.translate(x,y,z-.002);add(pin,owner,'edge');
  }
  // Body layers follow the ribcage and fitted waist, rather than a stack of separate solids.
  loft(pelvis,'mail',[[-.05,.185,.126,0],[.10,.175,.119,0],[.24,.202,.139,0],[.39,.225,.147,0],[.53,.180,.101,0]]);
  const breast:Ring[]=[[-.30,.163,.115,0],[-.22,.171,.124,0],[-.11,.208,.150,.004],[.015,.224,.151,.005],[.11,.205,.126,.003],[.16,.154,.100,0]];
  loft(chest,'steel',breast,.012);
  // Rolled neckline, waist edge and lower fauld lames.
  for(let i=0;i<3;i++)loft(pelvis,'steel',[[.045+i*.037,.199-i*.006,.137,0],[.075+i*.037,.194-i*.006,.133,0]],.006);
  loft(neck,'mail',[[-.13,.093,.077,0],[.03,.080,.067,0]]);
  loft(neck,'steel',[[-.115,.157,.114,-.004],[-.085,.140,.103,-.002],[-.025,.094,.083,0],[.005,.089,.077,0]],.006);
  for(const side of [-1,1])for(let i=0;i<4;i++)rivet(neck,side*(.035+i*.027),-.096,-.112+Math.abs(i)*.003);
  // Pointed helmet bowl, shaped cheek/chin and a continuous visor opening.
  loft(head,'steel',[[-.095,.070,.073,.012],[-.050,.091,.089,.009],[.025,.105,.114,-.010],[.10,.101,.103,0],[.151,.071,.078,.015],[.185,.003,.009,.018]],.003);
  const visorZ=(u:number,v:number)=>-.025-.115*Math.max(0,1-u*u)**.65+.018*v;
  surface(head,'steel',14,40,(u,v)=>{const x=u*2-1;return new THREE.Vector3(x*THREE.MathUtils.lerp(.107,.068,v),THREE.MathUtils.lerp(.025,-.095,v),visorZ(x,v));});
  surface(head,'dark',2,40,(u,v)=>{const x=u*2-1;return new THREE.Vector3(x*.107,.044-v*.016,visorZ(x,0)-.002);});
  line(head,'edge',Array.from({length:21},(_,i)=>{const u=i/10-1;return new THREE.Vector3(u*.108,.048,visorZ(u,0)-.002);}),.0024);
  surface(head,'steel',8,40,(u,v)=>{
    const x=u*2-1,y=.049+.067*v;
    const brow=visorZ(x,0)-.001,upper=-.003-.104*Math.sqrt(Math.max(0,1-x*x));
    return new THREE.Vector3(x*THREE.MathUtils.lerp(.108,.099,v),y,THREE.MathUtils.lerp(brow,upper,v));
  });
  line(head,'edge',[new THREE.Vector3(0,.07,-.103),new THREE.Vector3(0,.15,-.065),new THREE.Vector3(0,.190,.018),new THREE.Vector3(0,.147,.085),new THREE.Vector3(0,.05,.115)],.003);
  for(const side of [-1,1]) {
    rivet(head,side*.103,.023,-.025,.006);
    // Small lateral breathing slots, kept off the central face ridge.
    for(let i=0;i<3;i++){
      const x=side*(.053+i*.012),g=new THREE.BoxGeometry(.0035,.012,.002);
      g.translate(x,-.034,visorZ(x/THREE.MathUtils.lerp(.107,.068,.49),.49)-.0015);add(g,head,'dark');
    }
  }
  // Surcoat follows the armor, with narrow stitched borders, not a rectangular bib.
  function chestPoint(x:number,y:number,direction:number,offset=.008) {
    let i=0;while(i<breast.length-2&&breast[i+1][0]<y)i++;
    const a=breast[i],b=breast[i+1],t=THREE.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1);
    const w=THREE.MathUtils.lerp(a[1],b[1],t),d=THREE.MathUtils.lerp(a[2],b[2],t),z=THREE.MathUtils.lerp(a[3],b[3],t);
    return new THREE.Vector3(x,y,z+direction*(d*Math.sqrt(Math.max(.01,1-(x/w)**2))+.012*Math.max(0,1-(x/w)**2)**4+offset));
  }
  for(const direction of [-1,1]) {
    surface(chest,'cloth',44,28,(u,v)=>{const y=.132-v*.52,w=.134-.018*v;return chestPoint((u*2-1)*w,y,direction);});
    for(const side of [-1,1])line(chest,'trim',Array.from({length:35},(_,i)=>{const v=i/34;return chestPoint(side*(.130-.018*v),.132-v*.52,direction,.0095);}),.0018);
  }
  // Belt, square buckle, side bracing and upper skirt hardware.
  loft(pelvis,'leather',[[.035,.185,.132,-.003],[.079,.181,.130,-.003]]);
  buckle(pelvis,.024,.057,-.141,.064,.051);
  for(let i=0;i<5;i++)rivet(pelvis,-.037-i*.023,.057,-.139+i*.006,.0025);
  for(const side of [-1,1])for(let i=0;i<3;i++) {
    const y=-.09-i*.065,x=side*(.199-i*.010),strap=new THREE.BoxGeometry(.036,.016,.006);strap.translate(x,y,-.084);add(strap,chest,'leather');
    rivet(chest,x-side*.009,y,-.089,.0027);
  }
  // Chainmail wraps the hips with a split at the front and rear.
  for(const side of [-1,1]) {
    const hip=bone(`${side} Hip`);
    surface(hip,'mail',32,44,(u,v)=>{
      const angle=(side>0?0:Math.PI)+.045+u*(Math.PI-.09),radius=.198+.043*v;
      return new THREE.Vector3(Math.sin(angle)*radius-side*.135,.035-.45*v,Math.cos(angle)*radius*.70);
    });
    for(const direction of [-1,1]) {
      const panel=(u:number,v:number,extra=0)=>new THREE.Vector3(side*(.067+.012*v)+(u-.5)*(.118+.006*v),.074-.825*v,direction*(.177+.022*v+.009*Math.sin(v*7+side*.4)*Math.sin(u*Math.PI)+extra));
      surface(pelvis,'cloth',60,16,(u,v)=>panel(u,v));
      for(const u of [.045,.955])line(pelvis,'trim',Array.from({length:50},(_,i)=>panel(u,i/49,.0015)),.0016);
      line(pelvis,'trim',Array.from({length:20},(_,i)=>panel(i/19,.978,.0015)),.0025);
      // A folded cloth edge gives the hem thickness in silhouette.
      line(pelvis,'cloth',Array.from({length:50},(_,i)=>panel(0,i/49)),.0025);
      line(pelvis,'cloth',Array.from({length:50},(_,i)=>panel(1,i/49)),.0025);
    }
  }
  // Custom shoulder caps/lames, arm harness, winged couters and fitted greaves.
  for(const side of [-1,1]) {
    const shoulder=bone(`${side} Shoulder`),elbow=bone(`${side} Elbow`),forearm=bone(`${side} Forearm twist`),hand=bone(`${side} Hand`);
    const hip=bone(`${side} Hip`),knee=bone(`${side} Knee`),ankle=bone(`${side} Ankle`);
    loft(shoulder,'mail',[[-.30,.053,.055,0],[-.16,.070,.068,0],[-.02,.079,.075,0],[.06,.072,.069,0]]);
    surface(shoulder,'steel',24,48,(u,v)=>{
      const a=u*Math.PI*2,t=.13+v*1.55;
      return new THREE.Vector3(side*.010+Math.sin(a)*.136*Math.sin(t),.072*Math.cos(t)-.020*v+side*Math.sin(a)*.015,Math.cos(a)*.136*Math.sin(t));
    });
    const edge=Array.from({length:49},(_,i)=>{const a=i/48*Math.PI*2;return new THREE.Vector3(side*.010+Math.sin(a)*.135,-.030+side*Math.sin(a)*.015,Math.cos(a)*.135);});line(shoulder,'edge',edge,.0026);
    for(let i=0;i<4;i++) {
      const y=-.026-i*.030;
      loft(shoulder,'steel',[[y-.043,.115-i*.007,.112-i*.004,.002],[y,.121-i*.007,.116-i*.004,0]],.004,side>0?-.17:Math.PI-.17,Math.PI+.34);
      for(const f of [.18,.82]){const a=(side>0?-.17:Math.PI-.17)+f*(Math.PI+.34);rivet(shoulder,Math.sin(a)*(.118-i*.007),y-.027,Math.cos(a)*(.116-i*.004)-.002,.003);}
    }
    loft(shoulder,'steel',[[-.30,.055,.057,0],[-.25,.061,.063,0],[-.17,.068,.071,0]],.004);
    loft(elbow,'mail',[[-.08,.052,.055,0],[.05,.055,.057,0]]);
    // A couter is a shaped front plate and pointed outer wing, not a ball joint.
    surface(elbow,'steel',20,24,(u,v)=>{
      const x=(u*2-1)*(.047+.013*Math.sin(v*Math.PI)),y=.050-v*.108;
      return new THREE.Vector3(x,y,-.035-.043*Math.sin(u*Math.PI)*Math.sin(v*Math.PI));
    });
    const wingShape=new THREE.Shape();wingShape.moveTo(0,.052);wingShape.quadraticCurveTo(.083,.035,.112,-.006);wingShape.quadraticCurveTo(.065,-.069,0,-.052);wingShape.closePath();
    const wing=new THREE.ExtrudeGeometry(wingShape,{depth:.006,bevelEnabled:true,bevelThickness:.002,bevelSize:.002,bevelSegments:1,steps:1});wing.rotateY(side*Math.PI/2);wing.translate(side*.044,0,.004);add(wing,elbow,'steel');
    loft(forearm,'mail',[[-.315,.036,.040,0],[.01,.050,.054,0]]);
    loft(forearm,'steel',[[-.300,.037,.044,-.002],[-.257,.045,.049,0],[-.115,.064,.064,.004],[-.025,.057,.059,0]],.007);
    for(const y of [-.07,-.24]) {loft(forearm,'leather',[[y-.010,.066+(y+.07)*.12,.064+(y+.07)*.12,0],[y+.010,.066+(y+.07)*.12,.064+(y+.07)*.12,0]]);buckle(forearm,side*.032,y,-(.066+(y+.07)*.12),.028,.026);}
    // Gauntlet cuff, fitted metacarpal shell and independently jointed finger plates.
    loft(hand,'steel',[[-.034,.046,.030,0],[.012,.050,.036,0],[.045,.060,.044,0]],.003);
    loft(hand,'leather',[[-.085,.034,.024,0],[-.045,.043,.026,0],[-.005,.040,.026,0]]);
    surface(hand,'steel',14,20,(u,v)=>new THREE.Vector3((u*2-1)*(.041-.009*v),-.012-v*.070,-.021-.010*Math.sin(u*Math.PI)));
    for(let f=0;f<4;f++) {
      const length=[.031,.035,.033,.026][f],x=(f-1.5)*.019;
      let digit=joint(`${side} Finger ${f}`,hand,x,-.078,-.001);digit.rotation.x=.16;
      for(let part=0;part<3;part++) {
        loft(digit,'leather',[[-length,.007,.007,0],[0,.008,.008,0]]);
        surface(digit,'steel',4,8,(u,v)=>new THREE.Vector3((u*2-1)*.008,-v*length*.88,-.006-.003*Math.sin(u*Math.PI)));
        if(part<2){digit=joint(`${side} Finger ${f} ${part}`,digit,0,-length,0);digit.rotation.x=.22;}
      }
    }
    const thumb=joint(`${side} Thumb`,hand,side*.041,-.030,.003);thumb.rotation.z=side*.52;thumb.rotation.x=.25;
    loft(thumb,'leather',[[-.039,.010,.010,0],[0,.014,.012,0]]);
    loft(thumb,'steel',[[-.030,.011,.011,-.003],[0,.014,.013,-.002]]);
    const tip=joint(`${side} Thumb tip`,thumb,0,-.035,0);tip.rotation.x=.4;loft(tip,'steel',[[-.025,.007,.009,0],[0,.011,.011,0]]);
    loft(hip,'mail',[[-.44,.063,.061,0],[-.18,.092,.087,0],[.03,.098,.095,0]]);
    loft(hip,'steel',[[-.36,.065,.067,-.005],[-.29,.078,.081,-.003],[-.09,.096,.090,0]],.009);
    surface(knee,'steel',24,28,(u,v)=>{const x=(u*2-1)*(.049+.019*Math.sin(v*Math.PI));return new THREE.Vector3(x,.070-v*.140,-.037-.044*Math.sin(u*Math.PI)*Math.sin(v*Math.PI));});
    for(let i=0;i<2;i++)loft(knee,'steel',[[-.070-i*.027,.067,.070,-.005],[-.047-i*.027,.072,.076,-.003]],.010,Math.PI*.5,Math.PI);
    loft(knee,'mail',[[-.39,.041,.043,0],[0,.058,.062,0]]);
    loft(knee,'steel',[[-.39,.044,.049,0],[-.30,.047,.053,0],[-.16,.062,.063,.009],[-.055,.067,.065,.005]],.012);
    for(const y of [-.10,-.28]) {rivet(knee,side*(y<-.2?.048:.061),y,-.015,.003);}
    loft(ankle,'leather',[[-.085,.048,.055,.009],[.030,.043,.047,0]]);
    // Sabaton lames follow a shaped toe/instep volume; each is an open top plate.
    for(let i=0;i<7;i++)surface(ankle,i%3===0?'edge':'steel',6,24,(u,v)=>{
      const t=(i+v*1.10)/7,z=.053-t*.337,width=.049+.013*Math.sin(Math.min(1,t)*Math.PI)-.027*Math.max(0,(t-.72)/.38);
      const a=-Math.PI*.53+u*Math.PI*1.06,top=.018-.091*Math.min(1,t),floor=-.112;
      return new THREE.Vector3(Math.sin(a)*width,floor+Math.cos(a)*(top-floor),z);
    });
    const toeCap=new THREE.SphereGeometry(1,20,12);toeCap.scale(.025,.019,.030);toeCap.translate(0,-.095,-.284);add(toeCap,ankle,'steel');
    const sole=new THREE.BoxGeometry(.086,.015,.235,1,1,4);sole.translate(0,-.112,-.074);add(sole,ankle,'leather');
  }
  // Bat heraldry is paint conforming to the chest, with spread claws.
  const shape=new THREE.Shape();const points=[[0,.068],[.017,.082],[.024,.050],[.060,.085],[.129,.109],[.110,.018],[.085,.039],[.061,-.007],[.036,.015],[.019,-.044],[0,-.067],[-.019,-.044],[-.036,.015],[-.061,-.007],[-.085,.039],[-.110,.018],[-.129,.109],[-.060,.085],[-.024,.050],[-.017,.082]];
  points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
  const shapes=[shape];for(const side of [-1,1]){const claw=new THREE.Shape();[[.009,-.03],[.025,-.042],[.041,-.060],[.060,-.050],[.064,-.058],[.047,-.072],[.054,-.088],[.047,-.091],[.036,-.075],[.027,-.093],[.021,-.090],[.023,-.065],[.009,-.050]].forEach(([x,y],i)=>i?claw.lineTo(side*x,y):claw.moveTo(side*x,y));claw.closePath();shapes.push(claw);}
  let heraldry:THREE.BufferGeometry=new THREE.ShapeGeometry(shapes).toNonIndexed();
  for(let pass=0;pass<3;pass++){
    const p=heraldry.getAttribute('position'),values:number[]=[];
    for(let i=0;i<p.count;i+=3){const a=new THREE.Vector3().fromBufferAttribute(p,i),b=new THREE.Vector3().fromBufferAttribute(p,i+1),c=new THREE.Vector3().fromBufferAttribute(p,i+2),ab=a.clone().lerp(b,.5),bc=b.clone().lerp(c,.5),ca=c.clone().lerp(a,.5);for(const v of [a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca])values.push(v.x,v.y,v.z);}
    heraldry.dispose();heraldry=new THREE.BufferGeometry();heraldry.setAttribute('position',new THREE.Float32BufferAttribute(values,3));
  }
  const hp=heraldry.getAttribute('position');for(let i=0;i<hp.count;i++){const p=chestPoint(hp.getX(i)*.82,hp.getY(i)-.013,-1,.012);hp.setXYZ(i,p.x,p.y,p.z);}heraldry.computeVertexNormals();add(heraldry,chest,'dark');
}
