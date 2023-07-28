/******************************************************************************
 * C64 Emulator -- for the web                                                *
 * (c) 2022-2023 by Andreas Schwenk, License: GPLv3                           *
 * mailto:contact@compiler-construction.com                                   *
 *****************************************************************************/

// MOS 6510

import { Memory } from './mem';

// const operationCycles = [7];

export class CPU {
    /**
     * Creates the MOS 6510 CPU.
     * @param {Memory} mem - The main memory.
     * @private @property {number} cycle - The current cycle.
     * @private @property {number} pc - The program counter (2 bytes).
     * @private @property {number} sp - The stack pointer (1 byte).
     * @private @property {number} a - The accumulator (1 byte).
     * @private @property {number} x - The x register (1 byte).
     * @private @property {number} y - The y register (1 byte).
     * @private @property {boolean} sN - The status reg bit N (negative, bit 7)
     * @private @property {boolean} sV - The status reg bit V (overflow, bit 6)
     * @private @property {boolean} sB - The status reg bit B (break, bit 4)
     * @private @property {boolean} sD - The status reg bit D (decimal, bit 3)
     * @private @property {boolean} sI - The status reg bit I (interrupt, bit 2)
     * @private @property {boolean} sZ - The status reg bit Z (zero, bit 1)
     * @private @property {boolean} sC - The status reg bit C (carry, bit 0)
     */
    constructor(mem) {
        this.cycle = 0;
        this.pc = this.sp = this.a = this.x = this.y = 0;
        this.sN = this.sV = this.sB = this.sD = false;
        this.sI = this.sZ = this.sC = false;
        this.mem = null;
    }

    /**
     *
     * @param {number} address
     * @returns {void}
     */
    setProgramCounter(address) {
        this.pc = address & 0xffff;
    }

    /**
     *
     * @returns {number}
     */
    getProgramCounter() {
        return this.pc;
    }

    /**
     *
     * @returns { Object.<string,number> }
     */
    getRegisters() {
        return {
            pc: this.pc,
            sp: this.sp,
            a: this.a,
            x: this.x,
            y: this.y,
            sN: this.sN ? 1 : 0,
            sV: this.sV ? 1 : 0,
            sB: this.sB ? 1 : 0,
            sD: this.sD ? 1 : 0,
            sI: this.sI ? 1 : 0,
            sZ: this.sZ ? 1 : 0,
            sC: this.sC ? 1 : 0,
        };
    }

    /**
     * @returns {void}
     */
    step() {
        let addr = 0,
            v1 = 0,
            v2 = 0,
            cond = false,
            carryIn = false;
        const opcode = this.mem.read(this.pc++);

        //console.log('OPCODE = 0x' + opcode.toString(16));

        // read memory (special cases are handled below)
        switch (opcode) {
            case 0x09:
            case 0x29:
            case 0x49:
            case 0x69:
            case 0xa0:
            case 0xa2:
            case 0xa9:
            case 0xc0:
            case 0xc9:
            case 0xe0:
            case 0xe9:
                v1 = this.readImmediate(2);
                break;
            case 0x05:
            case 0x24:
            case 0x25:
            case 0x45:
            case 0x65:
            case 0xa4:
            case 0xa5:
            case 0xa6:
            case 0xc4:
            case 0xc5:
            case 0xc6:
            case 0xe4:
            case 0xe5:
            case 0xe6:
                v1 = this.readZeroPage(3);
                break;
            case 0x15:
            case 0x35:
            case 0x55:
            case 0x75:
            case 0xb4:
            case 0xb5:
            case 0xd5:
            case 0xd6:
            case 0xf5:
            case 0xf6:
                v1 = this.readZeroPageX(4);
                break;
            case 0xb6:
                v1 = this.readZeroPageY(4);
                break;
            case 0x0d:
            case 0x2c:
            case 0x2d:
            case 0x4d:
            case 0x6d:
            case 0xac:
            case 0xad:
            case 0xae:
            case 0xcc:
            case 0xcd:
            case 0xce:
            case 0xec:
            case 0xed:
            case 0xee:
                v1 = this.readAbsolute(4);
                break;
            case 0x1d:
            case 0x3d:
            case 0x5d:
            case 0x7d:
            case 0xbc:
            case 0xbd:
            case 0xdd:
            case 0xde:
            case 0xfd:
            case 0xfe:
                v1 = this.readAbsoluteX(
                    4,
                    opcode != 0xfe && opcode != 0xde ? 1 : 0,
                );
                break;
            case 0x19:
            case 0x39:
            case 0x59:
            case 0x79:
            case 0xb9:
            case 0xbe:
            case 0xd9:
            case 0xf9:
                v1 = this.readAbsoluteY(4, 1);
                break;
            case 0x01:
            case 0x21:
            case 0x41:
            case 0x61:
            case 0xa1:
            case 0xc1:
            case 0xe1:
                v1 = this.readIndirectX(6);
                break;
            case 0x11:
            case 0x31:
            case 0x51:
            case 0x71:
            case 0xb1:
            case 0xd1:
            case 0xf1:
                v1 = this.readIndirectY(5, 1);
                break;
        }

        // operation
        switch (opcode) {
            // INC --- Increment Memory by One
            case 0xe6:
            case 0xf6:
            case 0xee:
            case 0xfe:
                v1 = (v1 + 1) & 0xff;
                this.sN = v1 >> 7 == 1;
                this.sZ = v1 == 0;
                switch (opcode) {
                    case 0xe6:
                        this.pc--;
                        this.writeZeroPage(v1, 2);
                        break;
                    case 0xf6:
                        this.pc--;
                        this.writeZeroPageX(v1, 2);
                        break;
                    case 0xee:
                        this.pc -= 2;
                        this.writeAbsolute(v1, 2);
                        break;
                    case 0xfe:
                        this.pc -= 2;
                        this.writeAbsoluteX(v1, 3);
                        break;
                }
                break;
            // DEC --- Decrement Memory by One
            case 0xc6:
            case 0xd6:
            case 0xce:
            case 0xde:
                v1 = (v1 - 1) & 0xff;
                this.sN = v1 >> 7 == 1;
                this.sZ = v1 == 0;
                switch (opcode) {
                    case 0xc6:
                        this.pc--;
                        this.writeZeroPage(v1, 2);
                        break;
                    case 0xd6:
                        this.pc--;
                        this.writeZeroPageX(v1, 2);
                        break;
                    case 0xce:
                        this.pc -= 2;
                        this.writeAbsolute(v1, 2);
                        break;
                    case 0xde:
                        this.pc -= 2;
                        this.writeAbsoluteX(v1, 3);
                        break;
                }
                break;
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
                this.sV =
                    ((this.a ^ v1) & 0x80) == 0 && ((this.a ^ v2) & 0x80) != 0;
                if (this.sD) {
                    // decimal mode
                    let lowNibble =
                        (this.a & 0xf) + (v1 & 0xf) + (this.sC ? 1 : 0);
                    const tmpCarry = lowNibble > 9;
                    if (tmpCarry) lowNibble -= 10;
                    let highNibble =
                        ((this.a >> 4) & 0xf) +
                        ((v1 >> 4) & 0xf) +
                        (tmpCarry ? 1 : 0);
                    this.sC = highNibble > 9;
                    if (this.sC) highNibble -= 10;
                    v2 = (highNibble << 4) | lowNibble;
                } else {
                    // binary mode
                    this.sC = v2 > 0xff;
                }
                this.a = v2 & 0xff;
                this.sN = this.a >> 7 == 1;
                this.sZ = this.a == 0;
                break;
            // SBC --- Subtract Memory from Accumulator with Borrow
            case 0xe9:
            case 0xe5:
            case 0xf5:
            case 0xed:
            case 0xfd:
            case 0xf9:
            case 0xe1:
            case 0xf1:
                v2 = this.a - v1 - (this.sC ? 0 : 1);
                this.sV =
                    ((this.a ^ v1) & 0x80) != 0 && ((this.a ^ v2) & 0x80) != 0;
                carryIn = this.sC;
                this.sC = (v2 & 0xffff) < 0x100;
                if (this.sD) {
                    const d1 = (this.a >> 4) * 10 + (this.a & 0xf);
                    const d2 = (v1 >> 4) * 10 + (v1 & 0xf);
                    let d = d1 - d2 - (carryIn ? 0 : 1);
                    if (d < 0) d += 100;
                    v2 = (Math.floor(d / 10) << 4) | d % 10;
                }
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
            // EOR --- Exclusive-OR with Accumulator
            case 0x49:
            case 0x45:
            case 0x55:
            case 0x4d:
            case 0x5d:
            case 0x59:
            case 0x41:
            case 0x51:
                this.a ^= v1;
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
                v2 = (this.a - v1) & 0xff;
                this.sN = v2 >> 7 == 1;
                this.sZ = v2 == 0;
                this.sC = this.a >= v1;
                break;
            // CPX --- Compare Memory with Index X
            case 0xe0:
            case 0xe4:
            case 0xec:
                v2 = (this.x - v1) & 0xff;
                this.sN = v2 >> 7 == 1;
                this.sZ = v2 == 0;
                this.sC = this.x >= v1;
                break;
            // CPY --- Compare Memory with Index Y
            case 0xc0:
            case 0xc4:
            case 0xcc:
                v2 = (this.y - v1) & 0xff;
                this.sN = v2 >> 7 == 1;
                this.sZ = v2 == 0;
                this.sC = this.y >= v1;
                break;
            // BIT --- Test Bits in Memory with Accumulator
            case 0x24:
            case 0x2c:
                this.sZ = (this.a & v1) == 0;
                this.sN = ((v1 >> 7) & 0x01) == 1;
                this.sV = ((v1 >> 6) & 0x01) == 1;
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
                this.x = (this.x + 1) & 0xff;
                this.sN = this.x >> 7 == 1;
                this.sZ = this.x == 0;
                this.cycle += 2;
                break;
            // DEX --- Decrement Index X by One
            case 0xca:
                this.x = (this.x - 1) & 0xff;
                this.sN = this.x >> 7 == 1;
                this.sZ = this.x == 0;
                this.cycle += 2;
                break;
            // INY --- Increment Index Y by One
            case 0xc8:
                this.y = (this.y + 1) & 0xff;
                this.sN = this.y >> 7 == 1;
                this.sZ = this.y == 0;
                this.cycle += 2;
                break;
            // DEX --- Decrement Index Y by One
            case 0x88:
                this.y = (this.y - 1) & 0xff;
                this.sN = this.y >> 7 == 1;
                this.sZ = this.y == 0;
                this.cycle += 2;
                break;
            // NOP --- No Operation
            case 0xea:
                this.cycle += 2;
                break;
            // SEC --- Set Carry Flag
            case 0x38:
                this.sC = true;
                this.cycle += 2;
                break;
            // CLC --- Clear Carry Flag
            case 0x18:
                this.sC = false;
                this.cycle += 2;
                break;
            // SED --- Set Decimal Flag
            case 0xf8:
                this.sD = true;
                this.cycle += 2;
                break;
            // CLD --- Clear Decimal Flag
            case 0xd8:
                this.sD = false;
                this.cycle += 2;
                break;
            // SEI --- Set Interrupt Disable Flag
            case 0x78:
                this.sI = true;
                this.cycle += 2;
                break;
            // CLI --- Clear Interrupt Disable Flag
            case 0x58:
                this.sI = false;
                this.cycle += 2;
                break;
            // CLV --- Clear Overflow Flag
            case 0xb8:
                this.sV = false;
                this.cycle += 2;
                break;
            // ASL --- Shift Left One Bit
            case 0x0a:
            case 0x06:
            case 0x16:
            case 0x0e:
            case 0x1e:
                switch (opcode) {
                    case 0x0a:
                        v1 = this.a;
                        this.cycle += 2;
                        break;
                    case 0x06:
                        v1 = this.readZeroPage(5);
                        break;
                    case 0x16:
                        v1 = this.readZeroPageX(6);
                        break;
                    case 0x0e:
                        v1 = this.readAbsolute(6);
                        break;
                    case 0x1e:
                        v1 = this.readAbsoluteX(7);
                        break;
                }
                this.sC = (v1 & 0x80) != 0;
                v1 <<= 1;
                v1 &= 0xff;
                this.sZ = v1 == 0;
                this.sN = v1 >> 7 == 1;
                switch (opcode) {
                    case 0x0a:
                        this.a = v1;
                        break;
                    case 0x06:
                        this.pc--;
                        this.writeZeroPage(v1);
                        break;
                    case 0x16:
                        this.pc--;
                        this.writeZeroPageX(v1);
                        break;
                    case 0x0e:
                        this.pc -= 2;
                        this.writeAbsolute(v1);
                        break;
                    case 0x1e:
                        this.pc -= 2;
                        this.writeAbsoluteX(v1);
                        break;
                }
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
                this.sN = false;
                switch (opcode) {
                    case 0x4a:
                        this.a = v1;
                        break;
                    case 0x46:
                        this.pc--;
                        this.writeZeroPage(v1);
                        break;
                    case 0x56:
                        this.pc--;
                        this.writeZeroPageX(v1);
                        break;
                    case 0x4e:
                        this.pc -= 2;
                        this.writeAbsolute(v1);
                        break;
                    case 0x5e:
                        this.pc -= 2;
                        this.writeAbsoluteX(v1);
                        break;
                }
                break;
            // ROL --- Rotate One Bit Left
            case 0x2a:
            case 0x26:
            case 0x36:
            case 0x2e:
            case 0x3e:
                switch (opcode) {
                    case 0x2a:
                        v1 = this.a;
                        this.cycle += 2;
                        break;
                    case 0x26:
                        v1 = this.readZeroPage(5);
                        break;
                    case 0x36:
                        v1 = this.readZeroPageX(6);
                        break;
                    case 0x2e:
                        v1 = this.readAbsolute(6);
                        break;
                    case 0x3e:
                        v1 = this.readAbsoluteX(7);
                        break;
                }
                v1 <<= 1;
                v1 |= this.sC ? 1 : 0;
                this.sC = v1 >> 8 == 1;
                v1 &= 0xff;
                this.sZ = v1 == 0;
                this.sN = v1 >> 7 == 1;
                switch (opcode) {
                    case 0x2a:
                        this.a = v1;
                        break;
                    case 0x26:
                        this.pc--;
                        this.writeZeroPage(v1);
                        break;
                    case 0x36:
                        this.pc--;
                        this.writeZeroPageX(v1);
                        break;
                    case 0x2e:
                        this.pc -= 2;
                        this.writeAbsolute(v1);
                        break;
                    case 0x3e:
                        this.pc -= 2;
                        this.writeAbsoluteX(v1);
                        break;
                }
                break;
            // ROR --- Rotate One Bit Right
            case 0x6a:
            case 0x66:
            case 0x76:
            case 0x6e:
            case 0x7e:
                switch (opcode) {
                    case 0x6a:
                        v1 = this.a;
                        this.cycle += 2;
                        break;
                    case 0x66:
                        v1 = this.readZeroPage(5);
                        break;
                    case 0x76:
                        v1 = this.readZeroPageX(6);
                        break;
                    case 0x6e:
                        v1 = this.readAbsolute(6);
                        break;
                    case 0x7e:
                        v1 = this.readAbsoluteX(7);
                        break;
                }
                v2 = v1 & 0x01; // new carry
                v1 >>= 1;
                v1 |= this.sC ? 1 << 7 : 0;
                this.sC = v2 == 1;
                v1 &= 0xff;
                this.sZ = v1 == 0;
                this.sN = v1 >> 7 == 1;
                switch (opcode) {
                    case 0x6a:
                        this.a = v1;
                        break;
                    case 0x66:
                        this.pc--;
                        this.writeZeroPage(v1);
                        break;
                    case 0x76:
                        this.pc--;
                        this.writeZeroPageX(v1);
                        break;
                    case 0x6e:
                        this.pc -= 2;
                        this.writeAbsolute(v1);
                        break;
                    case 0x7e:
                        this.pc -= 2;
                        this.writeAbsoluteX(v1);
                        break;
                }
                break;
            // PHA --- Push Accumulator on Stack
            case 0x48:
                this.mem.write(0x100 + this.sp, this.a);
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
                this.mem.write(0x100 + this.sp, v1);
                this.sp--;
                this.sp &= 0xff;
                this.cycle += 3;
                break;
            // PLP --- Pull Processor Status from Stack
            case 0x28:
                this.sp++;
                this.sp &= 0xff;
                v1 = this.mem.read(0x100 + this.sp);
                this.sN = ((v1 >> 7) & 0x01) == 0x01;
                this.sV = ((v1 >> 6) & 0x01) == 0x01;
                this.sD = ((v1 >> 3) & 0x01) == 0x01;
                this.sI = ((v1 >> 2) & 0x01) == 0x01;
                this.sZ = ((v1 >> 1) & 0x01) == 0x01;
                this.sC = ((v1 >> 0) & 0x01) == 0x01;
                this.cycle += 4;
                break;
            // PLA --- Pull Accumulator from Stack
            case 0x68:
                this.sp++;
                this.sp &= 0xff;
                this.a = this.mem.read(0x100 + this.sp);
                this.sN = this.a >> 7 == 1;
                this.sZ = this.a == 0;
                this.cycle += 4;
                break;
            // JMP --- Jump to new Location (absolute)
            case 0x4c:
                this.pc =
                    this.mem.read(this.pc++) | (this.mem.read(this.pc++) << 8);
                this.cycle += 3;
                break;
            // JMP --- Jump to new Location (indirect)
            case 0x6c:
                v1 = this.mem.read(this.pc++) | (this.mem.read(this.pc++) << 8);
                this.pc =
                    this.mem.read(v1) |
                    (this.mem.read((v1 & 0xff00) | ((v1 + 1) & 0xff)) << 8);
                this.cycle += 5;
                break;
            // JSR --- Jump to new Location Saving Return Address
            case 0x20:
                this.mem.write(0x100 + this.sp, ((this.pc + 1) >> 8) & 0xff);
                this.sp--;
                this.sp &= 0xff;
                this.mem.write(0x100 + this.sp, (this.pc + 1) & 0xff);
                this.sp--;
                this.sp &= 0xff;
                this.pc =
                    this.mem.read(this.pc++) | (this.mem.read(this.pc++) << 8);
                this.cycle += 6;
                break;
            // RTS --- Return from Subroutine
            case 0x60:
                this.sp++;
                this.sp &= 0xff;
                this.pc = this.mem.read(0x100 + this.sp);
                this.sp++;
                this.sp &= 0xff;
                this.pc |= this.mem.read(0x100 + this.sp) << 8;
                this.pc++;
                this.cycle += 6;
                break;
            // RTI --- Return from Interrupt
            case 0x40:
                this.sp++;
                this.sp &= 0xff;
                v1 = this.mem.read(0x100 + this.sp);
                this.sN = ((v1 >> 7) & 0x01) == 0x01;
                this.sV = ((v1 >> 6) & 0x01) == 0x01;
                this.sD = ((v1 >> 3) & 0x01) == 0x01;
                this.sI = ((v1 >> 2) & 0x01) == 0x01;
                this.sZ = ((v1 >> 1) & 0x01) == 0x01;
                this.sC = ((v1 >> 0) & 0x01) == 0x01;
                this.sp++;
                this.sp &= 0xff;
                this.pc = this.mem.read(0x100 + this.sp);
                this.sp++;
                this.sp &= 0xff;
                this.pc |= this.mem.read(0x100 + this.sp) << 8;
                this.cycle += 6;
                break;
            // BRK --- Force Break
            case 0x00:
                // push program counter on stack
                this.mem.write(0x100 + this.sp, ((this.pc + 1) >> 8) & 0xff);
                this.sp--;
                this.sp &= 0xff;
                this.mem.write(0x100 + this.sp, (this.pc + 1) & 0xff);
                this.sp--;
                this.sp &= 0xff;
                // push status register on stack
                v1 = (this.sN ? 1 : 0) << 7;
                v1 |= (this.sV ? 1 : 0) << 6;
                v1 |= 1 << 5;
                v1 |= 1 << 4;
                v1 |= (this.sD ? 1 : 0) << 3;
                v1 |= (this.sI ? 1 : 0) << 2;
                v1 |= (this.sZ ? 1 : 0) << 1;
                v1 |= (this.sC ? 1 : 0) << 0;
                this.mem.write(0x100 + this.sp, v1);
                this.sp--;
                this.sp &= 0xff;
                // set status flags
                this.sB = true;
                this.sI = true;
                // jump to address stored in 0xfffe and 0xffff
                this.pc = this.mem.read(0xfffe) | (this.mem.read(0xffff) << 8);
                this.cycle += 7;
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
                addr = this.mem.read(this.pc++);
                if (addr >> 7 == 1) addr = -((~addr + 1) & 0xff);
                if (cond) {
                    this.cycle += this.pc >> 8 != (this.pc + addr) >> 8 ? 2 : 1;
                    this.pc += addr;
                }
                this.cycle += 2;
                break;

            default:
                throw Error(
                    'unimplemented opcode 0x' +
                        opcode.toString(16).padStart(2, '0'),
                );
        }
    }

    /**
     *
     * @param {number} cycles
     * @returns {number}
     */
    readImmediate(cycles = 0) {
        this.cycle += cycles;
        return this.mem.read(this.pc++);
    }

    /**
     *
     * @param {number} cycles
     * @returns {number}
     */
    readZeroPage(cycles = 0) {
        this.cycle += cycles;
        const addr = this.mem.read(this.pc++);
        return this.mem.read(addr);
    }

    /**
     *
     * @param {number} value
     * @param {number} cycles
     * @returns {void}
     */
    writeZeroPage(value, cycles = 0) {
        this.cycle += cycles;
        const addr = this.mem.read(this.pc++);
        this.mem.write(addr, value);
    }

    /**
     *
     * @param {number} cycles
     * @returns {number}
     */
    readZeroPageX(cycles = 0) {
        this.cycle += cycles;
        const addr = (this.mem.read(this.pc++) + this.x) & 0xff;
        return this.mem.read(addr);
    }

    /**
     *
     * @param {number} value
     * @param {number} cycles
     * @returns {void}
     */

    writeZeroPageX(value, cycles = 0) {
        this.cycle += cycles;
        const addr = (this.mem.read(this.pc++) + this.x) & 0xff;
        this.mem.write(addr, value);
    }

    /**
     *
     * @param {number} cycles
     * @returns {number}
     */
    readZeroPageY(cycles = 0) {
        this.cycle += cycles;
        const addr = (this.mem.read(this.pc++) + this.y) & 0xff;
        return this.mem.read(addr);
    }

    /**
     *
     * @param {number} value
     * @param {number} cycles
     * @returns {void}
     */

    writeZeroPageY(value, cycles = 0) {
        this.cycle += cycles;
        const addr = (this.mem.read(this.pc++) + this.y) & 0xff;
        this.mem.write(addr, value);
    }

    /**
     *
     * @param {number} cycles
     * @returns {number}
     */
    readAbsolute(cycles = 0) {
        this.cycle += cycles;
        const addr = this.mem.read(this.pc++) | (this.mem.read(this.pc++) << 8);
        return this.mem.read(addr);
    }

    /**
     *
     * @param {number} value
     * @param {number} cycles
     * @returns {void}
     */

    writeAbsolute(value, cycles = 0) {
        this.cycle += cycles;
        const addr = this.mem.read(this.pc++) | (this.mem.read(this.pc++) << 8);
        this.mem.write(addr, value);
    }

    /**
     *
     * @param {number} cycles
     * @param {number} pageBoundaryCycles
     * @returns {number}
     */
    readAbsoluteX(cycles = 0, pageBoundaryCycles = 0) {
        this.cycle += cycles;
        const addr = this.mem.read(this.pc++) | (this.mem.read(this.pc++) << 8);
        if (addr >> 8 != (addr + this.x) >> 8) this.cycle += pageBoundaryCycles;
        return this.mem.read(addr + this.x);
    }

    /**
     *
     * @param {number} value
     * @param {number} cycles
     * @returns {void}
     */

    writeAbsoluteX(value, cycles = 0) {
        this.cycle += cycles;
        const addr = this.mem.read(this.pc++) | (this.mem.read(this.pc++) << 8);
        this.mem.write(addr + this.x, value);
    }

    /**
     *
     * @param {number} cycles
     * @param {number} pageBoundaryCycles
     * @returns {number}
     */
    readAbsoluteY(cycles = 0, pageBoundaryCycles = 0) {
        this.cycle += cycles;
        const addr = this.mem.read(this.pc++) | (this.mem.read(this.pc++) << 8);
        if (addr >> 8 != (addr + this.y) >> 8) this.cycle += pageBoundaryCycles;
        return this.mem.read(addr + this.y);
    }

    /**
     *
     * @param {number} value
     * @param {number} cycles
     * @returns {void}
     */

    writeAbsoluteY(value, cycles = 0) {
        this.cycle += cycles;
        const addr = this.mem.read(this.pc++) | (this.mem.read(this.pc++) << 8);
        this.mem.write(addr + this.y, value);
    }

    /**
     *
     * @param {number} cycles
     * @returns {number}
     */
    readIndirectX(cycles = 0) {
        this.cycle += cycles;
        let addr = (this.mem.read(this.pc++) + this.x) & 0xff;
        addr = this.mem.read(addr) | (this.mem.read(addr + 1) << 8);
        return this.mem.read(addr);
    }

    /**
     *
     * @param {number} value
     * @param {number} cycles
     * @returns {void}
     */

    writeIndirectX(value, cycles = 0) {
        this.cycle += cycles;
        let addr = (this.mem.read(this.pc++) + this.x) & 0xff;
        addr = this.mem.read(addr) | (this.mem.read(addr + 1) << 8);
        this.mem.write(addr, value);
    }

    /**
     *
     * @param {number} value
     * @param {number} pageBoundaryCycles
     * @returns {number}
     */

    readIndirectY(cycles = 0, pageBoundaryCycles = 0) {
        this.cycle += cycles;
        let addr = this.mem.read(this.pc++);
        addr = this.mem.read(addr) | (this.mem.read(addr + 1) << 8);
        if (addr >> 8 != (addr + this.y) >> 8) this.cycle += pageBoundaryCycles;
        return this.mem.read(addr + this.y);
    }

    /**
     *
     * @param {number} value
     * @param {number} cycles
     * @returns {void}
     */
    writeIndirectY(value, cycles = 0) {
        this.cycle += cycles;
        let addr = this.mem.read(this.pc++);
        addr = this.mem.read(addr) | (this.mem.read(addr + 1) << 8);
        this.mem.write(addr + this.y, value); // TODO: without carry??
    }
}
