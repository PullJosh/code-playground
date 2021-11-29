export class Game {
  gameObjects = [];
  loopFunctions = [];

  listeners = [];
  keysPressed = new Set();

  grid = new Grid(this, 12, 9);

  constructor(canvas) {
    if (canvas === undefined) {
      canvas = document.createElement("canvas");
      document.body.appendChild(canvas);
    }

    if (typeof canvas === "string") {
      canvas = document.querySelector(canvas);
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.canvas.width = 480;
    this.canvas.height = 360;

    document.body.addEventListener("keydown", (event) => {
      this.keysPressed.add(event.key);
      this.fireListeners(
        ({ type, key }) => type === "keydown" && key === event.key
      );
    });

    document.body.addEventListener("keyup", (event) => {
      this.keysPressed.delete(event.key);
      this.fireListeners(
        ({ type, key }) => type === "keyup" && key === event.key
      );
    });

    document.body.addEventListener("keypress", (event) => {
      this.fireListeners(
        ({ type, key }) => type === "keypress" && key === event.key
      );
    });

    this.canvas.addEventListener("click", (event) => {
      const rect = event.target.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;

      this.fireListeners(
        ({ type }) => type === "click",
        (fn) => fn(mx, my)
      );
    });

    this.play();
  }

  play() {
    this.frame();
  }

  frame() {
    requestAnimationFrame(this.frame.bind(this));

    this.render();
    for (const fn of this.loopFunctions) {
      fn();
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (const object of this.gameObjects) {
      object.render(this.canvas, this.ctx);
    }
  }

  addGameObject(object) {
    this.gameObjects.push(object);
  }

  loop(fn) {
    this.loopFunctions.push(fn);
  }

  addListener(listener) {
    this.listeners.push(listener);
    return listener;
  }

  removeListener(listener) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  fireListeners(listenerFilter, callback = (fn) => fn()) {
    this.listeners.filter(listenerFilter).forEach(({ fn }) => callback(fn));
  }

  keyPressed(key) {
    return this.keysPressed.has(key);
  }

  onKeyDown(key, fn) {
    return this.addListener({ type: "keydown", key, fn });
  }

  onKeyUp(key, fn) {
    return this.addListener({ type: "keyup", key, fn });
  }

  onKeyPress(key, fn) {
    return this.addListener({ type: "keypress", key, fn });
  }

  onClick(fn) {
    return this.addListener({ type: "click", fn });
  }
}

class GameObject {
  constructor(game) {
    this.game = game;
    game.addGameObject(this);
  }

  render(canvas, ctx) {}
}

class Grid extends GameObject {
  tiles = [];

  listeners = [];

  constructor(game, width, height) {
    super(game);

    for (let y = 0; y < height; y++) {
      let row = [];
      for (let x = 0; x < width; x++) {
        if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
          row.push(true);
        } else {
          row.push(false);
        }
      }
      this.tiles.push(row);
    }

    game.onClick((x, y) => {
      const tileX = Math.floor((x / this.game.canvas.width) * this.width);
      const tileY = Math.floor((y / this.game.canvas.height) * this.height);
      this.fireListeners(
        ({ type }) => type === "click",
        (fn) => fn(tileX, tileY)
      );
    });
  }

  get width() {
    return this.tiles[0].length;
  }

  get height() {
    return this.tiles.length;
  }

  get tileWidth() {
    return this.game.canvas.width / this.width;
  }

  get tileHeight() {
    return this.game.canvas.height / this.height;
  }

  render(canvas, ctx) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.tiles[y][x]) {
          ctx.fillStyle = "black";
          ctx.fillRect(
            x * this.tileWidth,
            y * this.tileHeight,
            this.tileWidth,
            this.tileHeight
          );
        }
      }
    }
  }

  addListener(listener) {
    this.listeners.push(listener);
    return listener;
  }

  removeListener(listener) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  fireListeners(listenerFilter, callback = (fn) => fn()) {
    this.listeners.filter(listenerFilter).forEach(({ fn }) => callback(fn));
  }

  onClick(fn) {
    this.addListener({ type: "click", fn });
  }
}

export class Player extends GameObject {
  constructor(game, x = 0, y = 0) {
    super(game);

    this.x = x;
    this.y = y;
  }

  render(canvas, ctx) {
    const { tileWidth, tileHeight } = this.game.grid;
    ctx.fillStyle = "blue";
    ctx.fillRect(
      tileWidth * this.x,
      tileHeight * this.y,
      tileWidth,
      tileHeight
    );
  }
}
