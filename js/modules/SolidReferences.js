import CV from '../vendor/cv.js';
import { homography, project } from './Alignment.js';

export function solidDefinition(width, height, thickness = 5, points = null) {
  thickness = Math.max(5, Number(thickness) || 8);
  const inset = Math.max(32, thickness * 6);
  return { type: 'solid-v1', width, height, markerSize: thickness,
    markers: (points || [[inset, inset], [width-inset,inset], [width-inset,height-inset], [inset,height-inset]])
      .map(([x,y], id) => ({ id, x, y, width: thickness * (3 + id * 2), height: thickness })) };
}
export function solidSVG(marker) {
  return `<rect x="${marker.x-marker.width/2}" y="${marker.y-marker.height/2}" width="${marker.width}" height="${marker.height}" fill="black"/>`;
}
export function markerCorners(marker) {
  const {x,y,width:w,height:h} = marker;
  return [[x-w/2,y-h/2],[x+w/2,y-h/2],[x+w/2,y+h/2],[x-w/2,y+h/2]];
}

/** Solid bars have no model IDs. Their different lengths establish clockwise orientation.
 * Match all sixteen corners, not just four centers (which always fit a homography).
 */
export function detectSolid(image, definition, detector) {
  CV.grayscale(image, detector.grey);
  const binary = new CV.Image(image.width, image.height, detector.grey.data.map(value => value < 160 ? 255 : 0));
  const contours = CV.findContours(binary, []);
  const polys = detector.clockwiseCorners(contours.filter(c=>c.length>=12)
    .map(c=>[.75,1,1.25,1.5,2,2.5,3].map(e=>CV.approxPolyDP(c,e))
      .find(p=>p.length===4 && CV.isContourConvex(p) && CV.minEdgeLength(p)>=2))
    .filter(Boolean));
  const candidates = [];
  const pixel = (x,y) => {
    x=Math.round(x); y=Math.round(y);
    return x>=0 && y>=0 && x<image.width && y<image.height ? detector.grey.data[y*image.width+x] : 0;
  };
  for (const poly of polys) {
    const points = poly.map(p=>[p.x,p.y]);
    const center = points.reduce((a,p)=>[a[0]+p[0]/4,a[1]+p[1]/4],[0,0]);
    const lengths = points.map((p,i)=>Math.hypot(p[0]-points[(i+1)%4][0],p[1]-points[(i+1)%4][1]));
    const short = Math.min(...lengths), long = Math.max(...lengths), ratio=(long+1)/(short+1);
    if (ratio<1.8 || ratio>16 || short>image.width*.04 || long>Math.max(image.width,image.height)*.18) continue;
    // Reject outlined shapes, text clusters, and blocks touching dark surroundings.
    if (pixel(...center)>100) continue;
    let valid=true;
    for(let i=0;i<4;i++) {
      const p=points[i],q=points[(i+1)%4], mx=(p[0]+q[0])/2,my=(p[1]+q[1])/2;
      const dx=mx-center[0],dy=my-center[1],distance=Math.hypot(dx,dy);
      if(pixel(center[0]+dx*.6,center[1]+dy*.6)>130 || pixel(mx+dx/distance*3,my+dy/distance*3)<180) { valid=false; break; }
    }
    if(!valid || candidates.some(c=>Math.hypot(c.center[0]-center[0],c.center[1]-center[1])<3)) continue;
    // Contours describe pixel centers. Expand each edge by half a pixel.
    const expanded=points.map((p,i)=>{
      const prev=points[(i+3)%4], next=points[(i+1)%4];
      const a=Math.hypot(p[0]-prev[0],p[1]-prev[1]),b=Math.hypot(p[0]-next[0],p[1]-next[1]);
      return [p[0]+.5*((p[0]-prev[0])/a+(p[0]-next[0])/b)+.5,
        p[1]+.5*((p[1]-prev[1])/a+(p[1]-next[1])/b)+.5];
    });
    candidates.push({center:[center[0]+.5,center[1]+.5],points:expanded,ratio,short:short+1,area:(short+1)*(long+1)});
  }
  if(candidates.length>40) throw new Error('Muitos blocos parecidos. Isole as quatro referências em espaços brancos.');
  const expected=definition.markers;
  const choices=expected.map(m=>candidates.filter(c=>Math.abs(Math.log(c.ratio/(m.width/m.height)))<.8));
  let best=null,ambiguous=false,attempts=0;
  const fromCenters=expected.map(m=>[m.x/definition.width,m.y/definition.height]);
  const from=expected.flatMap(m=>markerCorners(m).map(([x,y])=>[x/definition.width,y/definition.height]));
  function test(selected) {
    if(++attempts>15000) return;
    const centers=selected.map(c=>[c.center[0]/image.width,c.center[1]/image.height]);
    const crosses=centers.map((p,i)=>{const q=centers[(i+1)%4],r=centers[(i+2)%4];return (q[0]-p[0])*(r[1]-q[1])-(q[1]-p[1])*(r[0]-q[0]);});
    if(crosses.some(c=>c<.02)) return;
    const scales=selected.map((c,i)=>c.area/(expected[i].width*expected[i].height));
    if(Math.max(...scales)/Math.min(...scales)>3) return;
    try {
      const map=homography(fromCenters,centers);
      const ordered=selected.map((c,i)=>{
        const predicted=from.slice(i*4,i*4+4).map(p=>project(map,...p).map((v,k)=>v*(k?image.height:image.width)));
        let points=null,cost=Infinity;
        for(let shift=0;shift<4;shift++) {
          const rotated=c.points.map((_,j)=>c.points[(j+shift)%4]);
          const error=rotated.reduce((sum,p,j)=>sum+(p[0]-predicted[j][0])**2+(p[1]-predicted[j][1])**2,0);
          if(error<cost) {cost=error;points=rotated;}
        }
        return points;
      });
      const to=ordered.flat().map(([x,y])=>[x/image.width,y/image.height]);
      const matrix=homography(from,to);
      const errors=from.map((p,i)=>{const q=project(matrix,...p);return Math.hypot((q[0]-to[i][0])*image.width,(q[1]-to[i][1])*image.height);});
      const rms=Math.sqrt(errors.reduce((sum,e)=>sum+e*e,0)/16);
      if(rms>1.3 || Math.max(...errors)>2.5) return;
      const quad=[[0,0],[1,0],[1,1],[0,1]].map(p=>project(matrix,...p));
      if(quad.some(p=>p.some(v=>v<-.015||v>1.015))) return;
      if(best && selected.some((c,i)=>c!==best.selected[i])) ambiguous=true;
      if(!best || rms<best.rms) best={selected,ordered,rms};
    } catch { /* Reject degenerate combinations. */ }
  }
  function search(selected) {
    if(selected.length===4) return test(selected);
    for(const c of choices[selected.length]) if(!selected.includes(c) && attempts<=15000) search([...selected,c]);
  }
  search([]);
  if(ambiguous || attempts>15000) throw new Error('Referências ambíguas. Mostre somente uma folha e melhore o enquadramento.');
  if(!best) throw new Error('Referências sólidas: 0/4 conjuntos válidos. Mostre os quatro blocos nítidos e aproxime a câmera.');
  return best.ordered.map((points,i)=>({id:expected[i].id,corners:points.map(([x,y])=>({x,y}))}));
}
