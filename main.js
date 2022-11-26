const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let HEAD = document.getElementById('head');
let pattern = document.createElement('img');
pattern.src = 'gfx/giraffes/00_pattern.png';

const SIZE = 64, DX = -20;
const DIRS = [[0,-1], [1,0], [0,1], [-1,0]];

const DIRS_KEYS = {
    "w":0,"d":1,"s":2,"a":3,
    "ArrowUp":0,"ArrowRight":1,"ArrowDown":2,"ArrowLeft":3,
    "panup":0,"panright":1,"pandown":2,"panleft":3
};

const CANVAS = document.createElement('canvas');
const ctx2 = CANVAS.getContext("2d");

CANVAS.width = 600;
CANVAS.height = 800;


const SCENARIOS = {};
let GAME;
const WRONG_ORDERS = [
    ["apple_0", "apple_1"], ["apple_0", "apple_2"], ["apple_0", "apple_3"], ["apple_0", "apple_4"], ["apple_0", "apple_5"],
    ["apple_1", "apple_2"], ["apple_1", "apple_3"], ["apple_1", "apple_4"], ["apple_1", "apple_5"], ["apple_2", "apple_3"],
    ["apple_2", "apple_4"], ["apple_2", "apple_5"], ["apple_3", "apple_4"], ["apple_3", "apple_5"], ["apple_4", "apple_5"]
];

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

// vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv


function drawGiraffe(ctx, player, perc, drawPattern) {
    ctx.save();
    ctx.beginPath();
    ctx.lineWidth = 45;
    // ctx.lineCap = 'round';
    ctx.lineJoin = "round";
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
    HEAD.style.left = (SIZE*x+DX)+'px';
    HEAD.style.top = (SIZE*y)+'px';

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


function loadScenario(name) {
    return fetch(`scenarios/${name}.json`, {cache: "no-store"})
        .then((response) => response.json())
        .then((data) => {
            SCENARIOS[name] = data;
        });
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

    length() {
        return this.segments.length;
    }

    orient(dir) {
        if(dir !== undefined && (dir+2)%4 != this.lastDir ){
           this.dir = dir;
        }
    }
}

class GamePlay {
    updateScores() {
        let el = document.querySelector('#length');
        el.innerText = (this.player.length()) + " / " + (this.level.limit);
        el.style.color = (this.player.length() > this.level.limit) ? 'red' : 'white';
    }

    setLevelName(name) {
        document.querySelector("#level_name").innerText = name;
    }

    constructor(data) {
        HEAD.style.transition = '';
        HEAD.src = "gfx/giraffes/00_head.png";
        HEAD.style.left = (SIZE*data.start.x+DX)+'px';
        HEAD.style.top = (SIZE*data.start.y)+'px';
        HEAD.style.transform = 'translate(-50%, -100%)';

        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx2.clearRect(0, 0, CANVAS.width, CANVAS.height);
        this.angle = 0;
        this.level = new Level(data);
        this.not_checked = true;
        this.setLevelName(this.level.name);
        this.player = new Player(data.start.x, data.start.y, DIRS_KEYS[data.start.dir]);
        this.min_iter = 0.4; // game speed 
        this.updateScores();
        this.onKeyPress_fn = this.onKeyPress.bind(this);
        this.collectedItems = {};
        window.addEventListener("keydown", this.onKeyPress_fn);
        
        this.mc = new Hammer(document.querySelector("body"));
        this.mc.get('pan').set({ direction: Hammer.DIRECTION_ALL, threshold: 20 });

        this.mc.on("panleft panright panup pandown", (ev) => {
            if(this.started !== undefined)
                this.player.orient(DIRS_KEYS[ev.type]);
        });
    }


    loop(timestamp) {
        if(this.started === undefined)
            this.started = this.last = timestamp;

        let elapsed = (timestamp - this.last)/1000.0;
    
        if(this.not_checked && elapsed > 0.25*this.min_iter) {
            this.not_checked = false;
    
            let [nx, ny] = this.player.nextSegment();
    
            if(nx < 1 || nx > 9 || ny < 1 || ny > 12) {
                return {transition_to: "gameover", message: "Wypadłeś poza planszę"};
            }
    
            let item = this.level.visit(nx, ny, this.player.lastDir);
            if(item === false) {
                return {transition_to: "gameover", message: "Zaplątała ci się szyja 😂"};
            }

            if(item && item.kind !== undefined) {
                for(let [a,b] of WRONG_ORDERS) {
                    if(item.kind == b && a in this.collectedItems)
                        return {
                            transition_to: "gameover",
                            message: "Pamiętaj, aby zjadać jabłuszka od najmniejszych",
                        }
                }
                this.collectedItems[item.kind] = true;
            }
    
            if(this.level.isCompleted()){
                return {transition_to: "success", message: "Twój wynik to: " + this.player.length()};
            }
        }
    
        if(elapsed > this.min_iter) {
            let [nx, ny] = this.player.nextSegment();
    
            if(nx == 2 && ny == 9) {
                document.querySelector("body").classList.add("tęcza");
            }
    
            this.level.mark(nx, ny, this.player.lastDir, this.player.dir);
    
            this.player.move();

            this.last = timestamp;
            this.not_checked = true;
    
            this.updateScores();
            
        }
    
        if(this.player.lastDir == undefined || (elapsed > this.min_iter && this.player.lastDir !== this.player.dir)) {
            if((this.player.dir+1)%4 == this.player.lastDir)
                this.angle -= 90;
            else if((this.player.dir+3)%4 == this.player.lastDir)
                this.angle += 90;
            this.player.lastDir = this.player.dir;
            HEAD.style.transform = 'translate(-50%, -100%) rotate('+(this.angle)+'deg)';
        }
    
    
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx2.clearRect(0, 0, CANVAS.width, CANVAS.height);
        drawGiraffe(ctx, this.player, (elapsed/this.min_iter)%1, false);
        drawGiraffe(ctx2, this.player, (elapsed/this.min_iter)%1, true);
        ctx.drawImage(CANVAS, 0, 0);
    
        // drawGrid(SIZE);
    
        if(this.started === timestamp)
            HEAD.style.transition = 'transform 0.5s';
    
        return false;
    }

    destruct() {
        window.removeEventListener("keydown", this.onKeyPress_fn);
        this.level.destruct();
        this.mc.destroy();
    }

    onKeyPress(event) {
        if(this.started !== undefined)
            this.player.orient(DIRS_KEYS[event.key]);
    }
}
class Game {
    constructor() {
        this.state = 'listLevels';
        this.loop_fn = this.loop.bind(this);
        this.scenario = '01_intro';
        this.level_id = 0;

        document.querySelector('#back_btn').addEventListener('click', () => {
            this.state = 'listLevels';
        });
    }

    loop(timestamp) {
        if(this.state == 'waiting'){}
        if(this.state == 'listLevels') {
            hideModal();
            if(this.handler) {
                window.clearTimeout(this.handler);
                this.handler = undefined;
            }

            buildLevelsList();
            this.state = 'waiting';
            document.querySelector('#nav_bottom').classList.add('hidden');
            document.querySelector('#nav_top').classList.add('hidden');
            document.querySelector('#front').classList.remove('hidden');
            document.querySelector('#content').classList.add('hidden');
            document.querySelector("#border").classList.add("movetotop");
            document.querySelector('main').style.background = 'url("gfx/title.jpg")';
            document.querySelector('main').style.backgroundPosition = 'center center';

            if(this.gameplay) {
                this.gameplay.destruct();
                this.gameplay = undefined;
            }
        }
        else if(this.state == 'initialized') {

        } else
        if(this.state == 'startPlaying') {
            if(this.gameplay) {
                this.gameplay.destruct();
                this.gameplay = undefined;
            }
            this.state = 'waiting';
            document.querySelector('#front').classList.add('hidden');
            document.querySelector('#content').classList.remove('hidden');
            document.querySelector("#border").classList.remove("movetotop");
            document.querySelector('#nav_bottom').classList.remove('hidden');
            document.querySelector('#nav_top').classList.remove('hidden');

            document.querySelector("body").classList.remove("tęcza");

            const data = SCENARIOS[this.scenario].levels[this.level_id];

            let progress = this.level_id / (SCENARIOS[this.scenario].levels.length - 1);

            document.querySelector("main").style.backgroundImage = "url(gfx/backgrounds/" + SCENARIOS[this.scenario].background + ")";
            document.querySelector("main").style.backgroundPosition = (100*progress) + "%";

            this.gameplay = new GamePlay(data);

            if(data.message) {
                showModal(
                    data.name,
                    data.message,
                    3000,
                    () => {this.handler = window.setTimeout(() => {this.state = 'playing';}, 2000);}
                )
            } else {
                this.handler = window.setTimeout(() => {
                    this.state = 'playing';
                    this.handler=undefined;
                }, 2000);
            }
        } else 
        if(this.state == 'playing') {
            let res = this.gameplay.loop(timestamp);
            if(res) {
                this.state = res.transition_to;
                this.message = res.message;
                // this.gameplay.destruct();
            }
        } else 
        if(this.state == 'gameover') {
            HEAD.src = "gfx/giraffes/00_head_xx.png";
            this.state = 'waiting';
            // HEAD.style.zIndex = 107;
            // document.querySelector('#content').style.overflow = 'visible';
            // this.state = 'startPlaying';

            //TODO: wyświetlić modal
            let message = this.message || "Niestety przegrałeś";

            window.setTimeout(() => {
                showModal("😭 Porażka 😭", `${message}, spróbuj ponowanie`, 3000, () => {
                    window.setTimeout(() => {
                        this.gameplay.destruct();
                        this.state = 'startPlaying';
                    }, 1500);
                });
            }, 2000);
            this.message = null;
            // window.setTimeout(() => {alert("Uszkodziłeś żyrafę! Spróbuj ponownie")}, 2000);
        } else
        if(this.state == 'gameover2') {
            // document.querySelector('#content').classList.add('hide-content')
            this.state = 'waiting';
            // this.gameplay.destruct();
        } else
        if(this.state == 'success') {
            let lastScore = parseInt(this.message.split(":")[1]);
            let name = SCENARIOS[this.scenario].levels[this.level_id].name;
            let bestScore = localStorage.getItem(name);
            if(!bestScore || parseInt(bestScore) > lastScore)
                localStorage.setItem(name, lastScore);
            
            if(this.level_id + 1 == SCENARIOS[this.scenario].levels.length) {
                showModal("🦒🦒 Brawo 🦒🦒", "Ukończyłeś wszystkie poziomy", 100000, () => {this.level_id = 0; this.state = 'listLevels'});
            } else {
                showModal(
                    "🦒 Gratulacje 🦒",
                    "Kolejny poziom już na ciebie czeka.<br>" + this.message,
                    3000,
                    () => {
                        this.gameplay.destruct();
                        this.level_id += 1; 
                        this.state = 'startPlaying';
                    }
                );
            }
            this.state = 'waiting';
        }
        window.requestAnimationFrame(this.loop_fn);
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
            return item;
        }

        let dir_c = (dir == 0 || dir == 2) ? "|" : "-";

        let h = this.hitbox[key];
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
        for (const [key, value] of Object.entries(this.items)) {
            value.el.remove();
        }
    }
}

function buildLevelsList() {
    let el = document.querySelector("#levels_list");
    let scrollbars = OverlayScrollbars(el);
    if(scrollbars)scrollbars.destroy();
    el.innerHTML = '';
    for(let k in SCENARIOS) {
        let scenerio = SCENARIOS[k];
        let h2 = document.createElement('h2')
        h2.innerText = scenerio.name;
        el.appendChild(h2);

        for(let id in scenerio.levels) {
            let level = scenerio.levels[id];

            let div = document.createElement('div'), stars = '';
            div.className = 'list-item';
            for(let i=0;i<level.difficulty;i++)stars += '⭐';
            const best = localStorage.getItem(level.name) || '-';
            div.innerHTML = `<b>🥇 ${best} / ${level.limit}</b><h3>${level.name}</h3><span>Trudność: ${stars}</span>`;
            div.addEventListener('click', function(){
                GAME.scenario = k;
                GAME.level_id = parseInt(id);
                GAME.state = 'startPlaying';
            });
            el.appendChild(div);
        }
    }
    let div = document.createElement('div');
    div.className = 'spacer';
    el.appendChild(div);
    
    OverlayScrollbars(el, {clipAlways: false});
}

async function onInit() {
    await loadScenario("01_intro");
    await loadScenario("02_random");
    GAME = new Game();
    window.requestAnimationFrame(GAME.loop_fn);
}

let MODAL_FN = undefined, MODAL_CALLBACK = undefined;

function showModal(title, content, timeout, callback) {
    if(MODAL_CALLBACK)
    document.querySelector('#border').style.zIndex = 300;
    document.querySelector('#modal h3').innerText = title;
    document.querySelector('#modal p').innerHTML = content;

    document.querySelector('#modal-backdrop').classList.remove('hidden');

    let handler = undefined;
    let callback_fn = () => {
        if(handler) {
            window.clearTimeout(handler);
        }
        document.querySelector('body').removeEventListener("click", callback_fn);
        hideModal();
        if(callback)callback();
    }
    
    document.querySelector('body').addEventListener("click", callback_fn);

    if(timeout) {
        handler = window.setTimeout(callback_fn, timeout);
    }
}

function hideModal() {
    document.querySelector('#modal-backdrop').classList.add('hidden');
    window.setTimeout(() => {document.querySelector('#border').style.zIndex = 100;}, 1000);
}

function resize(){
    const margin = 60;

    let scaleX = document.body.parentNode.clientWidth / (710 + margin), scaleY = document.body.parentNode.clientHeight / (930 + margin);
    let scale = Math.min(scaleX, scaleY, 1);
    document.querySelector("main").style.transform = "translate(-50%, -50%) scale("+scale+")";
};

window.addEventListener('resize', resize);
window.addEventListener("DOMContentLoaded", resize);