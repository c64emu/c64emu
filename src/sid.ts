/******************************************************************************
 * C64 Emulator -- for the web                                                *
 * (c) 2022-2023 by Andreas Schwenk, License: GPLv3                           *
 * mailto:contact@compiler-construction.com                                   *
 *****************************************************************************/

// SID

import { C64 } from './c64';

export class SID {
    private c64: C64 = null;

    constructor(c64: C64) {
        this.c64 = c64;
    }
}
