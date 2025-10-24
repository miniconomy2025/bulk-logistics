import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import App from "../App";
import "@testing-library/jest-dom";

jest.mock("../pages/dashboard", () => {
    return function MockDashboard() {
        return <div data-testid="dashboard-page">Dashboard Page</div>;
    };
});

jest.mock("../pages/shipments", () => {
    return function MockShipments() {
        return <div data-testid="shipments-page">Shipments Page</div>;
    };
});

jest.mock("../pages/pickup-requests", () => {
    return function MockPickupRequests() {
        return <div data-testid="pickup-requests-page">Pickup Requests Page</div>;
    };
});

jest.mock("../pages/not-found", () => {
    return function MockNotFound() {
        return <div data-testid="not-found-page">Not Found Page</div>;
    };
});

describe("App", () => {
    it("should render dashboard on root path", () => {
        render(
            <MemoryRouter initialEntries={["/"]}>
                <App />
            </MemoryRouter>,
        );

        expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
        expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
    });

    it("should render shipments page on /shipments path", () => {
        render(
            <MemoryRouter initialEntries={["/shipments"]}>
                <App />
            </MemoryRouter>,
        );

        expect(screen.getByTestId("shipments-page")).toBeInTheDocument();
        expect(screen.getByText("Shipments Page")).toBeInTheDocument();
    });

    it("should render pickup requests page on /pickup-requests path", () => {
        render(
            <MemoryRouter initialEntries={["/pickup-requests"]}>
                <App />
            </MemoryRouter>,
        );

        expect(screen.getByTestId("pickup-requests-page")).toBeInTheDocument();
        expect(screen.getByText("Pickup Requests Page")).toBeInTheDocument();
    });

    it("should render not found page for unknown paths", () => {
        render(
            <MemoryRouter initialEntries={["/unknown-path"]}>
                <App />
            </MemoryRouter>,
        );

        expect(screen.getByTestId("not-found-page")).toBeInTheDocument();
        expect(screen.getByText("Not Found Page")).toBeInTheDocument();
    });

    it("should render not found page for nested unknown paths", () => {
        render(
            <MemoryRouter initialEntries={["/some/nested/unknown/path"]}>
                <App />
            </MemoryRouter>,
        );

        expect(screen.getByTestId("not-found-page")).toBeInTheDocument();
        expect(screen.getByText("Not Found Page")).toBeInTheDocument();
    });

    it("should handle case-insensitive paths correctly", () => {
        render(
            <MemoryRouter initialEntries={["/Shipments"]}>
                <App />
            </MemoryRouter>,
        );

        expect(screen.getByTestId("shipments-page")).toBeInTheDocument();
    });

    it("should handle paths with query parameters", () => {
        render(
            <MemoryRouter initialEntries={["/shipments?filter=active"]}>
                <App />
            </MemoryRouter>,
        );

        expect(screen.getByTestId("shipments-page")).toBeInTheDocument();
    });

    it("should handle paths with hash fragments", () => {
        render(
            <MemoryRouter initialEntries={["/pickup-requests#section1"]}>
                <App />
            </MemoryRouter>,
        );

        expect(screen.getByTestId("pickup-requests-page")).toBeInTheDocument();
    });

    it("should handle empty path", () => {
        render(
            <MemoryRouter initialEntries={[""]}>
                <App />
            </MemoryRouter>,
        );

        expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
    });

    it("should handle root path with trailing slash", () => {
        render(
            <MemoryRouter initialEntries={["/"]}>
                <App />
            </MemoryRouter>,
        );

        expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
    });

    it("should handle paths with trailing slashes", () => {
        render(
            <MemoryRouter initialEntries={["/shipments/"]}>
                <App />
            </MemoryRouter>,
        );

        expect(screen.getByTestId("shipments-page")).toBeInTheDocument();
    });

    it("should render only one component at a time", () => {
        render(
            <MemoryRouter initialEntries={["/shipments"]}>
                <App />
            </MemoryRouter>,
        );

        expect(screen.getByTestId("shipments-page")).toBeInTheDocument();
        expect(screen.queryByTestId("dashboard-page")).not.toBeInTheDocument();
        expect(screen.queryByTestId("pickup-requests-page")).not.toBeInTheDocument();
        expect(screen.queryByTestId("not-found-page")).not.toBeInTheDocument();
    });

    it("should handle special characters in paths", () => {
        render(
            <MemoryRouter initialEntries={["/shipments@#$%"]}>
                <App />
            </MemoryRouter>,
        );

        expect(screen.getByTestId("not-found-page")).toBeInTheDocument();
    });

    it("should handle very long paths", () => {
        const longPath = "/very/long/path/that/does/not/exist/and/is/very/long";
        render(
            <MemoryRouter initialEntries={[longPath]}>
                <App />
            </MemoryRouter>,
        );

        expect(screen.getByTestId("not-found-page")).toBeInTheDocument();
    });
});
