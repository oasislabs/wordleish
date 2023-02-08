import { BigNumber } from 'ethers';
import type { ComputedRef } from 'vue';
import { computed } from 'vue';

import type { Wordleish } from '@oasislabs/wordleish-backend';
import { Wordleish__factory } from '@oasislabs/wordleish-backend';

import { Network, useEthereumStore } from './stores/ethereum';

export function useWordleish(): ComputedRef<{
  read: Wordleish;
  write?: Wordleish;
}> {
  const eth = useEthereumStore();
  return computed(() => {
    let addr = '0xdE5DAB93f9008D4A2A746EB4e3903bF835D8c7D4';
    if (eth.network === Network.SapphireTestnet) {
      addr = '0x40b81e081b1aF09875a07376bdAD27507774e9a3';
    }
    const read = Wordleish__factory.connect(addr, eth.provider);
    const write = eth.signer
      ? Wordleish__factory.connect(addr, eth.signer)
      : undefined;
    return { read, write };
  });
}

export function a2i(word: string): BigNumber {
  const bytes = new Uint8Array(32);
  new TextEncoder().encodeInto(word.toLowerCase(), bytes);
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
