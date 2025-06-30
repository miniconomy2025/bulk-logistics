import express from 'express';
import companyRoutes from './routes/companyRoutes';
import pickupRequestRoutes from './routes/pickupRequestRoutes'

const app = express();
const PORT = 3000;

app.use(express.json());
app.use('/api/company', companyRoutes);
app.use('/api/pickup-request',pickupRequestRoutes)

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});