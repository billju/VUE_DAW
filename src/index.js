import Vue from 'vue'
import App from './app.vue'
import 'bootstrap/dist/css/bootstrap.css'
import '@fortawesome/fontawesome-free/css/all.css'

window.vm = new Vue({
    el: '#app',
    render: h => h(App)
})