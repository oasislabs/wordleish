import chai, { expect } from 'chai';
import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';

import { Wordleish } from '../typechain-types';

describe('Wordleish', () => {
  let wordleish: Wordleish;

  beforeEach(async () => {
    const Wordleish = await ethers.getContractFactory('Wordleish');
    wordleish = await Wordleish.deploy();
  });

  it('rejects invalid words', async () => {
    // too short
    await expect(wordleish.startGame(a2i('cat'))).to.be.revertedWith(
      'wrong word length',
    );
    // too long
    await expect(wordleish.startGame(a2i('crayon'))).to.be.revertedWith(
      'wrong word length',
    );
    // character before 'a'
    await expect(wordleish.startGame(a2i('oasi`'))).to.be.revertedWith(
      'found invalid letter',
    );
    // character after 'z'
    await expect(wordleish.startGame(a2i('oasi{'))).to.be.revertedWith(
      'found invalid letter',
    );
  });

  it('starts game', async () => {
    await expect(wordleish.startGame(a2i('oasis')))
      .to.emit(wordleish, 'GameStarted')
      .withArgs(0);
    await expect(wordleish.startGame(a2i('oasis')))
      .to.emit(wordleish, 'GameStarted')
      .withArgs(1);
  });

  it('guess correctly', async () => {
    await wordleish.startGame(a2i('oasis'));
    expectMask(
      await wordleish.callStatic.guess(0, a2i('oasis')),
      [2, 2, 2, 2, 2],
    );
  });

  it('guess incorrectly', async () => {
    await wordleish.startGame(a2i('oasis'));
    expectMask(
      await wordleish.callStatic.guess(0, a2i('zzzzz')),
      [0, 0, 0, 0, 0],
    );
  });

  it('guess mispositioned', async () => {
    await wordleish.startGame(a2i('oasis'));
    expectMask(
      await wordleish.callStatic.guess(0, a2i('opals')),
      [2, 0, 1, 0, 2],
    );
  });

  it('guess multi-letter', async () => {
    await wordleish.startGame(a2i('oasis'));
    expectMask(
      await wordleish.callStatic.guess(0, a2i('sassy')),
      [1, 2, 2, 0, 0],
    );
  });

  it('submit', async () => {
    await wordleish.startGame(a2i('oasis'));
    await expect(wordleish.guess(0, a2i('oasis')))
      .to.emit(wordleish, 'GameSolved')
      .withArgs(0);
  });
});

function a2i(word: string): BigNumber {
  const bytes = Buffer.alloc(32);
  bytes.write(word);
  return BigNumber.from(bytes);
}

function expectMask(actual: BigNumber, expected: number[]) {
  const maskBytes = actual.isZero()
    ? Buffer.alloc(32)
    : Buffer.from(actual.toHexString().slice(2), 'hex');
  for (let i = 0; i < 5; i++) {
    expect(maskBytes[i]).to.equal(expected[i], `mismatch at position ${i}`);
  }
}
