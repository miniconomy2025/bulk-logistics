import { Route, Routes } from "react-router";

import Dashboard from "./pages/dashboard";
import NotFound from "./pages/not-found";

function App() {
    return (
        <Routes>
            <Route
                path="/"
                element={<Dashboard />}
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
