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

const visited = new Set<number>();
let last_pc = -1;

for (let i = 0; ; i++) {
    if (i % 1000000 == 0) {
        console.log(i);
    }
    try {
        const pc = cpu.getProgramCounter();
        if (pc == 0x3469 || pc == 0x346c) {
            console.log('executed ' + i + ' instructions');
            console.log('PC=0x' + pc.toString(16).padStart(4, '0'));
            console.log('SUCCEEDED');

            let lst = fs.readFileSync(
                '../c64emu-testdata/6502_65C02_functional_tests/' +
                    'bin_files/6502_functional_test.lst',
                'ascii',
            );
            for (const v of visited) {
                const addr = v.toString(16).padStart(4, '0');
                lst = lst.replace('\n' + addr + ' : ', '\n' + addr + '*: ');
            }
            fs.writeFileSync(
                '../c64emu-testdata/6502_65C02_functional_tests/' +
                    'bin_files/6502_functional_test_VISITED.lst',
                lst,
            );
            process.exit(0);
        } else if (pc == last_pc) {
            console.log('executed ' + i + ' instructions');
            console.log('PC=0x' + pc.toString(16).padStart(4, '0'));
            console.log('ERROR');
            process.exit(-1);
        } else if (pc == 0x3484 || i == 26764229) {
            const breakpoint = true;
        }
        visited.add(pc);
        let op = opc.mnemonics[mem.read(pc)];
        op = op.substring(0, 3) + ' (' + op.substring(4) + ')';
        const print = false; //pc >= 0x346f && pc <= 0x3492;
        if (print) {
            console.log('i=' + i + ', PC=' + number2Hex(pc, 4) + ', op=' + op);
        }
        cpu.step();
        const regs = cpu.getRegisters();
        if (print) {
            console.log('  -> ' + registersToString(regs));
            console.log('');
        }
        last_pc = pc;
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
