const process = require("process");
const rdl = require("readline");
class LoadingBar {
  constructor(size) {
    this.size = size;
    this.cursor = 0;
    this.timer = null;
  }
  start() {
    process.stdout.write("\x1B[?25l");
    for (let i = 0; i < this.size; i++) {
      process.stdout.write("\u2591");
    }
  }
  proceed(size) {
    let cursor = 0;
    this.cursor += size;
    rdl.cursorTo(process.stdout, cursor, 0);
    for (let i = 0; i < size; i++) {
      process.stdout.write("\u2588");
    }
  }
  complete() {
    this.proceed(100 - this.cursor);
  }
}
const ld = new LoadingBar(100);
ld.start();

module.exports.bar = ld;
