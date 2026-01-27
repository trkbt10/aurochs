/**
 * @file MS-CFB constants
 */

export const CFB_HEADER_SIZE = 512;

export const CFB_SIGNATURE = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

export const MAXREGSECT = 0xfffffff9;

export const DIFSECT = 0xfffffffc;
export const FATSECT = 0xfffffffd;
export const ENDOFCHAIN = 0xfffffffe;
export const FREESECT = 0xffffffff;

export const NOSTREAM = 0xffffffff;

