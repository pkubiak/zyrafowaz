const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let segments = [[5,7], [5,6]];
let dir = 0;
const dirs = [[0,-1], [1,0], [0,1], [-1,0]];
const dirs_keys = ['w', 'd', 's', 'a'];
let head = document.getElementById('head');
console.log(head);
function drawGrid(size) { 
    ctx.beginPath();
    for(let x=0;x<=canvas.width / size;x++){
        ctx.moveTo(size*x, 0);
        ctx.lineTo(size*x, canvas.height);
    }

    for(let y=0;y<=canvas.height / size;y++){
        ctx.moveTo(0, size*y);
        ctx.lineTo(canvas.width, size*y);
    }

    ctx.stroke();
}

function onKeyPress(event) {
    let k = dirs_keys.indexOf(event.key);
    if(k != -1 && (k+2)%4 != dir){
       dir = k;
    }
    console.log(event, k, );
}
let lastDir, angle=0;

function drawGiraffe(size, perc) {
    // console.log(perc);
    ctx.beginPath();
    ctx.lineWidth = 45;
    ctx.strokeStyle = '#ffab4c';
    for(let i=0;i<segments.length-1;i++) {
        let [x, y] = segments[i];
        if(i==0)
            ctx.moveTo(size*x, size*y)
        else ctx.lineTo(size*x, size*y);
    }
    let [x0,y0] = segments[segments.length-2];
    let [x1,y1] = segments[segments.length-1];
    let x = (1-perc)*x0 + perc*x1;
    let y = (1-perc)*y0 + perc*y1;
    head.style.left = (size*x)+'px';
    head.style.top = (size*y)+'px';
    if(lastDir !== dir*90) {
        if((dir+1)%4 == lastDir)
            angle -= 90;
        else if((dir+3)%4 == lastDir)
            angle += 90;
        lastDir = dir;
        head.style.transform = 'translate(-50%, -100%) rotate('+(angle)+'deg)';
    }
    ctx.lineTo(size*x, size*y); 
    ctx.stroke();
}

let started = undefined, last = undefined;
function loop(timestamp) {
    if(started === undefined)
        started = last = timestamp;
    let elapsed = (timestamp - last)/1000.0;
    if(elapsed > 1.0) {
        let [x, y] = segments[segments.length - 1];
        console.log(dir)
        segments.push([x + dirs[dir][0], y + dirs[dir][1]]);
        last = timestamp;
    }
    drawGiraffe(64, elapsed%1);
    // if((timestamp - started)/1000.0 < 2)
        window.requestAnimationFrame(loop);
}

function onInit() {
    drawGrid(64);
    window.requestAnimationFrame(loop);
}