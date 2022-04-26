const NONE = 0
const PLAYER = 1;
const BOT = 2;

var board;

const WIN_REWARD = 10;
const DRAW_REWARD = 5;
const LOOSE_REWARD = 0;

const LINE_OF_TWO_POINTS = 1;
const LINE_OF_THREE_POINTS = 3;

const STATUS_NOT_ENDED = 0;
const STATUS_PLAYER_WIN = 1; // must be the same as PLAYER
const STATUS_BOT_WIN = 2; // must be the same as BOT
const STATUS_DRAW = 3;

const MAXDEPTH = 4;

randomInt = (a, b) => a + Math.floor(Math.random() * (b - a));
trueModulo = (a, b) => a - (b * Math.floor(a / b)) 

getColumn = c => document.getElementById("column-" + c);
getCell = (c, r) => document.getElementById("cell-" + c + "-" + r);

function freeze(f, a) {
	return () => f(a);
}

var animations;

function onLoad() {
	animations = 0;

	let grid = document.getElementById("grid");
	for (let i=0; i<42; i++) {
		let cell = document.createElement("span");
		cell.classList.add("chip");
		cell.id = "cell-" + (i % 7) + "-" + Math.ceil(5 - (i / 7));
		grid.appendChild(cell);
	}

	// work around the cache
	for (const btn of document.getElementsByClassName("column")) {
		btn.disabled = true;
	}

	localise();
}

var CAPTION_WIN = "You won !";
var CAPTION_DRAW = "Draw ...";
var CAPTION_LOOSE = "You lost !";
function localise() {
	if (navigator.language.startsWith("fr")) {
		document.title = "Puissance 4";
		let popupStart = document.getElementById("popup-start");
		popupStart.children[0].innerText = "Qui commence ?";
		popupStart.children[1].children[0].innerText = "Moi";
		popupStart.children[1].children[1].innerText = "Le bot";
		let popupEnd = document.getElementById("popup-end");
		popupEnd.children[1].children[0].innerText = "Rejouer";
		CAPTION_WIN = "Gagné !";
		CAPTION_DRAW = "Match nul ...";
		CAPTION_LOOSE = "Perdu !";
	}
}

function startGame(botFirst) {
	document.getElementById("popup-start").style.display = "none";

	board = Array(7);
	for (let i=0; i<7; i++) {
		board[i] = Array();
	}

	if (botFirst) {
		botTurn();
	} else {
		playerTurn();
	}
}

function botTurn() {
	let col = optimal();
	board[col].push(BOT);

	addChip(col, BOT);

	if (!gameEnd()) {
		playerTurn();
	}
}

function playerTurn() {
	for (let i=0; i<7; i++) {
		getColumn(i).disabled = (board[i].length === 6);
	}
}

function playOn(column) {
	for (const btn of document.getElementsByClassName("column")) {
		btn.disabled = true;
	}

	board[column].push(PLAYER);

	addChip(column, PLAYER);

	if (!gameEnd()) {
		window.setTimeout(botTurn, 50);
	}
}

function addChip(column, color) {
	let cls = (color === PLAYER) ? "player-color" : "bot-color";
	let row = board[column].length - 1;
	let cell = getCell(column, row)
	cell.classList.add(cls);
	cell.style.animation = "fall-" + (6 - row) + " " + (0.6 - row*0.1) + "s ease-in forwards";
	cell.onanimationend = freeze(removeAnim, cell);
	animations ++;
}

function removeAnim(cell) {
	cell.style.animation = "";
	animations --;
}

function optimal() {
	var rewards = Array(7).fill(-2);

	for (const c of available(board)) {
		let newBoard = deepcopy(board);
		newBoard[c].push(BOT);
		rewards[c] = simulation_player(newBoard, 0);
	}

	//console.log(rewards);

	var best = undefined;
	var bestReward = -1;
	for (let i=0; i<7; i++) {
		if (rewards[i] > bestReward) {
			best = [i];
			bestReward = rewards[i];
		} else if (rewards[i] === bestReward) {
			best.push(i);
		}
	}
	
	return best[Math.floor(Math.random()*best.length)];
}

function* available(b) {
	for (let i=0; i<7; i++) {
		if (b[i].length < 6) {
			yield i;
		}
	}
}

function deepcopy(obj) {
	if (obj instanceof Array) {
		let arr = Array(obj.length);
		for (let i=0; i<obj.length; i++) {
			arr[i] = deepcopy(obj[i]);
		}
		return arr;
	}
	else {
		return obj
	}
}

function simulation_player(b, d) {
	if (d > MAXDEPTH) {
		return rate(b);
	}

	var reward = 0;
	var a = 0;

	switch (status(b, false)) {
		case STATUS_PLAYER_WIN: return LOOSE_REWARD;
		case STATUS_BOT_WIN: return WIN_REWARD;
		case STATUS_DRAW: return DRAW_REWARD;
	}

	for (const c of available(b)) {
		let newBoard = deepcopy(b);
		newBoard[c].push(PLAYER);

		reward += simulation_bot(newBoard, d+1);
		a++;
	}

	return reward / a;
}

function simulation_bot(b, d) {
	if (d > MAXDEPTH) {
		return rate(b);
	}

	var reward = 0;
	var a = 0;

	switch (status(b, false)) {
		case STATUS_PLAYER_WIN: return LOOSE_REWARD;
		case STATUS_BOT_WIN: return WIN_REWARD;
		case STATUS_DRAW: return DRAW_REWARD;
	}

	for (const c of available(b)) {
		let newBoard = deepcopy(b);
		newBoard[c].push(BOT);

		reward += simulation_player(newBoard, d+1);
		a++;
	}

	return reward / a;
}

function rate(b) {
	let points = 0;

	points += rateRows(b, BOT);
	points -= rateRows(b, PLAYER);

	points += rateColumns(b, BOT);
	points -= rateColumns(b, PLAYER);

	points += rateColumns(b, BOT);
	points -= rateColumns(b, PLAYER);

	return (points + 100) / 15;
}

function rateRows(b, p) {
	let points = 0;

	for (let i=0; i<6; i++) {
		for (let j=0; j<6; j++) {
			if (b[j][i] === p) {
				if (b[j+1][i] === p) {
					points += LINE_OF_TWO_POINTS;
					j ++;
				}
				if (j < 5 && b[j+2][i] === p) {
					points += LINE_OF_THREE_POINTS;
					j ++;
				}
			}
		}
	}

	return points;
}

function rateColumns(b, p) {
	let points = 0;

	var m, a;
	for (let i=0; i<7; i++) {
		for (let j=0; j<5; j++) {
			if (b[i][j] === p) {
				if (b[i][j+1] === p) {
					points += LINE_OF_TWO_POINTS;
					j ++;
				}
				if (b[i][j+2] === p) {
					points += LINE_OF_THREE_POINTS;
					j ++;
				}
			}
		}
	}

	return points;
}

function rateDiagonals(b, p) {
	let points = 0;

	for (let i=0; i<7; i++) {
		for (let j=0; j<5; j++) {
			let k = trueModulo(i + j, 7);
			if (b[k][j] === p) {
				if (k < 6 && b[k+1][j+1] === p) {
					points += LINE_OF_TWO_POINTS;
					j ++;
				}
				if (k < 5 && b[k+2][j+2] === p) {
					points += LINE_OF_THREE_POINTS;
					j ++;
				}
			}
		}
	}
	for (let i=0; i<7; i++) {
		for (let j=0; j<5; j++) {
			let k = trueModulo(i - j, 7);
			if (b[k][j] === p) {
				if (k > 0 && b[k-1][j+1] === p) {
					points += LINE_OF_TWO_POINTS;
					j ++;
				}
				if (k > 1 && b[k-2][j+2] === p) {
					points += LINE_OF_THREE_POINTS;
					j ++;
				}
			}
		}
	}

	return points;
}

function status(b, hl) {
	for (const p of [PLAYER, BOT]) {
		// rows
		for (let i=0; i<6; i++) {
			for (let j=0; j<4; j++) {
				if ((b[j][i] === p)
						&& (b[j+1][i] === p)
						&& (b[j+2][i] === p)
						&& (b[j+3][i] === p)) {
					if (hl) highlight([
						{row: i, col: j},
						{row: i, col: j+1},
						{row: i, col: j+2},
						{row: i, col: j+3},
					])
					return p;
				}
			}
		}

		// columns
		for (let i=0; i<7; i++) {
			for (let j=0; j<3; j++) {
				if ((b[i][j] === p)
						&& (b[i][j+1] === p)
						&& (b[i][j+2] === p)
						&& (b[i][j+3] === p)) {
					if (hl) highlight([
						{col: i, row: j},
						{col: i, row: j+1},
						{col: i, row: j+2},
						{col: i, row: j+3},
					])
					return p;
				}
			}
		}

		// diagonals
		for (let i=0; i<4; i++) {
			for (let j=0; j<3; j++) {
				if ((b[i][j] === p)
						&& (b[i+1][j+1] === p)
						&& (b[i+2][j+2] === p)
						&& (b[i+3][j+3] === p)) {
					if (hl) highlight([
						{col: i, row: j},
						{col: i+1, row: j+1},
						{col: i+2, row: j+2},
						{col: i+3, row: j+3},
					])
					return p;
				}
			}
		}
		for (let i=0; i<4; i++) {
			for (let j=0; j<3; j++) {
				if ((b[i][j+3] === p)
						&& (b[i+1][j+2] === p)
						&& (b[i+2][j+1] === p)
						&& (b[i+3][j] === p)) {
					if (hl) highlight([
						{col: i, row: j+3},
						{col: i+1, row: j+2},
						{col: i+2, row: j+1},
						{col: i+3, row: j},
					])
					return p;
				}
			}
		}
	}

	// draw test
	for (let i=0; i<7; i++) {
		if (b[i].length < 6) {
			return STATUS_NOT_ENDED;
		}
	}

	return STATUS_DRAW;
}

function gameEnd() {
	switch (status(board, false)) {
		case STATUS_NOT_ENDED: return false;
		case STATUS_DRAW: drawScreen(); return true;
		case STATUS_BOT_WIN: looseScreen(); return true;
		case STATUS_PLAYER_WIN: winScreen(); return true;
	}
}

function drawScreen() {
	status(board, true);
	document.getElementById("span-end").innerText = CAPTION_DRAW;
	document.getElementById("popup-end").style.display = "block";
}

function looseScreen() {
	status(board, true);
	document.getElementById("span-end").innerText = CAPTION_LOOSE;
	document.getElementById("popup-end").style.display = "block";
}

function winScreen() {
	status(board, true);
	document.getElementById("span-end").innerText = CAPTION_WIN;
	document.getElementById("popup-end").style.display = "block";
}

function highlight(cells) {
	if (animations) {
		window.setTimeout(freeze(highlight, cells), 100);
	}
	else {
		for (const c of cells) {
			getCell(c.col, c.row).classList.add("highlighted");
		}
	}
}