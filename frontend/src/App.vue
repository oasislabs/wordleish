<script setup lang="ts">
import { watch } from 'vue';
import { RouterLink, RouterView } from 'vue-router';

// import AccountPicker from './components/AccountPicker.vue';
import { Network, useEthereumStore } from './stores/ethereum';

const eth = useEthereumStore();

watch(eth, async (eth) => {
  if (
    eth.network !== Network.SapphireTestnet &&
    eth.network !== Network.SapphireMainnet
  )
    await eth.switchNetwork(Network.SapphireMainnet);
});
</script>

<template>
  <header class="flex flex-row justify-between p-2">
    <RouterLink to="/">
      <h1 class="mx-5 text-xl font-medium" style="line-height: 40px">
        📚 Wordleish
      </h1>
    </RouterLink>
    <div class="flex items-center">
      <!-- <AccountPicker class="border border-gray-900 py-1 px-2 rounded-lg mx-5" /> -->
    </div>
  </header>

  <RouterView el="main" ref="rv" />
</template>

<style lang="postcss" scoped></style>
