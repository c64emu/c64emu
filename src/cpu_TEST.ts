/******************************************************************************
 * C64 Emulator -- for the web                                                *
 * (c) 2022 by Andreas Schwenk, License: GPLv3                                *
 * mailto:contact@compiler-construction.com                                   *
 *****************************************************************************/

import * as assert from 'assert';
import * as fs from 'fs';
import * as process from 'process';

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
    '../c64emu-testdata/6502_65C02_functional_tests/' +
        'bin_files/6502_functional_test.bin',
);

const cpu = new CPU(mem);

cpu.setProgramCounter(0x400);

/*mem.write(0x400, 0xc0);
mem.write(0x401, 0x01);
cpu.step();
const regs = cpu.getRegisters();
console.log('  -> ' + registersToString(regs));*/

for (let i = 0; i < 1000000; i++) {
    try {
        const pc = cpu.getProgramCounter();
        if (pc == 0x3469) {
            // succeeded
            const bp = 1337;
        }
        /*if (pc == 0x17ea) {
            const bp = 1337;
        }*/
        let op = opc.mnemonics[mem.read(pc)];
        op = op.substring(0, 3) + ' (' + op.substring(4) + ')';
        console.log('PC=' + number2Hex(pc, 4) + ', op=' + op);
        cpu.step();
        const regs = cpu.getRegisters();
        console.log('  -> ' + registersToString(regs));
        console.log('');
    } catch (e) {
        console.log(
            'ERROR: PC=0x' +
                cpu.getRegisters().pc.toString(16).padStart(4, '0'),
        );
        console.log(e);
        process.exit(-1);
    }
}

function number2Hex(v: number, digits = 2) {
    return '$' + v.toString(16).padStart(digits, '0').toUpperCase();
}

function registersToString(r: { [name: string]: number }) {
    let s = 'A=' + number2Hex(r['a']);
    s += ', X=' + number2Hex(r['x']);
    s += ', Y=' + number2Hex(r['y']);
    s += ', PC=' + number2Hex(r['pc'], 4);
    s += ', SP=' + number2Hex(r['sp']);
    s += ', N=' + r['sN'];
    s += ', V=' + r['sV'];
    s += ', B=' + r['sB'];
    s += ', D=' + r['sD'];
    s += ', I=' + r['sI'];
    s += ', Z=' + r['sZ'];
    s += ', C=' + r['sC'];
    return s;
}
