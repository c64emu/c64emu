/******************************************************************************
 * C64 Emulator -- for the web                                                *
 * (c) 2022 by Andreas Schwenk, License: GPLv3                                *
 * mailto:contact@compiler-construction.com                                   *
 *****************************************************************************/

import { C64 } from './c64';

let c64: C64 = null;
let canvas: HTMLCanvasElement = null;

export function init(monitorCanvas: HTMLCanvasElement): void {
    c64 = new C64();
    canvas = monitorCanvas;
}

export function render(): void {
    c64.render();

    const imageData = new ImageData(c64.getBackBuffer(), 400);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.putImageData(imageData, 0, 0);
}
