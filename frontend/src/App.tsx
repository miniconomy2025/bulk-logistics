import { Route, Routes } from "react-router";

import Dashboard from "./pages/dashboard";
import NotFound from "./pages/not-found";
import ShipmentsDashboard from "./pages/shipments";
import PickupRequestDashboard from "./pages/pickup-requests";

function App() {
    return (
        <Routes>
            <Route
                path="/"
                element={<Dashboard />}
            />
            <Route
                path="shipments"
                element={<ShipmentsDashboard />}
            />
            <Route
                path="pickup-requests"
                element={<PickupRequestDashboard />}
            />
            {/* <Route
                    path="/about"
                    element={<About />}
                /> */}

            <Route
                path="*"
                element={<NotFound />}
            />
        </Routes>
    );
}

export default App;
