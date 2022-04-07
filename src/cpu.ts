/******************************************************************************
 * C64 Emulator -- for the web                                                *
 * (c) 2022 by Andreas Schwenk, License: GPLv3                                *
 * mailto:contact@compiler-construction.com                                   *
 *****************************************************************************/

// MOS 6510

import { C64 } from './c64';

// const operationCycles = [7];

export class CPU {
    private cycle = 0; // current cycle

    private pc = 0; // program counter (2 bytes)
    private sp = 0; // stack pointer (1 byte)
    private a = 0; // accumulator (1 byte)
    private x = 0; // x register (1 byte)
    private y = 0; // y register (1 byte)

    private sN = false; // status register bit N (negative, bit 7)
    private sV = false; // status register bit V (overflow, bit 6)
    private sB = false; // status register bit B (break, bit 4)
    private sD = false; // status register bit D (decimal, bit 3)
    private sI = false; // status register bit I (interrupt, bit 2)
    private sZ = false; // status register bit Z (zero, bit 1)
    private sC = false; // status register bit C (carry, bit 0)

    private c64: C64 = null;

    constructor(c64: C64) {
        this.c64 = c64;
    }

    step(): void {
        let addr = 0,
            v1 = 0,
            v2 = 0,
            cond = false;
        const opcode = this.c64.read(this.pc++);

        // read memory (special cases are handled below)
        switch(opcode) {
            case 0x09:
            case 0x29:
            case 0x69:
            case 0xa0:
            case 0xa2:
            case 0xa9:
            case 0xc0:
            case 0xc9:
            case 0xe0:
                v1 = this.readImmediate(2);
                break;
            case 0x05:
            case 0x25:
            case 0x65:
            case 0xa4:
            case 0xa5:
            case 0xa6:
            case 0xc4:
            case 0xc5:
            case 0xe4:
                v1 = this.readZeroPage(3);
                break;
            case 0x15:
            case 0x35:
            case 0x75:
            case 0xb4:
            case 0xb5:
            case 0xd5:
                v1 = this.readZeroPageX(4);
                break;
            case 0xb6:
                v1 = this.readZeroPageY(4);
                break;
            case 0x0d:
            case 0x2d:
            case 0x6d:
            case 0xac:
            case 0xad:
            case 0xae:
            case 0xcc:
            case 0xcd:
            case 0xec:
                v1 = this.readAbsolute(4);
                break;
            case 0x1d:
            case 0x3d:
            case 0x7d:
            case 0xbc:
            case 0xbd:
            case 0xdd:
                v1 = this.readAbsoluteX(4, 1);
                break;
            case 0x19:
            case 0x39:
            case 0x79:
            case 0xb9:
            case 0xbe:
            case 0xd9:
                v1 = this.readAbsoluteY(4, 1);
                break;
            case 0x01:
            case 0x21:
            case 0x61:
            case 0xa1:
            case 0xc1:
                v1 = this.readIndirectX(6);
                break;
            case 0x11:
            case 0x31:
            case 0x71:
            case 0xb1:
            case 0xd1:
                v1 = this.readIndirectY(5, 1);
                break;
        }

        // operation
        switch (opcode) {
            // ADC --- Add Memory to Accumulator with Carry
            case 0x69:
            case 0x65:
            case 0x75:
            case 0x6d:
            case 0x7d:
            case 0x79:
            case 0x61:
            case 0x71:
                v2 = this.a + v1 + (this.sC ? 1 : 0);
                this.sC = v2 > 0xff;
                this.sV = !((this.a ^ v1) & 0x80 && (this.a ^ v2) & 0x80);
                this.a = v2 & 0xff;
                this.sN = this.a >> 7 == 1;
                this.sZ = this.a == 0;
                break;
            // AND --- AND Memory with Accumulator
            case 0x29:
            case 0x25:
            case 0x35:
            case 0x2d:
            case 0x3d:
            case 0x39:
            case 0x21:
            case 0x31:
                this.a &= v1;
                this.sN = this.a >> 7 == 1;
                this.sZ = this.a == 0;
                break;
            // ORA --- OR Memory with Accumulator
            case 0x09:
            case 0x05:
            case 0x15:
            case 0x0d:
            case 0x1d:
            case 0x19:
            case 0x01:
            case 0x11:
                this.a |= v1;
                this.sN = this.a >> 7 == 1;
                this.sZ = this.a == 0;
                break;
            // CMP --- Compare Memory with Accumulator
            case 0xc9:
            case 0xc5:
            case 0xd5:
            case 0xcd:
            case 0xdd:
            case 0xd9:
            case 0xc1:
            case 0xd1:
                v2 = this.a - v1;
                this.sN = v2 >> 7 == 1;
                this.sZ = v2 == 0;
                this.sC = v2 >= 0;
                break;
            // CPX --- Compare Memory with Index X
            case 0xe0:
            case 0xe4:
            case 0xec:
                v2 = this.x - v1;
                this.sN = v2 >> 7 == 1;
                this.sZ = v2 == 0;
                this.sC = v2 >= 0;
                break;
            // CPY --- Compare Memory with Index Y
            case 0xc0:
            case 0xc4:
            case 0xcc:
                v2 = this.y - v1;
                this.sN = v2 >> 7 == 1;
                this.sZ = v2 == 0;
                this.sC = v2 >= 0;
                break;
            // LDA --- Load Accumulator with Memory
            case 0xa9:
            case 0xa5:
            case 0xb5:
            case 0xad:
            case 0xbd:
            case 0xb9:
            case 0xa1:
            case 0xb1:
                this.a = v1;
                this.sN = this.a >> 7 == 1;
                this.sZ = this.a == 0;
                break;
            // LDX --- Load Index X with Memory
            case 0xa2:
            case 0xa6:
            case 0xb6:
            case 0xae:
            case 0xbe:
                this.x = v1;
                this.sN = this.x >> 7 == 1;
                this.sZ = this.x == 0;
                break;
            // LDY --- Load Index Y with Memory
            case 0xa0:
            case 0xa4:
            case 0xb4:
            case 0xac:
            case 0xbc:
                this.y = v1;
                this.sN = this.y >> 7 == 1;
                this.sZ = this.y == 0;
                break;
            // STA --- Store Accumulator in Memory
            case 0x85:
                this.writeZeroPage(this.a, 3);
                break;
            case 0x95:
                this.writeZeroPageX(this.a, 4);
                break;
            case 0x8d:
                this.writeAbsolute(this.a, 4);
                break;
            case 0x9d:
                this.writeAbsoluteX(this.a, 5);
                break;
            case 0x99:
                this.writeAbsoluteY(this.a, 5);
                break;
            case 0x81:
                this.writeIndirectX(this.a, 6);
                break;
            case 0x91:
                this.writeIndirectY(this.a, 6);
                break;
            // STX --- Store Index X in Memory
            case 0x86:
                this.writeZeroPage(this.x, 3);
                break;
            case 0x96:
                this.writeZeroPageY(this.x, 4);
                break;
            case 0x8e:
                this.writeAbsolute(this.x, 4);
                break;
            // STY --- Store Index Y in Memory
            case 0x84:
                this.writeZeroPage(this.y, 3);
                break;
            case 0x94:
                this.writeZeroPageX(this.y, 4);
                break;
            case 0x8c:
                this.writeAbsolute(this.y, 4);
                break;
            // TAX --- Transfer Accumulator to Index X
            case 0xaa:
                this.x = this.a;
                this.sN = this.x >> 7 == 1;
                this.sZ = this.x == 0;
                this.cycle += 2;
                break;
            // TSX --- Transfer Stack pointer to Index X
            case 0xba:
                this.x = this.sp;
                this.sN = this.x >> 7 == 1;
                this.sZ = this.x == 0;
                this.cycle += 2;
                break;
            // TXA --- Transfer Index X to Accumulator
            case 0x8a:
                this.a = this.x;
                this.sN = this.a >> 7 == 1;
                this.sZ = this.a == 0;
                this.cycle += 2;
                break;
            // TXS --- Transfer Index X to Stack Pointer
            case 0x9a:
                this.sp = this.x;
                this.sN = this.sp >> 7 == 1;
                this.sZ = this.sp == 0;
                this.cycle += 2;
                break;
            // TYA --- Transfer Index Y to Accumulator
            case 0x98:
                this.a = this.y;
                this.sN = this.a >> 7 == 1;
                this.sZ = this.a == 0;
                this.cycle += 2;
                break;
            // TAY --- Transfer Accumulator to Index Y
            case 0xa8:
                this.y = this.a;
                this.sN = this.y >> 7 == 1;
                this.sZ = this.y == 0;
                this.cycle += 2;
                break;
            // INX --- Increment Index X by One
            case 0xe8:
                this.pc++;
                this.x = (this.x + 1) & 0xff;
                this.sN = this.x >> 7 == 1;
                this.sZ = this.x == 0;
                this.cycle += 2;
                break;
            // INY --- Increment Index Y by One
            case 0xc8:
                this.pc++;
                this.y = (this.y + 1) & 0xff;
                this.sN = this.x >> 7 == 1;
                this.sZ = this.x == 0;
                this.cycle += 2;
                break;
            // NOP --- No Operation
            case 0xea:
                this.pc++;
                this.cycle += 2;
                break;
            // SEC --- Set Carry Flag
            case 0x38:
                this.pc++;
                this.sC = true;
                this.cycle += 2;
                break;
            // CLC --- Clear Carry Flag
            case 0x18:
                this.pc++;
                this.sC = false;
                this.cycle += 2;
                break;
            // SED --- Set Decimal Flag
            case 0xf8:
                this.pc++;
                this.sD = true;
                this.cycle += 2;
                break;
            // CLD --- Clear Decimal Flag
            case 0xd8:
                this.pc++;
                this.sD = false;
                this.cycle += 2;
                break;
            // CLI --- Clear Interrupt Disable Bit
            case 0x58:
                this.pc++;
                this.sI = false;
                this.cycle += 2;
                break;
            // CLV --- Clear Overflow Flag
            case 0xb8:
                this.pc++;
                this.sV = false;
                this.cycle += 2;
                break;
            // LSR --- Shift One Bit Right
            case 0x4a:
            case 0x46:
            case 0x56:
            case 0x4e:
            case 0x5e:
                switch (opcode) {
                    case 0x4a:
                        v1 = this.a;
                        this.cycle += 2;
                        break;
                    case 0x46:
                        v1 = this.readZeroPage(5);
                        break;
                    case 0x56:
                        v1 = this.readZeroPageX(6);
                        break;
                    case 0x4e:
                        v1 = this.readAbsolute(6);
                        break;
                    case 0x5e:
                        v1 = this.readAbsoluteX(7);
                        break;
                }
                this.sC = (v1 & 0x01) == 1;
                v1 >>= 1;
                this.sZ = v1 == 0;
                switch (opcode) {
                    case 0x4a:
                        this.a = v1;
                        break;
                    case 0x46:
                        this.writeZeroPage(v1);
                        break;
                    case 0x56:
                        this.readZeroPageX(v1);
                        break;
                    case 0x4e:
                        this.readAbsolute(v1);
                        break;
                    case 0x5e:
                        this.readAbsoluteX(v1);
                        break;
                }
                break;
            // PHA --- Push Accumulator on Stack
            case 0x48:
                this.c64.write(0x100 + this.sp, this.a);
                this.sp--;
                this.sp &= 0xff;
                this.cycle += 3;
                break;
            // PHP --- Push Processor Status on Stack
            case 0x08:
                v1 = (this.sN ? 1 : 0) << 7;
                v1 |= (this.sV ? 1 : 0) << 6;
                v1 |= 1 << 5;
                v1 |= 1 << 4;
                v1 |= (this.sD ? 1 : 0) << 3;
                v1 |= (this.sI ? 1 : 0) << 2;
                v1 |= (this.sZ ? 1 : 0) << 1;
                v1 |= (this.sC ? 1 : 0) << 0;
                this.c64.write(0x100 + this.sp, v1);
                this.sp--;
                this.sp &= 0xff;
                this.cycle += 3;
                break;
            // PLA --- Pull Accumulator from Stack
            case 0x68:
                this.sp++;
                this.sp &= 0xff;
                this.a = this.c64.read(0x100 + this.sp);
                this.sN = this.a >> 7 == 1;
                this.sZ = this.a == 0;
                this.cycle += 4;
                break;
            // BCC --- Branch on Carry Clear
            // BCC --- Branch on Carry Set
            // BEQ --- Branch on Result Zero
            // BMI --- Branch on Result Minus
            // BNE --- Branch on Result not Zero
            // BPL --- Branch on Result Plus
            // BVC --- Branch on Overflow Clear
            // BVS --- Branch on Overflow Set
            case 0x90:
            case 0xb0:
            case 0xf0:
            case 0x30:
            case 0xd0:
            case 0x10:
            case 0x50:
            case 0x70:
                switch (opcode) {
                    // BCC --- Branch on Carry Clear
                    case 0x90:
                        cond = !this.sC;
                        break;
                    // BCC --- Branch on Carry Set
                    case 0xb0:
                        cond = this.sC;
                        break;
                    // BEQ --- Branch on Result Zero
                    case 0xf0:
                        cond = this.sZ;
                        break;
                    // BMI --- Branch on Result Minus
                    case 0x30:
                        cond = this.sN;
                        break;
                    // BNE --- Branch on Result not Zero
                    case 0xd0:
                        cond = !this.sZ;
                        break;
                    // BPL --- Branch on Result Plus
                    case 0x10:
                        cond = !this.sN;
                        break;
                    // BVC --- Branch on Overflow Clear
                    case 0x50:
                        cond = !this.sV;
                        break;
                    // BVS --- Branch on Overflow Set
                    case 0x70:
                        cond = this.sV;
                        break;
                }
                addr = this.c64.read(this.pc++);
                if (addr >> 7 == 1) addr = -((~addr + 1) & 0xff);
                if (cond) {
                    this.cycle += this.pc >> 8 != (this.pc + addr) >> 8 ? 2 : 1;
                    this.pc += addr;
                }
                this.cycle += 2;
                break;

            default:
                throw Error('unimplemented opcode ' + opcode);
        }
    }

    readImmediate(cycles = 0): number {
        this.cycle += cycles;
        return this.c64.read(this.pc++);
    }

    readZeroPage(cycles = 0): number {
        this.cycle += cycles;
        const addr = this.c64.read(this.pc++);
        return this.c64.read(addr);
    }

    writeZeroPage(value: number, cycles = 0): void {
        this.cycle += cycles;
        const addr = this.c64.read(this.pc++);
        this.c64.write(addr, value);
    }

    readZeroPageX(cycles = 0): number {
        this.cycle += cycles;
        const addr = this.c64.read(this.pc++) + this.x;
        return this.c64.read(addr);
    }

    writeZeroPageX(value: number, cycles = 0): void {
        this.cycle += cycles;
        const addr = this.c64.read(this.pc++) + this.x;
        this.c64.write(addr, value);
    }

    readZeroPageY(cycles = 0): number {
        this.cycle += cycles;
        const addr = this.c64.read(this.pc++) + this.y;
        return this.c64.read(addr);
    }

    writeZeroPageY(value: number, cycles = 0): void {
        this.cycle += cycles;
        const addr = this.c64.read(this.pc++) + this.y;
        this.c64.write(addr, value);
    }

    readAbsolute(cycles = 0): number {
        this.cycle += cycles;
        const addr = this.c64.read(this.pc++) | (this.c64.read(this.pc++) << 8);
        return this.c64.read(addr);
    }

    writeAbsolute(value: number, cycles = 0): void {
        this.cycle += cycles;
        const addr = this.c64.read(this.pc++) | (this.c64.read(this.pc++) << 8);
        this.c64.write(addr, value);
    }

    readAbsoluteX(cycles = 0, pageBoundaryCycles = 0): number {
        this.cycle += cycles;
        const addr = this.c64.read(this.pc++) | (this.c64.read(this.pc++) << 8);
        if (addr >> 8 != (addr + this.x) >> 8) this.cycle += pageBoundaryCycles;
        return this.c64.read(addr + this.x);
    }

    writeAbsoluteX(value: number, cycles = 0): void {
        this.cycle += cycles;
        const addr = this.c64.read(this.pc++) | (this.c64.read(this.pc++) << 8);
        this.c64.write(addr + this.x, value);
    }

    readAbsoluteY(cycles = 0, pageBoundaryCycles = 0): number {
        this.cycle += cycles;
        const addr = this.c64.read(this.pc++) | (this.c64.read(this.pc++) << 8);
        if (addr >> 8 != (addr + this.y) >> 8) this.cycle += pageBoundaryCycles;
        return this.c64.read(addr + this.y);
    }

    writeAbsoluteY(value: number, cycles = 0): void {
        this.cycle += cycles;
        const addr = this.c64.read(this.pc++) | (this.c64.read(this.pc++) << 8);
        this.c64.write(addr + this.y, value);
    }

    readIndirectX(cycles = 0): number {
        this.cycle += cycles;
        let addr = this.c64.read(this.pc++) + this.x;
        addr = this.c64.read(addr) | (this.c64.read(addr + 1) << 8);
        return this.c64.read(addr);
    }

    writeIndirectX(value: number, cycles = 0): void {
        this.cycle += cycles;
        let addr = this.c64.read(this.pc++) + this.x;
        addr = this.c64.read(addr) | (this.c64.read(addr + 1) << 8);
        this.c64.write(addr + this.y, value);
    }

    readIndirectY(cycles = 0, pageBoundaryCycles = 0): number {
        this.cycle += cycles;
        let addr = this.c64.read(this.pc++);
        addr = this.c64.read(addr) | (this.c64.read(addr + 1) << 8);
        if (addr >> 8 != (addr + this.y) >> 8) this.cycle += pageBoundaryCycles;
        return this.c64.read(addr + this.y);
    }

    writeIndirectY(value: number, cycles = 0): void {
        this.cycle += cycles;
        let addr = this.c64.read(this.pc++);
        addr = this.c64.read(addr) | (this.c64.read(addr + 1) << 8);
        this.c64.write(addr + this.y, value);
    }
}
