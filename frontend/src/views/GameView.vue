<script setup lang="ts">
import { Dropdown } from 'floating-vue';
import { ref } from 'vue';
import { ContentLoader } from 'vue-content-loader';

import { LetterMatch, a2i, getMatches, useWordleish } from '../contracts';
import { checkBestEffort as checkWordBestEffort } from '../dictionary';
import { useEthereumStore } from '../stores/ethereum';

const props = defineProps<{ gameId: string }>();

const eth = useEthereumStore();
const wordleish = useWordleish();

const guess = ref('');
const guessProblem = ref('');
const guessProblemShown = ref(false);
const guessing = ref(false);
const guesses = ref<Array<{ letters: string; matches: LetterMatch[] }>>([]);
const won = ref(false);

async function makeGuess(e: Event): Promise<void> {
  e.preventDefault();
  try {
    if (guess.value.length < 5) throw new Error('This guess is too short.');
    if (guess.value.length > 5) throw new Error('This guess is too long.');
    if (!checkWordBestEffort(guess.value))
      throw new Error('This word is not recognized.');

    guessing.value = true;
    const mask = await wordleish.value.read.callStatic.guess(
      props.gameId,
      a2i(guess.value),
    );
    const matches = getMatches(mask);
    guesses.value.unshift({ letters: guess.value, matches });
    guessing.value = false;
    if (matches.every((m) => m == LetterMatch.Correct)) {
      await eth.connect();
      const tx = await wordleish.value.write!.guess(
        props.gameId,
        a2i(guess.value),
        { gasLimit: 300_000 },
      );
      console.log('submitted winning word in', tx.hash);
      const receipt = await tx.wait();
      if (receipt.status !== 1) throw new Error('Guess transaction failed.')
      console.log(receipt);
      won.value = true;
    }
    guess.value = '';
  } catch (e: any) {
    guessProblem.value = e.message;
    guessProblemShown.value = true;
  } finally {
    guessing.value = false;
  }
}
</script>

<template>
  <main style="max-width: 60ch" class="p-5 m-auto">
    <h1 class="font-medium text-3xl">#{{ gameId }}</h1>
    <form @submit="makeGuess">
      <Dropdown
        :triggers="[]"
        :shown="guessProblemShown"
        placement="top"
        @apply-hide="guessProblemShown = false"
      >
        <input
          title="five-letter English word"
          class="block my-4 p-2 mx-auto text-3xl text-center border border-gray-400 rounded-md"
          size="5"
          maxlength="5"
          :placeholder="won ? guesses[0].letters : 'guess'"
          v-model="guess"
          :disabled="won"
        />
        <template #popper>
          <p class="p-2">{{ guessProblem }}</p>
        </template>
      </Dropdown>
    </form>
    <table>
      <template v-if="guessing">
        <tr>
          <td v-for="n in 5" :key="n">
            <ContentLoader width="50" height="50">
              <rect x="0" y="0" rx="3" ry="3" width="50" height="50" />
            </ContentLoader>
          </td>
        </tr>
      </template>
      <tr v-for="(guess, i) in guesses" :key="i">
        <td
          v-for="j in 5"
          :key="i + ',' + j"
          class="letter-box"
          :data-match="guess.matches[j - 1]"
        >
          {{ guess.letters[j - 1] }}
        </td>
      </tr>
    </table>
  </main>
</template>

<style lang="postcss" scoped>
table {
  --cell-size: 50px;
  @apply m-auto mt-10 table-fixed border-separate border-spacing-1;
  width: calc(var(--cell-size) * 5);
}

td {
  @apply font-medium;
  box-sizing: border-box;
  font-family: monospace;
  font-size: 32px;
  width: var(--cell-size);
  height: var(--cell-size);
  text-align: center;
  line-height: calc(var(--cell-size) - 2px);
}

td[data-match='0'] {
  @apply bg-gray-400;
}

td[data-match='1'] {
  @apply bg-amber-300;
}

td[data-match='2'] {
  @apply bg-lime-500;
}
</style>
