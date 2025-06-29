import express from 'express';
import companyRoutes from './routes/companyRoutes';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use('/api/company', companyRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});