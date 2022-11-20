const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let HEAD = document.getElementById('head');
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
let GAME;

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
    return fetch(`scenarios/${name}.json`)
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
}

class GamePlay {
    updateScores() {
        let el = document.querySelector('#length');
        el.innerText = (this.player.length()) + " / " + (this.level.limit);
        el.style.color = (this.player.length() > this.level.limit) ? 'red' : 'auto';
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
        console.log("--", data);
        this.level = new Level(data);
        this.not_checked = true;
        this.setLevelName(this.level.name);
        this.player = new Player(data.start.x, data.start.y, DIRS_KEYS.indexOf(data.start.dir));
        this.min_iter = 0.5; // game speed 
        this.updateScores();
        this.onKeyPress_fn = this.onKeyPress.bind(this);
        window.addEventListener("keypress", this.onKeyPress_fn)
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
    
            if(this.level.visit(nx, ny, this.player.lastDir) === false) {
                return {transition_to: "gameover", message: "Zaplątała ci się szyja 😂"};
            }
    
            if(this.level.isCompleted()){
                return {transition_to: "success", message: "Twój wynik to: 17"};
            }
        }
    
        if(elapsed > this.min_iter) {
            let [nx, ny] = this.player.nextSegment();
    
            if(nx == 2 && ny == 9) {
                document.querySelector("body").classList.add("tęcza");
            }
    
            this.level.mark(nx, ny, this.player.lastDir, this.player.dir);
    
            this.player.move();
            // if(this.player.length() > this.level.limit)
            //     return {transition_to: "gameover"};
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
        console.log("Destruct");
        window.removeEventListener("keypress", this.onKeyPress_fn);
        this.level.destruct();
    }

    onKeyPress(event) {
        console.log(">>", this.player);
        let k = DIRS_KEYS.indexOf(event.key);
        if(k != -1 && (k+2)%4 != this.player.lastDir ){
           this.player.dir = k;
        }
        console.log(event, k);
    }
}
class Game {
    constructor() {
        this.state = 'startPlaying';
        this.loop_fn = this.loop.bind(this);
        this.scenario = '01_intro';
        this.level_id = 0;
    }

    loop(timestamp) {
        // console.log(">>", timestamp, this);
        if(this.state == 'waiting'){}
        else if(this.state == 'initialized') {
            
            //
        } else
        if(this.state == 'startPlaying') {
            //todo: show top-nav
            // todo: show bottom-nav
            // show game
            this.state = 'waiting';
            // let id = Math.floor(SCENARIOS[this.scenario].levels.length * Math.random());
            console.info("initLevel", this.scenario, this.level_id);
            console.log(SCENARIOS);
            document.querySelector("body").classList.remove("tęcza");

            const data = SCENARIOS[this.scenario].levels[this.level_id];

            this.gameplay = new GamePlay(data);

            if(data.message) {
                showModal(
                    data.name,
                    data.message,
                    3000,
                    () => {window.setTimeout(() => {this.state = 'playing';}, 2000);}
                )
            } else 
            // showModal(
            //     "Wiadomość", 
            //     "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.", 
            //     5000, 
            //     () => {
            //         window.setTimeout(() => {this.state = 'playing'}, 2000);
            //     }
            // );
            window.setTimeout(() => {this.state = 'playing';}, 2000);
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
            console.log("STATE: gameover");
            HEAD.src = "gfx/giraffes/00_head_xx.png";
            this.state = 'waiting';
            // HEAD.style.zIndex = 107;
            // document.querySelector('#content').style.overflow = 'visible';
            // this.state = 'startPlaying';

            //TODO: wyświetlić modal
            let message = this.message || "Niestety przegrałeś";

            window.setTimeout(() => {
                showModal("😭 Porażka 😭", `${message}, spróbuj ponowanie`, 3000, () => {
                    this.gameplay.destruct();
                    this.state = 'startPlaying';
                });
            }, 2000);
            this.message = null;
            // window.setTimeout(() => {alert("Uszkodziłeś żyrafę! Spróbuj ponownie")}, 2000);
        } else
        if(this.state == 'gameover2') {
            console.log("STATE: gameover2");
            // document.querySelector('#content').classList.add('hide-content')
            this.state = 'waiting';
            // this.gameplay.destruct();
        } else
        if(this.state == 'success') {
            if(this.level_id + 1 == SCENARIOS[this.scenario].levels.length) {
                showModal("🦒🦒 Brawo 🦒🦒", "Ukończyłeś wszystkie poziomy", 100000, () => {this.level_id = 0; this.state = 'startPlaying'});
            } else {
                showModal(
                    "🦒 Gratulacje 🦒",
                    "Kolejny poziom już na ciebie czeka.<br>" + this.message,
                    3000,
                    () => {
                        this.level_id += 1; this.state = 'startPlaying';
                    }
                );
            }
            console.log("STATE: success");
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
        for (const [key, value] of Object.entries(this.items)) {
            value.el.remove();
        }
    }
}

async function onInit() {
    await loadScenario("01_intro");
    GAME = new Game();
    window.requestAnimationFrame(GAME.loop_fn);
}

function showModal(title, content, timeout, callback) {
    console.log("---->")
    document.querySelector('#border').style.zIndex = 300;
    document.querySelector('#modal h3').innerText = title;
    document.querySelector('#modal p').innerHTML = content;

    document.querySelector('#modal-backdrop').classList.remove('hidden');

    let callback_fn = () => {
        console.log('callback')
        document.querySelector('body').removeEventListener("click", callback_fn);
        hideModal();
        if(callback)callback();
    }
    
    document.querySelector('body').addEventListener("click", callback_fn);

    if(timeout)window.setTimeout(callback_fn, timeout);
}

function hideModal() {
    document.querySelector('#modal-backdrop').classList.add('hidden');
    
    window.setTimeout(() => {document.querySelector('#border').style.zIndex = 100;}, 1000);
}