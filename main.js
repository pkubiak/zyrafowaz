const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let segments = [[5,8], [5,7]];
let dir = 0;
const dirs = [[0,-1], [1,0], [0,1], [-1,0]];
const dirs_keys = ['w', 'd', 's', 'a'];
let head = document.getElementById('head');
let pattern = document.createElement('img');
pattern.src = 'pattern.png';
let items = [{x:2,y:2,kind:"item"}, {x:5,y:5,kind:"item"}, {x:8,y:9,kind:"item"}];
let itemsMap = {};
let main = document.querySelector('main');


function drawGrid(size) { 
    ctx.beginPath();
    ctx.lineWidth = 3;
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
    if(k != -1 && (k+2)%4 != lastDir){
       dir = k;
    }
    console.log(event, k);
}
let lastDir, angle=0;

function drawGiraffe(size, perc) {
    
    //ctx.save();
    ctx.beginPath();
    ctx.lineWidth = 45;
    ctx.strokeStyle = '#fff';
    // ctx.shadowColor = "#000";
    // ctx.shadowBlur = 10;

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

    ctx.lineTo(size*x, size*y); 
     ctx.stroke();
    //ctx.closePath();
    //ctx.fill();
    //ctx.clip();

    /// draw patterns
    ctx.globalCompositeOperation = 'source-in';

    /// draw the image to be clipped
    ctx.drawImage(pattern, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    //ctx.restore();
}

let started = undefined, last = undefined;
const min_iter = 0.5;

function updateScores() {
    document.getElementById('length').innerText = (segments.length - 1) + " / 17";
}

let STATE = "playing";

function loop(timestamp) {
    if(started === undefined)
        started = last = timestamp;
    let elapsed = (timestamp - last)/1000.0;
    if(elapsed > min_iter) {
        let [x, y] = segments[segments.length - 1];
        let nx = x + dirs[dir][0], ny = y + dirs[dir][1];
        if(nx == 2 && ny == 9) {
            document.querySelector("body").classList.add("tęcza");
        }
        if(nx < 1 || nx > 8) {
            STATE = "gameover";
            head.src = "head_xx.png";
            head.style.zIndex = 107;
            // alert("Game Over");
            return
        }
        // if(STATE == "playing") {
            if(itemsMap[`${nx},${ny}`] !== undefined) {
                
                itemsMap[`${nx},${ny}`].classList.add('collected');
            }
            segments.push([nx, ny]);
            last = timestamp;

            updateScores();
        // }
    }

    if(lastDir == undefined || (elapsed > min_iter && lastDir !== dir)) {
        if((dir+1)%4 == lastDir)
            angle -= 90;
        else if((dir+3)%4 == lastDir)
            angle += 90;
        lastDir = dir;
        head.style.transform = 'translate(-50%, -100%) rotate('+(angle)+'deg)';
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGiraffe(64, (elapsed/min_iter)%1);
    if(STATE == "gameover")
        return;
    // drawGrid(64);

    if(started === timestamp)
        head.style.transition = 'transform 0.5s';

    window.requestAnimationFrame(loop);
}

function onInit() {
    updateScores();
    for(let item of items) {
        console.log('>>', item);
        let el = document.createElement('img');
        el.src = item.kind+'.png';
        el.className = 'item';
        el.style.left = (64*item.x)+'px';
        el.style.top = (64*item.y)+'px';
        main.appendChild(el);
        itemsMap[`${item.x},${item.y}`] = el;
    }
    window.requestAnimationFrame(loop);
}

