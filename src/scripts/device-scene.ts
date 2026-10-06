import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// A stylized product study, built locally; no manufacturer CAD or remote assets.
export async function createDeviceScene(host: HTMLElement) {
  const svg = host.querySelector<SVGSVGElement>('.device-svg')!;
  const surface = document.createElement('canvas');
  const context = surface.getContext('webgl2', { alpha: true, antialias: true, powerPreference: 'low-power' });
  if (!context) throw Error('WebGL unavailable');
  const renderer = new THREE.WebGLRenderer({ canvas: surface, context, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .9;
  const canvas = renderer.domElement;
  canvas.className = 'device-canvas'; canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 30);
  camera.position.z = 8.7;
  const environmentScene = new RoomEnvironment();
  const generator = new THREE.PMREMGenerator(renderer);
  const environment = generator.fromScene(environmentScene, .04, .1, 100, {size:64});
  scene.environment = environment.texture; scene.environmentIntensity = .32; environmentScene.dispose(); generator.dispose();
  const model = new THREE.Group(); scene.add(model); model.position.y = .42;
  const bodyMaterial = new THREE.MeshPhysicalMaterial({ color: 0x30323c, metalness: .22, roughness: .34, clearcoat: .35, clearcoatRoughness: .4 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(2.62, 5.2, .4, 4, .21), bodyMaterial); model.add(body);
  const rear = new THREE.Mesh(new RoundedBoxGeometry(2.5, 5.06, .16, 3, .17), new THREE.MeshStandardMaterial({ color: 0x171920, roughness: .55 })); rear.position.z = -.19; model.add(rear);
  const railMaterial = new THREE.MeshStandardMaterial({ color: 0x636570, metalness: .45, roughness: .32 });
  for (const side of [-1,1]) {
    const rail = new THREE.Mesh(new RoundedBoxGeometry(.04,4.7,.035,2,.014),railMaterial);rail.position.set(side*1.29,0,.06);model.add(rail);
  }
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns','http://www.w3.org/2000/svg'); clone.setAttribute('width','1120'); clone.setAttribute('height','2120');
  clone.removeAttribute('class'); clone.querySelectorAll(':scope > g').forEach(group=>group.remove());
  const image = new Image();
  const imageUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
  try { await new Promise<void>((resolve,reject)=>{ image.onload=()=>resolve();image.onerror=reject;image.src=imageUrl; }); }
  catch { renderer.dispose(); canvas.remove(); environment.dispose(); throw Error('Illustration unavailable'); }
  const art = document.createElement('canvas');art.width=1120;art.height=2120;
  art.getContext('2d')!.drawImage(image,0,0,art.width,art.height);
  const faceTexture = new THREE.CanvasTexture(art);faceTexture.colorSpace=THREE.SRGBColorSpace;faceTexture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  const face = new THREE.Mesh(new THREE.PlaneGeometry(2.8,5.3),new THREE.MeshPhysicalMaterial({map:faceTexture,transparent:true,roughness:.7,metalness:.08,clearcoat:.16,depthWrite:false}));face.position.z=.205;model.add(face);
  const screenGlass = new THREE.Mesh(new THREE.PlaneGeometry(2.16,.94),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.035,depthWrite:false}));screenGlass.position.set(0,1.35,.22);model.add(screenGlass);
  const keys = ['SHIFT','ALPHA','▲','MODE','ON','x⁻¹','nCr','Pol(','x³','a b/c','√','x²','^','log','ln','(-)','°′″','hyp','sin','cos','tan','RCL','(',')','S⇔D'];
  const numbers = ['7','8','9','DEL','AC','4','5','6','×','÷','1','2','3','+','−','0','.','×10ˣ','Ans','='];
  const smallGeometry = new RoundedBoxGeometry(.37,.21,.075,3,.045);
  const bigGeometry = new RoundedBoxGeometry(.4,.25,.09,3,.05);
  const darkKey = new THREE.MeshPhysicalMaterial({color:0x454752,roughness:.42,clearcoat:.4});
  const lightKey = new THREE.MeshPhysicalMaterial({color:0xc5c5ce,roughness:.46,clearcoat:.25});
  const purpleKey = new THREE.MeshPhysicalMaterial({color:0x9c83d3,roughness:.42,clearcoat:.35});
  const atlas = document.createElement('canvas');atlas.width=960;atlas.height=864;
  const ctx=atlas.getContext('2d')!;ctx.textAlign='center';ctx.textBaseline='middle';
  const letteringGeometry: THREE.BufferGeometry[]=[];
  const smallKeys = new THREE.InstancedMesh(smallGeometry,darkKey,25);model.add(smallKeys);
  const whiteKeys = new THREE.InstancedMesh(bigGeometry,lightKey,15);model.add(whiteKeys);
  const grayKeys = new THREE.InstancedMesh(bigGeometry,darkKey,3);model.add(grayKeys);
  const accentKeys = new THREE.InstancedMesh(bigGeometry,purpleKey,2);model.add(accentKeys);
  const matrix=new THREE.Matrix4();let white=0,gray=0,accent=0;
  function addKey(label:string,index:number,numeric:boolean) {
    const col=index%5,row=Math.floor(index/5),atlasRow=row+(numeric?5:0);
    const x=((numeric?45:45.5)+col*47-140)/100, y=(265-((numeric?400.5:236.5)+row*(numeric?30:31)))/100;
    const purple=label==='DEL'||label==='AC',light=numeric&&col!==4&&!purple;
    const group=numeric?(purple?accentKeys:light?whiteKeys:grayKeys):smallKeys;
    group.setMatrixAt(numeric?(purple?accent++:light?white++:gray++):index,matrix.makeTranslation(x,y,.25));
    ctx.fillStyle=light?'#242630':'#f0edf8';ctx.font=`${numeric?'600':'500'} ${label.length>3?28:numeric?42:34}px Arial`;ctx.fillText(label,col*192+96,atlasRow*96+49);
    const geometry=new THREE.PlaneGeometry(numeric?.35:.33,numeric?.19:.17);
    const uv=geometry.attributes.uv;
    for(let vertex=0;vertex<uv.count;vertex++)uv.setXY(vertex,(col+uv.getX(vertex))/5,1-(atlasRow+1-uv.getY(vertex))/9);
    geometry.translate(x,y,numeric?.302:.294);letteringGeometry.push(geometry);
  }
  keys.forEach((label,index)=>addKey(label,index,false));numbers.forEach((label,index)=>addKey(label,index,true));
  whiteKeys.count=white;grayKeys.count=gray;accentKeys.count=accent;
  [smallKeys,whiteKeys,grayKeys,accentKeys].forEach(group=>group.instanceMatrix.needsUpdate=true);
  const keyTexture=new THREE.CanvasTexture(atlas);keyTexture.colorSpace=THREE.SRGBColorSpace;
  model.add(new THREE.Mesh(mergeGeometries(letteringGeometry)!,new THREE.MeshBasicMaterial({map:keyTexture,transparent:true,depthWrite:false})));
  letteringGeometry.forEach(geometry=>geometry.dispose());
  const light = new THREE.DirectionalLight(0xf5edff, 2.1);light.position.set(-3,5,5);scene.add(light);
  const rim = new THREE.PointLight(0xb09aff, 6, 12);rim.position.set(3,1,2);scene.add(rim);
  const fill = new THREE.DirectionalLight(0xe3efff,.6);fill.position.set(4,-3,3);scene.add(fill);
  const diagnostics=context.getExtension('WEBGL_debug_renderer_info');
  const software=diagnostics && /swiftshader|llvmpipe|software/i.test(context.getParameter(diagnostics.UNMASKED_RENDERER_WEBGL));
  const frameInterval=1000/(software?12:innerWidth<700?24:30);
  let lastDraw=0;
  let targetX=0,targetY=0,currentX=0,currentY=0,scroll=0,visible=true,frame=0,previous=0,start=0,disposed=false,contextLost=false;
  let animated=!matchMedia('(prefers-reduced-motion: reduce)').matches;
  const resize=new ResizeObserver(()=>{const {width,height}=host.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.position.z=width<420?10.2:8.7;camera.updateProjectionMatrix();wake();});resize.observe(host);
  function render(now:number) {
    frame=0;if(disposed||contextLost||!visible||document.hidden)return;
    if(animated&&(now-lastDraw<frameInterval||document.querySelector('dialog[open]'))){frame=requestAnimationFrame(render);return;}lastDraw=now;
    const delta=Math.min((now-previous)/1000,.08)||.016;previous=now;if(!start)start=now;
    const blend=1-Math.exp(-delta*7);currentX+=(targetX-currentX)*blend;currentY+=(targetY-currentY)*blend;
    const elapsed=(now-start)/1000;
    model.rotation.set(-.05+currentY*.18+scroll*.04,-.18+currentX*.38,-.12+currentX*.04);
    model.position.y=(host.clientWidth<420?.55:.42)+(animated?Math.sin(elapsed*.7)*.035:0)+scroll*.06;
    light.position.x=-3+currentX*3;rim.position.y=1+currentY*2;
    renderer.render(scene,camera);host.dataset.webgl='ready';
    if(animated)frame=requestAnimationFrame(render);
  }
  function wake(){if(!frame&&!disposed&&!contextLost&&visible&&!document.hidden){previous=performance.now();frame=requestAnimationFrame(render);}}
  const pointer=(event:PointerEvent)=>{if(!animated || (event.pointerType==='touch'&&!event.buttons))return;const rect=host.getBoundingClientRect();targetX=Math.max(-1,Math.min(1,(event.clientX-rect.left)/rect.width*2-1));targetY=Math.max(-1,Math.min(1,(event.clientY-rect.top)/rect.height*2-1));wake();};
  const reset=()=>{targetX=targetY=0;wake();};
  const keyboard=(event:KeyboardEvent)=>{if(!animated||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Escape'].includes(event.key))return;event.preventDefault();if(event.key==='Escape')reset();if(event.key==='ArrowLeft')targetX=Math.max(-1,targetX-.25);if(event.key==='ArrowRight')targetX=Math.min(1,targetX+.25);if(event.key==='ArrowUp')targetY=Math.max(-1,targetY-.25);if(event.key==='ArrowDown')targetY=Math.min(1,targetY+.25);wake();};
  const touch=(event:PointerEvent)=>{if(event.pointerType==='touch'&&!((event.target as Element).closest('a,button')))host.setPointerCapture(event.pointerId);};
  const onScroll=()=>{scroll=Math.max(-1,Math.min(1,-host.getBoundingClientRect().top/window.innerHeight));};
  const onVisibility=()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else wake();};
  const observe=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)wake();else{cancelAnimationFrame(frame);frame=0;}},{threshold:0});observe.observe(host);
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const change=()=>{animated=!preference.matches;targetX=targetY=currentX=currentY=0;cancelAnimationFrame(frame);frame=0;wake();};preference.addEventListener('change',change);
  const lost=(event:Event)=>{event.preventDefault();contextLost=true;canvas.style.visibility='hidden';host.dataset.webgl='fallback';cancelAnimationFrame(frame);frame=0;};
  const restored=()=>{contextLost=false;canvas.style.visibility='';host.dataset.webgl='ready';wake();};
  canvas.addEventListener('webglcontextlost',lost);canvas.addEventListener('webglcontextrestored',restored);
  host.addEventListener('pointermove',pointer);host.addEventListener('pointerleave',reset);host.addEventListener('pointercancel',reset);host.addEventListener('pointerdown',touch);host.addEventListener('keydown',keyboard);
  window.addEventListener('scroll',onScroll,{passive:true});document.addEventListener('visibilitychange',onVisibility);
  wake();
  return () => {
    disposed=true;cancelAnimationFrame(frame);resize.disconnect();observe.disconnect();preference.removeEventListener('change',change);
    host.removeEventListener('pointermove',pointer);host.removeEventListener('pointerleave',reset);host.removeEventListener('pointercancel',reset);host.removeEventListener('pointerdown',touch);host.removeEventListener('keydown',keyboard);
    window.removeEventListener('scroll',onScroll);document.removeEventListener('visibilitychange',onVisibility);
    scene.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();const materials=Array.isArray(object.material)?object.material:[object.material];materials.forEach(material=>material.dispose());}});
    faceTexture.dispose();keyTexture.dispose();environment.dispose();renderer.dispose();canvas.remove();delete host.dataset.webgl;
  };
}
