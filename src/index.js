import { createFluidCanvas } from './fluidCanvas.js';


const lerp = (a, b, x) => (1-x)*a + (x*b);
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;


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
    v: [ 2*Math.random()-1, 2*Math.random()-1 ],
  }))).flat();

  let ms = 0;
  const draw = (now) => {
    let dt = 0.001 * (now - ms);
    ms = now;
    updateFluid(now);
    ctx.drawImage(fluidCanvas, 0, 0);
    particles.forEach(p => {
      const [ x, y ] = p.r;
      const [ fx, fy ] = readFluidVelocity(x/canvas.width, y/canvas.height);
      p.v[0] += fx;
      p.v[0] = lerp(p.v[0], 0, 0.5*dt);
      p.v[1] += fy;
      p.v[1] = lerp(p.v[1], 0, 0.5*dt);

      p.r[0] += dt*p.v[0];
      p.r[0] = clamp(p.r[0], 10, canvas.width-10);
      p.r[1] += dt*p.v[1];
      p.r[1] = clamp(p.r[1], 10, canvas.height-10);

      ctx.beginPath();
      ctx.fillStyle= '#ff0000';
      ctx.arc(x, y, 5, 0, 2*Math.PI);
      ctx.fill();
    });
    //   const [ x, y ] = p.r;
    //   const data = readFluidVelocity(x, y);
    //   const fx = data[0];
    //   const fy = data[1];
    //   console.log(fx, fy);
    //   const vx = lerp(p.v[0], fx, 1);
    //   const vy = lerp(p.v[1], fx, 1);
    //   const rx = p.r[0] + dt*vx;
    //   const ry = p.r[1] + dt*vy;
    //   return { r: [rx, ry], v: [vx, vy] };
    // })
    // particles.forEach(p => { 
    //   const [ x, y ] = p.r;
    //   ctx.beginPath();
    //   ctx.fillStyle = '#ff0000';
    //   ctx.arc(x, y, 5, 0, 2*Math.PI);
    //   ctx.fill();
    // });
    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
}
