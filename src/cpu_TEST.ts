/******************************************************************************
 * C64 Emulator -- for the web                                                *
 * (c) 2022 by Andreas Schwenk, License: GPLv3                                *
 * mailto:contact@compiler-construction.com                                   *
 *****************************************************************************/

import * as assert from 'assert';
import * as fs from 'fs';

import { CPU } from './cpu';
import * as opc from './opc';

class SimpleMemory {
    private mem: Uint8Array;
    constructor() {
        this.mem = new Uint8Array(64 * 1024);
        this.mem.fill(0);
    }
    importFromFile(path: string): boolean {
        const bytes = fs.statSync(path).size;
        const fd = fs.openSync(path, 'r');
        const buffer = Buffer.alloc(bytes);
        fs.readSync(fd, buffer, 0, bytes, 0);
        fs.closeSync(fd);
        this.mem = new Uint8Array(buffer);
        return true;
    }
    write(address: number, value: number): void {
        assert.ok(address >= 0 && address < this.mem.length);
        this.mem[address] = value;
    }
    read(address: number): number {
        assert.ok(address >= 0 && address < this.mem.length);
        return this.mem[address];
    }
}

const mem = new SimpleMemory();
mem.importFromFile(
    '/Users/andi/Downloads/6502_65C02_functional_tests-master/' +
        '6502_functional_test.bin.corrected',
);

const cpu = new CPU(mem);

cpu.setProgramCounter(0x400);

for (let i = 0; i < 10; i++) {
    try {
        const pc = cpu.getProgramCounter();
        console.log(
            'PC=0x' +
                pc.toString(16).padStart(4, '0') +
                ',' +
                opc.mnemonics[mem.read(pc)],
        );
        cpu.step();
        console.log(cpu.getRegisters());
    } catch (e) {
        console.log(
            'ERROR: PC=0x' +
                cpu.getRegisters().pc.toString(16).padStart(4, '0'),
        );
        console.log(e);
    }
}
