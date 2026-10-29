export interface PixelTexture { width: number; height: number; data: Uint8ClampedArray }
export type Vec3 = readonly [number, number, number];
export type Uv = readonly [number, number];
export interface ItemMeshFace {
  vertices: readonly [Vec3, Vec3, Vec3, Vec3];
  /** Original texture pixel coordinates, not normalized UVs. */
  uv: readonly [Uv, Uv, Uv, Uv];
  texture?: string;
  normal?: Vec3;
  brightness?: number;
}
export interface ItemMesh {
  faces: readonly ItemMeshFace[];
  /** Reference bounds keep a half slab at the same scale as a full cube. */
  bounds?: readonly [Vec3, Vec3];
}
export interface ItemCamera { yaw?: number; pitch?: number; zoom?: number; offsetX?: number; offsetY?: number; padding?: number }
export interface ItemLighting { top?: number; left?: number; right?: number; bottom?: number }

/** Original uncompressed/RLE true-color TGA decoder. No thresholding of alpha. */
export function decodeTga(buffer: ArrayBuffer): PixelTexture {
  const bytes = new Uint8Array(buffer), view = new DataView(buffer);
  if (bytes.length < 18 || bytes[1] !== 0 || ![2, 10].includes(bytes[2]!)) throw new Error('Unsupported TGA image type.');
  const width = view.getUint16(12, true), height = view.getUint16(14, true), depth = bytes[16]!;
  if (!width || !height || width * height > 4194304 || ![24, 32].includes(depth)) throw new Error('Invalid TGA dimensions or pixel depth.');
  const channels = depth / 8, pixels = width * height, data = new Uint8ClampedArray(pixels * 4);
  let cursor = 18 + bytes[0]!, index = 0;
  const write = (source: number) => {
    if (source + channels > bytes.length || index >= pixels) throw new Error('Truncated TGA pixel data.');
    const x = index % width, y = Math.floor(index / width), targetX = bytes[17]! & 16 ? width - 1 - x : x;
    const targetY = bytes[17]! & 32 ? y : height - 1 - y, target = (targetY * width + targetX) * 4;
    data[target] = bytes[source + 2]!; data[target + 1] = bytes[source + 1]!; data[target + 2] = bytes[source]!;
    data[target + 3] = channels === 4 ? bytes[source + 3]! : 255; index++;
  };
  while (index < pixels) {
    if (bytes[2] === 2) { write(cursor); cursor += channels; continue; }
    if (cursor >= bytes.length) throw new Error('Truncated TGA RLE packet.');
    const packet = bytes[cursor++]!, count = (packet & 127) + 1;
    if (index + count > pixels) throw new Error('TGA RLE packet exceeds image bounds.');
    if (packet & 128) { for (let i = 0; i < count; i++) write(cursor); cursor += channels; }
    else for (let i = 0; i < count; i++) { write(cursor); cursor += channels; }
  }
  return { width, height, data };
}

const textureCache = new Map<string, Promise<PixelTexture>>();
export function loadTexture(url: string): Promise<PixelTexture> {
  const cached = textureCache.get(url); if (cached) return cached;
  const task = (async () => {
    const response = await fetch(url); if (!response.ok) throw new Error(`Texture HTTP ${response.status}: ${url}`);
    const buffer = await response.arrayBuffer();
    if (!new Uint8Array(buffer).subarray(0, 8).every((byte, index) => byte === [137, 80, 78, 71, 13, 10, 26, 10][index])) return decodeTga(buffer);
    const bitmap = await createImageBitmap(new Blob([buffer], { type: 'image/png' }));
    const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas2D unavailable.');
    context.drawImage(bitmap, 0, 0); bitmap.close();
    return { width: canvas.width, height: canvas.height, data: context.getImageData(0, 0, canvas.width, canvas.height).data };
  })();
  textureCache.set(url, task); return task;
}

export function cuboid(min: Vec3, max: Vec3, texture = 'all', atlas?: readonly [number, number]): ItemMeshFace[] {
  const [x0, y0, z0] = min, [x1, y1, z1] = max, dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
  const definitions: { vertices: ItemMeshFace['vertices']; normal: Vec3; rectangle?: readonly [number, number, number, number] }[] = [
    { vertices: [[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0]], normal: [0,1,0], rectangle: atlas && [atlas[0]+dz,atlas[1],dx,dz] },
    { vertices: [[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]], normal: [0,-1,0], rectangle: atlas && [atlas[0]+dz+dx,atlas[1],dx,dz] },
    { vertices: [[x1,y1,z1],[x0,y1,z1],[x0,y0,z1],[x1,y0,z1]], normal: [0,0,1], rectangle: atlas && [atlas[0]+dz,atlas[1]+dz,dx,dy] },
    { vertices: [[x0,y1,z0],[x1,y1,z0],[x1,y0,z0],[x0,y0,z0]], normal: [0,0,-1], rectangle: atlas && [atlas[0]+dz+dx+dz,atlas[1]+dz,dx,dy] },
    { vertices: [[x1,y1,z0],[x1,y1,z1],[x1,y0,z1],[x1,y0,z0]], normal: [1,0,0], rectangle: atlas && [atlas[0],atlas[1]+dz,dz,dy] },
    { vertices: [[x0,y1,z1],[x0,y1,z0],[x0,y0,z0],[x0,y0,z1]], normal: [-1,0,0], rectangle: atlas && [atlas[0]+dz+dx,atlas[1]+dz,dz,dy] },
  ];
  return definitions.map(({vertices,normal,rectangle}) => {
    let uv: ItemMeshFace['uv'];
    if (rectangle) { const [u,v,w,h]=rectangle; uv=[[u,v],[u+w,v],[u+w,v+h],[u,v+h]]; }
    else if (normal[1]) uv=vertices.map(vertex=>[vertex[0],vertex[2]] as Uv) as unknown as ItemMeshFace['uv'];
    else uv=vertices.map(vertex=>[normal[0] ? vertex[2] : 16-vertex[0],16-vertex[1]] as Uv) as unknown as ItemMeshFace['uv'];
    return {vertices,normal,uv,texture: atlas ? texture : normal[1] > 0 ? 'top' : normal[1] < 0 ? 'bottom' : 'side'};
  });
}

export function blockMesh(kind: 'cube'|'slab'|'stairs'|'enchanting-table'): ItemMesh {
  const bounds: ItemMesh['bounds']=[[0,0,0],[16,16,16]];
  if (kind !== 'stairs') return { bounds, faces: cuboid([0,0,0],[16,kind==='slab'?8:kind==='enchanting-table'?12:16,16]) };
  const occupied = (x:number,y:number,z:number) => x>=0&&x<2&&z>=0&&z<2&&y>=0&&y<2&&(y===0||z===1);
  const faces: ItemMeshFace[]=[];
  for(let x=0;x<2;x++)for(let y=0;y<2;y++)for(let z=0;z<2;z++)if(occupied(x,y,z)) {
    for(const face of cuboid([x*8,y*8,z*8],[(x+1)*8,(y+1)*8,(z+1)*8])) {
      const [nx,ny,nz]=face.normal!;if(!occupied(x+nx,y+ny,z+nz)) faces.push(face);
    }
  }
  return {bounds,faces};
}

function finite(value: number | undefined, fallback: number) { return value !== undefined && Number.isFinite(value) ? value : fallback; }
function dot(a:Vec3,b:Vec3) { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
/** Pixel-center, orthographic triangle rasterizer with nearest texture sampling. */
export function rasterize(mesh:ItemMesh,textures:Readonly<Record<string,PixelTexture>>,width:number,height:number,camera:ItemCamera={},lighting:ItemLighting={}):Uint8ClampedArray {
  const yaw=finite(camera.yaw,45)*Math.PI/180,pitch=finite(camera.pitch,30)*Math.PI/180;
  const sinY=Math.sin(yaw),cosY=Math.cos(yaw),sinP=Math.sin(pitch),cosP=Math.cos(pitch);
  const positions=mesh.faces.flatMap(face=>face.vertices);
  if(!positions.length) return new Uint8ClampedArray(width*height*4);
  if(mesh.faces.length>4096||positions.some(vertex=>vertex.some(value=>!Number.isFinite(value)))) throw new Error('Invalid item mesh.');
  const min=mesh.bounds?.[0]??[Math.min(...positions.map(p=>p[0])),Math.min(...positions.map(p=>p[1])),Math.min(...positions.map(p=>p[2]))];
  const max=mesh.bounds?.[1]??[Math.max(...positions.map(p=>p[0])),Math.max(...positions.map(p=>p[1])),Math.max(...positions.map(p=>p[2]))];
  if([...min,...max].some(value=>!Number.isFinite(value))||min.some((value,index)=>value>max[index]!))throw new Error('Invalid item mesh bounds.');
  const center:Vec3=[(min[0]!+max[0]!)/2,(min[1]!+max[1]!)/2,(min[2]!+max[2]!)/2];
  const project=(p:Vec3)=>{const x=p[0]-center[0],y=p[1]-center[1],z=p[2]-center[2],forward=x*sinY+z*cosY;return {x:x*cosY-z*sinY,y:-y*cosP+forward*sinP,z:y*sinP+forward*cosP};};
  const corners=[];for(const x of [min[0]!,max[0]!])for(const y of [min[1]!,max[1]!])for(const z of [min[2]!,max[2]!])corners.push(project([x,y,z]));
  const rangeX=Math.max(...corners.map(p=>p.x))-Math.min(...corners.map(p=>p.x)),rangeY=Math.max(...corners.map(p=>p.y))-Math.min(...corners.map(p=>p.y));
  const padding=Math.max(0,finite(camera.padding,2));
  const scale=Math.min(Math.max(1,width-padding*2)/Math.max(.001,rangeX),Math.max(1,height-padding*2)/Math.max(.001,rangeY))*Math.max(.01,finite(camera.zoom,1));
  const offsetX=width/2+finite(camera.offsetX,0),offsetY=height/2+finite(camera.offsetY,0);
  const data=new Uint8ClampedArray(width*height*4),depth=new Float64Array(width*height);depth.fill(-Infinity);
  const direction:Vec3=[sinY*cosP,sinP,cosY*cosP];
  for(const face of mesh.faces) {
    if(face.normal&&dot(face.normal,direction)<=.00001)continue;
    const texture=textures[face.texture??'all']??textures.all;if(!texture)continue;
    const normal=face.normal??[0,0,1];
    const brightness=Math.max(0,Math.min(2,finite(face.brightness,normal[1]>.5?finite(lighting.top,1):normal[1]<-.5?finite(lighting.bottom,.5):Math.abs(normal[0])>.5?finite(lighting.right,.6):finite(lighting.left,.8))));
    const points=face.vertices.map(vertex=>{const p=project(vertex);return {x:p.x*scale+offsetX,y:p.y*scale+offsetY,z:p.z};});
    for(const triangle of [[0,1,2],[0,2,3]] as const) {
      const a=points[triangle[0]]!,b=points[triangle[1]]!,c=points[triangle[2]]!,ua=face.uv[triangle[0]],ub=face.uv[triangle[1]],uc=face.uv[triangle[2]];
      const denominator=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(denominator)<.000001)continue;
      const left=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x))),right=Math.min(width-1,Math.ceil(Math.max(a.x,b.x,c.x)));
      const top=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y))),bottom=Math.min(height-1,Math.ceil(Math.max(a.y,b.y,c.y)));
      for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++) {
        const wa=((b.y-c.y)*(x+.5-c.x)+(c.x-b.x)*(y+.5-c.y))/denominator,wb=((c.y-a.y)*(x+.5-c.x)+(a.x-c.x)*(y+.5-c.y))/denominator,wc=1-wa-wb;
        if(wa<-.000001||wb<-.000001||wc<-.000001)continue;
        const z=wa*a.z+wb*b.z+wc*c.z,index=y*width+x;if(z<depth[index]!-.000001)continue;
        const u=Math.max(0,Math.min(texture.width-1,Math.floor(wa*ua[0]+wb*ub[0]+wc*uc[0]+1e-8))),v=Math.max(0,Math.min(texture.height-1,Math.floor(wa*ua[1]+wb*ub[1]+wc*uc[1]+1e-8)));
        const source=(v*texture.width+u)*4,target=index*4,alpha=texture.data[source+3]!;if(!alpha)continue;
        depth[index]=z;
        for(let channel=0;channel<3;channel++)data[target+channel]=Math.round(texture.data[source+channel]!*brightness);
        data[target+3]=alpha;
      }
    }
  }
  return data;
}

export function composeBanner(base:PixelTexture,layers:readonly {texture:PixelTexture;color:readonly number[]}[],baseColor:readonly number[],fabricShading=false):PixelTexture {
  const data=new Uint8ClampedArray(base.data);
  for(let i=0;i<data.length;i+=4)for(let channel=0;channel<3;channel++)data[i+channel]=Math.round(data[i+channel]!*baseColor[channel]!/255);
  for(const {texture,color} of layers) {
    if(texture.width!==base.width||texture.height!==base.height)throw new Error('Banner pattern atlas dimensions differ from base.');
    for(let i=0;i<data.length;i+=4) {
      const sa=texture.data[i+3]!/255,da=data[i+3]!/255,alpha=sa+da*(1-sa);if(!alpha)continue;
      for(let channel=0;channel<3;channel++)data[i+channel]=Math.round((texture.data[i+channel]!*color[channel]!/255*(fabricShading?base.data[i+channel]!/255:1)*sa+data[i+channel]!*da*(1-sa))/alpha);
      data[i+3]=Math.round(alpha*255);
    }
  }
  return {width:base.width,height:base.height,data};
}

export function clothPixels(texture:PixelTexture,width:number,height:number):Uint8ClampedArray {
  const data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    const u=1+Math.min(19,Math.floor((x+.5)*20/width)),v=1+Math.min(39,Math.floor((y+.5)*40/height));
    data.set(texture.data.subarray((v*texture.width+u)*4,(v*texture.width+u)*4+4),(y*width+x)*4);
  }
  return data;
}
