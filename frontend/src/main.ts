import FloatingVue from 'floating-vue';
import { createPinia } from 'pinia';
import { createApp } from 'vue';

import 'floating-vue/dist/style.css';

import App from './App.vue';
import './assets/main.css';
import router from './router';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(FloatingVue);

app.mount('#app');
