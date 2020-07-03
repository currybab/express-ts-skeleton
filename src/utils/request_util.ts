import axios from 'axios';
import * as createHttpsProxyAgent from 'https-proxy-agent';

const proxy = axios.create({
    // proxy: {
    //     host: "127.0.0.1",
    //     port: 24000,
    // },
    httpsAgent: createHttpsProxyAgent('http://127.0.0.1:24000'),
});

const native = axios.create();

const requestUtil = {
    proxy,
    native,
};

export default requestUtil;
