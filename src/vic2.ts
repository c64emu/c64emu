/******************************************************************************
 * C64 Emulator -- for the web                                                *
 * (c) 2022 by Andreas Schwenk, License: GPLv3                                *
 * mailto:contact@compiler-construction.com                                   *
 *****************************************************************************/

// VIC II

import { C64 } from './c64';

// size in pixels

// total := including all blanks
const totalWidth = 504;
const totalHeight = 312;
// content := main area (without border and without blanks)
const contentWidth = 320;
const contentHeight = 200;
// border size is given per single border
const borderWidth = 40;
const borderHeight = 40;
// blanks are not rendered (used for simulation)
const blankWidth = (totalWidth - contentWidth - 2 * borderWidth) >> 1;
const blankHeight = (totalHeight - contentHeight - 2 * borderHeight) >> 1;
// dimensions of the rendered image
const renderWidth = contentWidth + 2 * borderWidth;
const renderHeight = contentHeight + 2 * borderHeight;

export class VIC2 {
    private c64: C64 = null;

    // color buffers
    // a) front buffer = currently updated frame (not visible in browser)
    private frontBuffer = new Uint8ClampedArray(renderWidth * renderHeight * 4);
    // b) back buffer = last frame (visible in browser)
    private backBuffer = new Uint8ClampedArray(renderWidth * renderHeight * 4);

    // VIC2 registers
    private registers: Uint8Array;

    // current position
    private x = 0; // 0 .. x .. 319
    private y = 0; // 0 .. y .. 199

    // RGBA values for each of the 16 colors
    private colors: Array<Array<number>> = [
        [0x00, 0x00, 0x00, 0xff],
        [0xff, 0xff, 0xff, 0xff],
        [0x92, 0x4a, 0x40, 0xff],
        [0x84, 0xc5, 0xcc, 0xff],
        [0x93, 0x51, 0xb6, 0xff],
        [0x72, 0xb1, 0x4b, 0xff],
        [0x48, 0x3a, 0xaa, 0xff],
        [0xd5, 0xdf, 0x7c, 0xff],
        [0x67, 0x52, 0x00, 0xff],
        [0xc3, 0x3d, 0x00, 0xff],
        [0xc1, 0x81, 0x78, 0xff],
        [0x60, 0x60, 0x60, 0xff],
        [0x8a, 0x8a, 0x8a, 0xff],
        [0xb3, 0xec, 0x91, 0xff],
        [0x86, 0x7a, 0xde, 0xff],
        [0xb3, 0xb3, 0xb3, 0xff],
    ];

    constructor(c64: C64) {
        this.registers = new Uint8Array(48);
        this.registers.fill(0);
        this.c64 = c64;
    }

    write(address: number, value: number): void {
        // TODO: assert address
        this.registers[address] = value;
    }

    read(address: number): number {
        // TODO: assert address
        return this.registers[address];
    }

    render(cpuCycles: number): void {
        let x = this.x;
        let y = this.y;

        // TODO: the following code assumes that VIC II uses the default memory bank
        const screenAddress = 0x0400;
        const characterRomAddress = 0xd000;
        let color: number[];

        for (let vic2Cycle = 0; vic2Cycle < cpuCycles * 8; vic2Cycle++) {
            const xRender = x - blankWidth;
            const yRender = y - blankHeight;
            const xContent = xRender - borderWidth;
            const yContent = yRender - borderWidth;
            if (
                xRender >= 0 &&
                xRender < renderWidth &&
                yRender >= 0 &&
                yRender < renderHeight
            ) {
                const position = (yRender * renderWidth + xRender) * 4;
                color = this.colors[14]; // TODO: border color
                if (
                    xContent >= 0 &&
                    xContent < contentWidth &&
                    yContent >= 0 &&
                    yContent < contentHeight
                ) {
                    // background color
                    color = this.colors[6]; // TODO: background color

                    // character (25 rows, 40 cols in total; each 8x8 pixels)
                    const character = this.c64.read(
                        screenAddress + (yContent >> 3) * 40 + (xContent >> 3),
                    );
                    const pattern = this.c64.readVic2(
                        characterRomAddress + character * 8 + (yContent % 8),
                    );
                    if (((pattern >> (7 - (xContent % 8))) & 1) == 1) {
                        color = this.colors[14]; // TODO: color!
                    }

                    // sprites (width: 24 pixels, height: 21 pixels [TODO: optional 2x scaling])
                    const spriteEnabled = this.registers[0x15];
                    for (let i = 7; i >= 0; i--) {
                        if (((spriteEnabled >> i) & 0x01) == 0) continue;
                        let spritePositionX =
                            this.registers[0 + i * 2] |
                            (((this.registers[16] >> i) & 0x01) << 8);
                        let spritePositionY = this.registers[1 + i * 2];
                        spritePositionX -= 24;
                        spritePositionY -= 30;
                        if (
                            xContent < spritePositionX ||
                            xContent >= spritePositionX + 24 ||
                            yContent < spritePositionY ||
                            yContent >= spritePositionY + 21
                        ) {
                            continue;
                        }
                        const spriteMemoryLocation =
                            this.c64.read(0x07f8 + i) * 64; // TODO!
                        const spriteLocalX = xContent - spritePositionX;
                        const spriteLocalY = yContent - spritePositionY;
                        const k = spriteLocalY * 3 + (spriteLocalX >> 3);
                        const spriteByte = this.c64.read(
                            spriteMemoryLocation + k,
                        );
                        if (
                            ((spriteByte >> (7 - (spriteLocalX % 8))) & 0x01) ==
                            1
                        ) {
                            color = this.colors[this.registers[39 + i]];
                        }
                    }
                }
                // set color to front buffer
                this.frontBuffer.set(color, position);
            }

            // update current position
            x++;
            if (x >= totalWidth) {
                x = 0;
                y++;
                if (y >= totalHeight) {
                    // once we finished a frame, the back buffer is overwritten
                    this.backBuffer = new Uint8ClampedArray(this.frontBuffer);
                    y = 0;
                }
            }
        }

        // write position attributes
        this.x = x;
        this.y = y;
    }

    getBackBuffer(): Uint8ClampedArray {
        return this.backBuffer;
    }
}
