import * as express from 'express';
import CError from '../utils/c_error';

const router = express.Router();

router.get('/', (req, res) => {
    res.setResult('hello api');
});

router.use((req, res) => {
    const err = new CError('NOT FOUND');
    err.status = 404;
    res.setError(err);
});

export default router;
