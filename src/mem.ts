/******************************************************************************
 * C64 Emulator -- for the web                                                *
 * (c) 2022 by Andreas Schwenk, License: GPLv3                                *
 * mailto:contact@compiler-construction.com                                   *
 *****************************************************************************/

export abstract class Memory {
    abstract write(address: number, value: number): void;
    abstract read(address: number): number;
}
