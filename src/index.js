import { createFluidCanvas } from './fluidcanvas.js';
import { loadImage } from './image.js';


const lerp = (a, b, x) => (1-x)*a + (x*b);
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;

const addv = (u, v) => u.map((x, i) => x + v[i]);
const subv = (u, v) => u.map((x, i) => x - v[i]);
const scalev = (u, s) => u.map(x => x*s);
const dot = (u, v) => u.map((x, i) => x*v[i]).reduce((acc, x) => acc+x, 0);
const len = (u) => Math.sqrt(dot(u, u));
const lerpv = (u, v, x) => u.map((_, i) => lerp(u[i], v[i], x));


window.onload = async () => {
  const diatomImages = await Promise.all([
    // loadImage('/texture/diatom1.png'),
    // loadImage('/texture/diatom3.png'),
    loadImage('/texture/diatom4.png'),
    loadImage('/texture/diatom5.png'),
    loadImage('/texture/diatom6.png'),
    loadImage('/texture/diatom7.png'),
    loadImage('/texture/diatom8.png'),
    loadImage('/texture/diatom9.png'),
    loadImage('/texture/diatom10.png'),
    loadImage('/texture/diatom11.png'),
    loadImage('/texture/diatom12.png'),
    // loadImage('/texture/diatom13.png'),
    // loadImage('/texture/diatom14.png'),
    // loadImage('/texture/diatom15.png'),
    // loadImage('/texture/diatom16.png'),
    // loadImage('/texture/diatom17.png'),
    // loadImage('/texture/diatom18.png'),
    // loadImage('/texture/diatom19.png'),
    // loadImage('/texture/diatom20.png'),
    // loadImage('/texture/diatom21.png'),
    // loadImage('/texture/diatom22.png'),
  ]);

  const glowImg = await loadImage('/texture/glow.png');
  const densityImg = await loadImage('/texture/density.png');

  const [ fluidCanvas, updateFluid, readFluidVelocity ] = createFluidCanvas(1920, 1080);
  const canvas = document.createElement('canvas');
  canvas.width = fluidCanvas.width;
  canvas.height = fluidCanvas.height;
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');

  const densityCanvas = document.createElement('canvas');
  densityCanvas.width = canvas.width;
  densityCanvas.height = canvas.height;
  const densityCtx = densityCanvas.getContext('2d', { willReadFrequently: true });

  const N = 20; const M = 20;
  let particles = [ ...Array(N).keys() ].map(i => [ ...Array(M).keys() ].map(j => ({
    r: [ (i+Math.random())*(canvas.width/N), (j+Math.random())*(canvas.height/M) ],
    angle: 2*Math.PI*Math.random(),
    angleSpeed: 0,
    img: diatomImages[Math.floor(Math.random()*diatomImages.length)],
    v: [ 2*Math.random()-1, 2*Math.random()-1 ],
    glowR: 0,
  }))).flat();

  let ms = 0;
  const draw = (now) => {
    let dt = 0.001 * (now - ms);
    ms = now;
    updateFluid(now);
    ctx.drawImage(fluidCanvas, 0, 0);
    densityCtx.clearRect(0, 0, densityCanvas.width, densityCanvas.height);
    const scale = 0.05;
    particles.forEach(p => {
      const { r, v, a, angle } = p;
      const nx = [ Math.cos(angle), Math.sin(angle) ];
      const ny = [ Math.sin(angle), Math.cos(angle) ];
      
      const { width, height } = p.img;
      const separation = 0.5*scale * Math.min(width, height) * Math.max(width/height, height/width);
      const [ lx, ly ] = addv(r, scalev(nx, separation));
      const [ rx, ry ] = subv(r, scalev(nx, separation));
      const fl = readFluidVelocity(lx/canvas.width, ly/canvas.height);
      const fr = readFluidVelocity(rx/canvas.width, ry/canvas.height);

      const force = addv(addv(fl, fr), scalev([ 2*Math.random()-1, 2*Math.random()-1 ], 0.1));

      const torque = dot(ny, fl) - dot(ny, fr) + 0.1*(2*Math.random()-1);
      p.angleSpeed = clamp(lerp(p.angleSpeed+0.1*torque*dt, 0, dt), -5, 5);
      p.angle += p.angleSpeed;
      p.v = lerpv(addv(p.v, force), [ 0, 0 ], 0.5*dt);
      p.r = addv(p.r, scalev(p.v, dt));
      p.r[0] = clamp(p.r[0], 10, canvas.width-10);
      p.r[1] = clamp(p.r[1], 10, canvas.height-10);

      // densityCtx.drawImage(densityImg, -densityImg.width/2, -densityImg.height/2, densityImg.width, densityImg.height);

      const glowRadius = lerp(p.glowR, scale * len(force) * 2 , 0.5);
      p.glowR = glowRadius;
    });
    // particles.forEach(p => {
    //   const data = densityCtx.getImageData(Math.floor(p.r[0]), Math.floor(p.r[1]), 1, 1);
    //   const density = data[3]/255;
    //   p.v = addv(p.v, scalev([ 2*Math.random()-1, 2*Math.random()-1], density));
    // });
    particles.forEach(p => {
      const { width, height } = p.img;
      ctx.save();
      ctx.translate(p.r[0], p.r[1]);
      ctx.rotate(p.angle);
      if (height > width);
      ctx.rotate(Math.PI/2);

      const [ w, h ] = [ clamp(2*p.glowR*width, 0, width), clamp(2*p.glowR*height, 0, height) ];
      ctx.drawImage(glowImg, -w/2, -h/2, w, h);
      ctx.restore()
    });
    particles.forEach(p => {
      const { width, height } = p.img;
      ctx.save();
      ctx.translate(p.r[0], p.r[1]);
      ctx.rotate(p.angle);
      if (height > width);
      ctx.rotate(Math.PI/2);

      //ctx.drawImage(glowImg, -glowRadius, -glowRadius, 2*glowRadius, 2*glowRadius);
      ctx.drawImage(p.img, -scale*width/2, -scale*height/2, scale*width, scale*height);

      ctx.restore();
    });
 
     
      /*
      ctx.strokeStyle = '#000000';
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(rx, ry);
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle= '#ff0000';
      ctx.arc(lx, ly, 5, 0, 2*Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#ffff00';
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx+10*fl[0], ly+10*fl[1]);
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle= '#00ff00';
      ctx.arc(rx, ry, 5, 0, 2*Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#ffff00';
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx+10*fr[0], ry+10*fr[1]);
      ctx.stroke();

      ctx.strokeStyle = '#ff0000';
      ctx.beginPath();
      ctx.moveTo(r[0], r[1]);
      ctx.lineTo(r[0]+10*force[0], r[1]+10*force[1]);
      ctx.stroke();
      //*/
    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
}
