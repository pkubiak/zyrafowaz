const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let head = document.getElementById('head');
let pattern = document.createElement('img');
pattern.src = 'gfx/giraffes/00_pattern.png';

const SIZE = 64, DX = -20;
const DIRS = [[0,-1], [1,0], [0,1], [-1,0]];
const DIRS_KEYS = ['w', 'd', 's', 'a'];

const CANVAS = document.createElement('canvas');
const ctx2 = CANVAS.getContext("2d");

CANVAS.width = 600;
CANVAS.height = 800;


const SCENARIOS = {};


function drawGrid(size) { 
    ctx.beginPath();
    ctx.lineWidth = 3;
    for(let x=0;x<=canvas.width / size;x++){
        ctx.moveTo(size*x + DX, 0);
        ctx.lineTo(size*x + DX, canvas.height);
    }

    for(let y=0;y<=canvas.height / size;y++){
        ctx.moveTo(0, size*y);
        ctx.lineTo(canvas.width, size*y);
    }

    ctx.stroke();
}

function onKeyPress(event) {
    let k = DIRS_KEYS.indexOf(event.key);
    if(k != -1 && (k+2)%4 != lastDir && PLAYER){
       PLAYER.dir = k;
    }
    console.log(event, k);
}
let lastDir, angle=0;

function drawGiraffe(ctx, player, perc, drawPattern) {
    ctx.save();
    ctx.beginPath();
    ctx.lineWidth = 45;
    ctx.strokeStyle = '#fff';
    if(!drawPattern){
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 20;
    }

    for(let i=0;i<player.segments.length;i++) {
        let [x, y] = player.segments[i];
        if(i==0)
            ctx.moveTo(SIZE*x+DX, SIZE*y)
        else ctx.lineTo(SIZE*x+DX, SIZE*y);
    }

    let [x0,y0] = player.lastSegment();;
    let [x1, y1] = player.nextSegment();

    let x = (1-perc)*x0 + perc*x1;
    let y = (1-perc)*y0 + perc*y1;
    head.style.left = (SIZE*x+DX)+'px';
    head.style.top = (SIZE*y)+'px';

    ctx.lineTo(SIZE*x+DX, SIZE*y); 
    ctx.stroke();

    //ctx.closePath();
    //ctx.fill();
    //ctx.clip();
    ctx.restore();

    /// draw patterns
    if(drawPattern) {
        ctx.globalCompositeOperation = 'source-in';

        /// draw the image to be clipped
        ctx.drawImage(pattern, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
    }

    // draw ball
    // ctx.beginPath();
    // ctx.fillStyle = 'red';
    // ctx.arc(SIZE*x+DX, SIZE*y, 25, 0, 2 * Math.PI);
    // ctx.fill()
    //ctx.restore();
}

let started = undefined, last = undefined;
const min_iter = 0.5;

function updateScores() {
    document.getElementById('length').innerText = (PLAYER.segments.length) + " / " + (LEVEL.limit);
}

let STATE = "playing";
let LEVEL, PLAYER;

function gameover() {
    // return initLevel("01_intro", 0);
    STATE = "gameover";
    head.src = "gfx/giraffes/00_head_xx.png";
    head.style.zIndex = 107;
    document.querySelector('#content').style.overflow = 'visible';
}

function success() {
    console.log("Success ♥");
    // initLevel("01_intro", 0);
}

function loop(timestamp) {
    if(started === undefined)
        started = last = timestamp;
    let elapsed = (timestamp - last)/1000.0;

    if(not_checked && elapsed > 0.25*min_iter) {
        not_checked = false;

        let [nx, ny] = PLAYER.nextSegment();

        if(nx < 1 || nx > 9 || ny < 1 || ny > 12) {
            return gameover();
        }

        if(LEVEL.visit(nx, ny, PLAYER.lastDir) === false) {
            return gameover();
        }

        if(LEVEL.isCompleted()){
            return success();
        }
    }

    if(elapsed > min_iter) {
        let [nx, ny] = PLAYER.nextSegment();

        if(nx == 2 && ny == 9) {
            document.querySelector("body").classList.add("tęcza");
        }

        LEVEL.mark(nx, ny, PLAYER.lastDir, PLAYER.dir);

        PLAYER.move();
        last = timestamp;
        not_checked = true;

        updateScores();
        
    }

    if(PLAYER.lastDir == undefined || (elapsed > min_iter && PLAYER.lastDir !== PLAYER.dir)) {
        // head.style.transition = 'transform 0.5s';
        if((PLAYER.dir+1)%4 == PLAYER.lastDir)
            angle -= 90;
        else if((PLAYER.dir+3)%4 == PLAYER.lastDir)
            angle += 90;
        PLAYER.lastDir = PLAYER.dir;
        head.style.transform = 'translate(-50%, -100%) rotate('+(angle)+'deg)';
    }


    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGiraffe(ctx, PLAYER, (elapsed/min_iter)%1, false);
    drawGiraffe(ctx2, PLAYER, (elapsed/min_iter)%1, true);
    ctx.drawImage(CANVAS, 0, 0);

    if(STATE == "gameover")
        return;
    drawGrid(SIZE);

    if(started === timestamp)
        head.style.transition = 'transform 0.5s';

    window.requestAnimationFrame(loop);
}

function loadScenario(name) {
    return fetch(`scenarios/${name}.json`)
        .then((response) => response.json())
        .then((data) => {
            SCENARIOS[name] = data;
        });
}

function initLevel(scenario, id) {
    if(LEVEL !== undefined)
        LEVEL.destruct();
    head.style.transition = '';
    console.info("initLevel", scenario, id);
    console.log(SCENARIOS);
    const data = SCENARIOS[scenario].levels[id];
    const level = new Level(data);
    LEVEL = level;
    not_checked = true;

    document.querySelector("#level_name").innerText = level.name;

    PLAYER = new Player(data.start.x, data.start.y, DIRS_KEYS.indexOf(data.start.dir));
}

class Player {
    constructor(x0, y0, dir) {
        this.segments = [[x0,y0]];
        this.lastDir = undefined; 
        this.dir = dir;
    }

    nextSegment() {
        let [x0, y0] = this.lastSegment();
        return [x0 + DIRS[this.lastDir][0], y0 + DIRS[this.lastDir][1]];
    }

    lastSegment() {
        return this.segments[this.segments.length-1]
    }
    move() {
        this.segments.push(this.nextSegment());
    }
}

class Level {
    constructor(data) {
        this.name = data.name;
        this.limit = data.limit;

        const content = document.querySelector("#content");
        // this.items = [];
        this.items = {};

        for(let item of data.items) {
            let el = document.createElement('img');
            el.src = 'gfx/items/' + item.kind+'.png';
            el.className = 'item';
            el.style.left = (SIZE*item.x+DX)+'px';
            el.style.top = (SIZE*item.y)+'px';
            content.appendChild(el);
            this.items[`${item.x}_${item.y}`] = {x: item.x, y: item.y, kind: item.kind, el: el};
        }

        this.hitbox = {...data.hitbox};
    }

    visit(x, y, dir) {
        const key = `${x}_${y}`;
        if(this.items[key] !== undefined) {
            let item = this.items[key];
            item.el.classList.add('collected');
            delete this.items[key];
        }

        let dir_c = (dir == 0 || dir == 2) ? "|" : "-";

        let h = this.hitbox[key];
        console.log(h, dir_c, dir);
        if(h !== undefined) {
            if(h == '+' || h == dir_c)
                return false;
        }
            // this.hitbox[key] = '+';
        // } else this.hitbox[key] = dir_c;
    }

    mark(x, y, lastDir, dir) {
        let key = `${x}_${y}`;
        let h = this.hitbox[key];
        let dir_c = (dir == 0 || dir == 2) ? "|" : "-";

        console.assert(h !== '+');

        if(dir != lastDir)
            this.hitbox[key] = '+';
        else if(h === undefined) {
            this.hitbox[key] = dir_c;
        }else this.hitbox[key] = "+";
    }

    isCompleted() {
        return Object.keys(this.items).length == 0;
    }

    destruct() {
        console.warn("Destruct!!! TODO")

    }
}

async function onInit() {
    await loadScenario("01_intro");
    initLevel("01_intro", 0);
    updateScores();

    window.requestAnimationFrame(loop);
}

