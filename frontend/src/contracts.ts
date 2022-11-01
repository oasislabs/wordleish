import { BigNumber } from 'ethers';
import type { ComputedRef } from 'vue';
import { computed } from 'vue';

import type { Wordleish } from '@oasislabs/wordleish-backend';
import { Wordleish__factory } from '@oasislabs/wordleish-backend';

import { useEthereumStore } from './stores/ethereum';

export function useWordleish(): ComputedRef<{
  read: Wordleish;
  write?: Wordleish;
}> {
  const eth = useEthereumStore();
  const addr = '0x14C82fc6d33ef2AC1122bEB346F2Ce66Bc5ACF5F';
  return computed(() => {
    const read = Wordleish__factory.connect(addr, eth.provider);
    const write = eth.signer
      ? Wordleish__factory.connect(addr, eth.signer)
      : undefined;
    return { read, write };
  });
}

export function a2i(word: string): BigNumber {
  const bytes = new Uint8Array(32);
  new TextEncoder().encodeInto(word, bytes);
  return BigNumber.from(bytes);
}

export enum LetterMatch {
  Missing = 0,
  Present = 1,
  Correct = 2,
}

export function getMatches(mask: BigNumber): LetterMatch[] {
  const matches = [];
  for (let i = 0; i < 5; i++) {
    matches.push(
      mask
        .shr((31 - i) * 8)
        .and(0xff)
        .toNumber(),
    );
  }
  return matches;
}
