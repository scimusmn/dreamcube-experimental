import { createFluidCanvas } from './fluidCanvas.js';


const lerp = (a, b, x) => (1-x)*a + (x*b);
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;

const addv = (u, v) => u.map((x, i) => x + v[i]);
const subv = (u, v) => u.map((x, i) => x - v[i]);
const scalev = (u, s) => u.map(x => x*s);
const dot = (u, v) => u.map((x, i) => x*v[i]).reduce((acc, x) => acc+x, 0);
const len = (u) => Math.sqrt(dot(u, u));
const lerpv = (u, v, x) => u.map((_, i) => lerp(u[i], v[i], x));


window.onload = async () => {
  const [ fluidCanvas, updateFluid, readFluidVelocity ] = createFluidCanvas(1920, 1080);
  const canvas = document.createElement('canvas');
  canvas.width = fluidCanvas.width;
  canvas.height = fluidCanvas.height;
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');

  const N = 10; const M = 10;
  let particles = [ ...Array(N).keys() ].map(i => [ ...Array(M).keys() ].map(j => ({
    r: [ i*(canvas.width/N), j*(canvas.height/M) ],
    angle: 2*Math.PI*Math.random(),
    angleSpeed: 0,
    v: [ 2*Math.random()-1, 2*Math.random()-1 ],
  }))).flat();

  let ms = 0;
  const draw = (now) => {
    let dt = 0.001 * (now - ms);
    ms = now;
    updateFluid(now);
    ctx.drawImage(fluidCanvas, 0, 0);
    particles.forEach(p => {
      const { r, v, angle } = p;
      const nx = [ Math.cos(angle), Math.sin(angle) ];
      const ny = [ Math.sin(angle), Math.cos(angle) ];

      const s = 10;
      const [ lx, ly ] = addv(r, scalev(nx, s));
      const [ rx, ry ] = subv(r, scalev(nx, s));
      const fl = readFluidVelocity(lx/canvas.width, ly/canvas.height);
      const fr = readFluidVelocity(rx/canvas.width, ry/canvas.height);

      const force = addv(fl, fr);

      const torque = dot(ny, fl) - dot(ny, fr);
      p.angleSpeed = clamp(lerp(p.angleSpeed+0.1*torque*dt, 0, dt), -5, 5);
      p.angle += p.angleSpeed;
      p.v = lerpv(addv(p.v, force), [ 0, 0 ], 0.5*dt);
      p.r = addv(p.r, scalev(p.v, dt));
      p.r[0] = clamp(p.r[0], 10, canvas.width-10);
      p.r[1] = clamp(p.r[1], 10, canvas.height-10);
      
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
    });
    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
}
