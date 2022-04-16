/******************************************************************************
 * C64 Emulator -- for the web                                                *
 * (c) 2022 by Andreas Schwenk, License: GPLv3                                *
 * mailto:contact@compiler-construction.com                                   *
 *****************************************************************************/

import { CPU } from './cpu';
import { SID } from './sid';
import { VIC2 } from './vic2';
import { getROM, ROM } from './rom';

export class C64 {
    private errorLog = '';

    private cpu: CPU;
    private vic2: VIC2;
    private sid: SID;

    private ram: Uint8Array;
    private ramWritten: Uint8Array; // for debugging purposes

    private romKernal: Uint8Array;
    private romBasic: Uint8Array;
    private romCharacters: Uint8Array;

    constructor() {
        this.ram = new Uint8Array(64 * 1024);
        this.ram.fill(0);
        this.ramWritten = new Uint8Array(64 * 1024);
        this.ramWritten.fill(0);

        this.romKernal = getROM(ROM.KERNAL);
        this.romBasic = getROM(ROM.BASIC);
        this.romCharacters = getROM(ROM.CHARACTERS);

        this.cpu = new CPU(this);
        this.vic2 = new VIC2(this);
        this.sid = new SID(this);
    }

    getErrorLog(): string {
        return this.errorLog;
    }

    write(address: number, value: number): void {
        //TODO: depends on: const port = this.ram[1];
        if (address >= 0xd000 && address <= 0xd030) {
            this.vic2.write(address - 0xd000, value);
        } else {
            this.ram[address] = value;
            this.ramWritten[address] = 1;
        }
    }

    read(address: number): number {
        //TODO: depends on: const port = this.ram[1];
        //if (address >= 0xd000 && address <= 0xdfff)
        //    return this.romCharacters[address - 0xd000];
        if (address >= 0xd000 && address <= 0xd030)
            return this.vic2.read(address - 0xd00);
        else if (address >= 0xa000 && address <= 0xbfff)
            return this.romBasic[address - 0xa000];
        else if (address >= 0xe000 && address <= 0xffff)
            return this.romKernal[address - 0xe000];
        else {
            /*if (this.ramWritten[address] == 0)
                console.log(
                    'warning: RAM[' + address + '] is read before written',
                );*/
            return this.ram[address];
        }
    }

    readVic2(address: number): number {
        // TODO
        if (address >= 0xd000 && address <= 0xdfff)
            return this.romCharacters[address - 0xd000];
    }

    startDebugging(address: number): boolean {
        this.cpu.setProgramCounter(address);
        return true;
    }

    step(): boolean {
        try {
            this.cpu.step();
        } catch (e) {
            this.errorLog += e + '\n';
            return false;
        }
        return true;
    }

    getRegisters(): { [id: string]: number } {
        return this.cpu.getRegisters();
    }

    render(): void {
        /*// temp test:
        for (let i = 0; i < 1000; i++) this.write(0x0400 + i, 96);
        // "C64"
        this.write(0x0400, 3);
        this.write(0x0401, 54);
        this.write(0x0402, 52);

        // sprite tests
        // activate sprite 0 and 1:
        this.write(0xd015, 0x3);
        // pos x, y of sprite 0:
        this.write(0xd000, 100);
        this.write(0xd001, 100);
        // pos x, y of sprite 1:
        this.write(0xd002, 15);
        this.write(0xd003, 75);
        // set sprite pointer of sprite 0 and sprite 1 to location 12800:
        this.write(0x07f8 + 0, Math.floor(12800 / 64));
        this.write(0x07f8 + 1, Math.floor(12800 / 64));
        // set sprite data (smiley):
        const test_sprite_data = [
            0x00, 0x00, 0x00, 0x00, 0x3f, 0x80, 0x01, 0xc0, 0xe0, 0x03, 0x00,
            0x30, 0x06, 0x00, 0x10, 0x0c, 0x42, 0x10, 0x08, 0x42, 0x10, 0x08,
            0x42, 0x10, 0x10, 0x00, 0x10, 0x10, 0x00, 0x10, 0x10, 0x00, 0x10,
            0x11, 0x00, 0x90, 0x10, 0xc3, 0x90, 0x10, 0x3e, 0x30, 0x10, 0x00,
            0x20, 0x0c, 0x00, 0xe0, 0x07, 0xff, 0x80, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        ];
        for (let i = 0; i < 21 * 3; i++) {
            this.write(12800 + i, test_sprite_data[i]);
        }*/

        this.vic2.render(63 * 312);
    }

    getBackBuffer(): Uint8ClampedArray {
        return this.vic2.getBackBuffer();
    }
}
